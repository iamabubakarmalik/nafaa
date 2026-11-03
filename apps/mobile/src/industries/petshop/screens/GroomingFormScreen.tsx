/** New or edit grooming booking (web GroomingFormPage): owner, pet, service and fee, day, groomer and a free slot. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { groomingTotal, slotLabel } from '@nafaa/core/industries/petshop';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Card, ChipGroup, DatePicker, FormSection, FormTemplate, Input, MoneyInput, Select, Skeleton, Text, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { OfflineNote, dateToKey, errorText, keyToDate, shiftKey, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { groomersApi, groomingApi, type Grooming, type GroomingInput, type GroomingService, type PetSpecies } from '../api';
import { PET_KEYS, SERVICE, SPECIES, TEMPERS, refreshPet } from '../meta';

interface Draft {
  customerName: string; customerPhone: string; petName: string; petSpecies: PetSpecies | ''; petBreed: string; petAgeMonths: number | null; petWeightKg: number | null;
  petTemperament: string; petAllergies: string; petSpecialInstructions: string; scheduledDate: string; groomerId: string; scheduledSlot: string;
  serviceType: GroomingService; additionalServices: GroomingService[]; serviceFee: number | null; additionalCharges: number | null; discount: number | null;
}
const blank = (): Draft => ({
  customerName: '', customerPhone: '', petName: '', petSpecies: '', petBreed: '', petAgeMonths: null, petWeightKg: null, petTemperament: '', petAllergies: '', petSpecialInstructions: '',
  scheduledDate: todayKey(), groomerId: '', scheduledSlot: '', serviceType: 'BATH', additionalServices: [], serviceFee: null, additionalCharges: null, discount: null,
});
const fromVisit = (a: Grooming): Draft => ({
  customerName: a.customerName, customerPhone: a.customerPhone, petName: a.petName, petSpecies: a.petSpecies, petBreed: a.petBreed ?? '', petAgeMonths: a.petAgeMonths ?? null,
  petWeightKg: a.petWeightKg ?? null, petTemperament: a.petTemperament ?? '', petAllergies: a.petAllergies ?? '', petSpecialInstructions: a.petSpecialInstructions ?? '',
  scheduledDate: a.scheduledDate.slice(0, 10), groomerId: a.groomerId ?? '', scheduledSlot: a.scheduledSlot ?? '', serviceType: a.serviceType, additionalServices: a.additionalServices ?? [],
  serviceFee: a.serviceFee, additionalCharges: a.additionalCharges || null, discount: a.discount || null,
});
const phoneOk = (v: string) => /^[0-9+\-\s]{10,15}$/.test(v.trim());

export function GroomingFormScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const { guard } = useDeskOnline('petshopAnimals');
  const [d, setD] = useState<Draft>(blank);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setDirty(true); setD((x) => ({ ...x, [k]: v })); };

  const visit = useQuery({ queryKey: [PET_KEYS.grooming, 'one', id], queryFn: () => groomingApi.getOne(id!), enabled: editing });
  useEffect(() => { if (visit.data) { setD(fromVisit(visit.data)); setDirty(false); } }, [visit.data]);
  const locked = !!visit.data && !['SCHEDULED', 'CONFIRMED'].includes(visit.data.status);
  const groomers = useQuery({ queryKey: [PET_KEYS.groomers, 'active'], queryFn: () => groomersApi.list({ active: true }), staleTime: 60_000 });
  const slotsQ = useQuery({ queryKey: [PET_KEYS.grooming, 'slots', d.groomerId, d.scheduledDate], queryFn: () => groomingApi.availableSlots(d.groomerId, d.scheduledDate), enabled: !!d.groomerId && !!d.scheduledDate });
  const own = visit.data?.groomerId === d.groomerId && visit.data?.scheduledDate.slice(0, 10) === d.scheduledDate ? visit.data?.scheduledSlot : undefined;
  const slots = slotsQ.data?.available ?? [];
  const slotList = own && !slots.includes(own) ? [own, ...slots].sort() : slots;
  const groomer = (groomers.data ?? []).find((g) => g.id === d.groomerId);
  const total = groomingTotal(d.serviceFee ?? 0, d.additionalCharges ?? 0, d.discount ?? 0);

  const errors: Record<string, string> = {};
  if (!d.customerName.trim()) errors.customerName = t('Malik ka naam likhein');
  if (!phoneOk(d.customerPhone)) errors.customerPhone = t('Phone 10 se 15 hindse');
  if (!d.petName.trim()) errors.petName = t('Pet ka naam likhein');
  if (!d.petSpecies) errors.petSpecies = t('Kaun sa janwar — chunein');
  if (!editing && d.scheduledDate < todayKey()) errors.scheduledDate = t('Guzra din nahi chun sakte');
  if (d.serviceFee == null || d.serviceFee < 0) errors.serviceFee = t('Fee likhein');
  if ((d.discount ?? 0) > (d.serviceFee ?? 0) + (d.additionalCharges ?? 0)) errors.discount = t('Discount fee se zyada nahi');
  if (visit.data && total < visit.data.paidAmount - 0.01) errors.serviceFee = t('{{paidAmount}} pehle mil chuke — total us se kam nahi', { paidAmount: formatMoney(visit.data.paidAmount) });
  const first = Object.values(errors)[0];
  const err = (k: string) => (touched ? errors[k] : undefined);

  const submit = () => guard(async () => {
    setTouched(true);
    if (first) { toast.error(first); return; }
    const o = (v: string) => v.trim() || undefined;
    const body: GroomingInput = {
      customerName: d.customerName.trim(), customerPhone: d.customerPhone.trim(), petName: d.petName.trim(), petSpecies: d.petSpecies as PetSpecies, petBreed: o(d.petBreed),
      petAgeMonths: d.petAgeMonths != null ? Math.round(d.petAgeMonths) : undefined, petWeightKg: d.petWeightKg ?? undefined, petTemperament: o(d.petTemperament), petAllergies: o(d.petAllergies),
      petSpecialInstructions: o(d.petSpecialInstructions), scheduledDate: d.scheduledDate,
      // A blank groomer or slot clears it on an edit; the server reads '' as none.
      groomerId: d.groomerId || (editing ? '' : undefined), scheduledSlot: d.scheduledSlot || (editing ? '' : undefined), serviceType: d.serviceType, additionalServices: d.additionalServices,
      serviceFee: d.serviceFee ?? 0, additionalCharges: d.additionalCharges ?? 0, discount: d.discount ?? 0,
    };
    setSaving(true);
    try {
      const a = editing ? await groomingApi.update(id!, body) : await groomingApi.create(body);
      setDirty(false);
      refreshPet([PET_KEYS.grooming]);
      toast.success(editing ? t('Booking save ho gayi') : t('Booking {{appointmentNumber}} ban gayi', { appointmentNumber: a.appointmentNumber }));
      router.back();
    } catch (e) { toast.error(errorText(e, t('Booking save nahi hui'))); } finally { setSaving(false); }
  });

  if (editing && visit.isLoading) return <FormTemplate title={t('Nayi grooming booking')} onSave={() => undefined}><Skeleton height={300} /></FormTemplate>;
  const services = (Object.keys(SERVICE) as GroomingService[]);
  return (
    <FormTemplate title={editing ? t('{{value}} — badlein', { value: visit.data?.appointmentNumber ?? '' }) : t('Nayi grooming booking')} subtitle={t('Malik, pet, service aur groomer ka khali waqt')}
      dirty={dirty} saving={saving} saveDisabled={locked} onSave={submit}>
      <View style={{ gap: th.space(4) }}>
        <OfflineNote feature="petshopAnimals" />
        {locked && <Card tone="warning"><Text size="sm">{t('Kaam shuru ho chuka — booking badli nahi ja sakti.')}</Text></Card>}
        <FormSection title={t('Malik')}>
          <Input label={t('Naam')} value={d.customerName} onChangeText={(v) => set('customerName', v)} error={err('customerName')} />
          <Input label={t('Phone')} keyboardType="phone-pad" ltr value={d.customerPhone} onChangeText={(v) => set('customerPhone', v)} error={err('customerPhone')} placeholder="0300 1234567" hint={t('Isi phone se khata aur advance jurta hai')} />
        </FormSection>
        <FormSection title={t('Pet')}>
          <ChipGroup wrap value={d.petSpecies} onChange={(v) => set('petSpecies', v as PetSpecies)} options={(['DOG', 'CAT', 'RABBIT', 'BIRD', 'OTHER'] as const).map((k) => ({ value: k, label: `${SPECIES[k].emoji} ${t(SPECIES[k].label)}` }))} />
          {err('petSpecies') && <Text size="xs" tone="danger">{err('petSpecies')}</Text>}
          <Input label={t('Pet ka naam')} value={d.petName} onChangeText={(v) => set('petName', v)} error={err('petName')} placeholder={t('Tiger')} />
          <Input label={t('Nasal (marzi)')} value={d.petBreed} onChangeText={(v) => set('petBreed', v)} placeholder={t('Persian')} />
          <NumberInput label={t('Umar (mahine)')} integer value={d.petAgeMonths} onChangeValue={(v) => set('petAgeMonths', v)} />
          <NumberInput label={t('Wazan (kg)')} value={d.petWeightKg} onChangeValue={(v) => set('petWeightKg', v)} hint={t('Bare kutte ki fee zyada hoti hai')} />
          <Input label={t('Mizaj (marzi)')} value={d.petTemperament} onChangeText={(v) => set('petTemperament', v)} />
          <ChipGroup wrap value={d.petTemperament} onChange={(v) => set('petTemperament', v)} options={TEMPERS.map((x) => ({ value: x, label: t(x) }))} />
          <Input label={t('Allergy (marzi)')} value={d.petAllergies} onChangeText={(v) => set('petAllergies', v)} placeholder={t('Shampoo se allergy')} />
          <Input label={t('Khaas hidayat (marzi)')} value={d.petSpecialInstructions} onChangeText={(v) => set('petSpecialInstructions', v)} placeholder={t('Baal chhote mat karein')} />
        </FormSection>
        <FormSection title={t('Service aur fee')}>
          <Select label={t('Service')} value={d.serviceType} onChange={(v) => set('serviceType', v)} options={services.map((s) => ({ value: s, label: t(SERVICE[s]) }))} />
          <Text size="sm" weight="medium" tone="secondary">{t('Saath me (marzi)')}</Text>
          <ChipGroup wrap multiple value={d.additionalServices} onChange={(v) => set('additionalServices', v)} options={services.filter((s) => s !== d.serviceType && s !== 'OTHER' && s !== 'DELUXE_PACKAGE').map((s) => ({ value: s, label: t(SERVICE[s]) }))} />
          <MoneyInput label={t('Fee')} value={d.serviceFee} onChangeValue={(v) => set('serviceFee', v)} error={err('serviceFee')} hint={groomer?.perServiceRate ? t('Groomer ka rate {{perServiceRate}}', { perServiceRate: formatMoney(groomer.perServiceRate) }) : undefined} />
          <MoneyInput label={t('Extra')} value={d.additionalCharges} onChangeValue={(v) => set('additionalCharges', v)} />
          <MoneyInput label={t('Discount')} value={d.discount} onChangeValue={(v) => set('discount', v)} error={err('discount')} />
          <Text weight="semibold">{t('Total {{total}}', { total: formatMoney(total) })}</Text>
        </FormSection>
        <FormSection title={t('Kab aur kis se')}>
          <DatePicker label={t('Din')} value={keyToDate(d.scheduledDate)} minimumDate={editing ? undefined : new Date()} onChange={(x) => { set('scheduledDate', dateToKey(x)); set('scheduledSlot', ''); }} error={err('scheduledDate')} />
          <ChipGroup value={d.scheduledDate} onChange={(v) => { set('scheduledDate', v); set('scheduledSlot', ''); }} options={[0, 1, 2].map((n) => ({ value: shiftKey(todayKey(), n), label: n === 0 ? t('Aaj') : n === 1 ? t('Kal') : t('Parson') }))} />
          <Select label={t('Groomer (marzi)')} value={d.groomerId} onChange={(v) => { set('groomerId', v === '__none' ? '' : v); set('scheduledSlot', ''); }} hint={t('Groomer chunein to us ka khali waqt aata hai')}
            options={[{ value: '__none', label: t('Baad me chunein') }, ...(groomers.data ?? []).map((g) => ({ value: g.id, label: g.name }))]} />
          {d.groomerId ? (
            slotsQ.isLoading ? <Skeleton height={48} /> : slotList.length === 0 ? <Text size="sm" tone="warning">{slotsQ.data?.reason || t('Is din koi khali waqt nahi — doosra din ya groomer chunein')}</Text> : (
              <ChipGroup wrap value={d.scheduledSlot} onChange={(v) => set('scheduledSlot', d.scheduledSlot === v ? '' : v)} options={slotList.map((s) => ({ value: s, label: slotLabel(s) }))} />
            )
          ) : null}
        </FormSection>
      </View>
    </FormTemplate>
  );
}
