/** New or edit live animal (web LiveAnimalFormPage): species, health, where it is kept, rate and photos. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { PawPrint } from 'lucide-react-native';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Card, ChipGroup, DatePicker, EmptyState, FormSection, FormTemplate, Input, MoneyInput, Select, Skeleton, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { PhotoField, type ImageDraft } from '@/modules/inventory/components/PhotoField';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, dateToKey, errorText, keyToDate, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { liveAnimalsApi, type LiveAnimal, type PetSpecies } from '../api';
import { GENDERS, PET_KEYS, SOURCES, SPECIES, refreshPet } from '../meta';

interface Draft {
  species: PetSpecies | ''; breed: string; name: string; gender: string; ageMonths: number | null; color: string; weightKg: number | null;
  acquiredDate: string; sourceType: string; sourceName: string;
  isVaccinated: boolean; vaccinationDetails: string; isDewormed: boolean; dewormingDetails: string; hasHealthCertificate: boolean; healthNotes: string;
  costPrice: number | null; askingPrice: number | null; currentCage: string; feedingSchedule: string; specialNeeds: string; isFeatured: boolean; notes: string;
  images: ImageDraft[];
}
const blank = (): Draft => ({
  species: '', breed: '', name: '', gender: '', ageMonths: null, color: '', weightKg: null, acquiredDate: todayKey(), sourceType: 'BREEDER', sourceName: '',
  isVaccinated: false, vaccinationDetails: '', isDewormed: false, dewormingDetails: '', hasHealthCertificate: false, healthNotes: '',
  costPrice: null, askingPrice: null, currentCage: '', feedingSchedule: '', specialNeeds: '', isFeatured: false, notes: '', images: [],
});
const fromAnimal = (a: LiveAnimal): Draft => ({
  species: a.species, breed: a.breed ?? '', name: a.name ?? '', gender: a.gender ?? '', ageMonths: a.ageMonths ?? null, color: a.color ?? '', weightKg: a.weightKg ?? null,
  acquiredDate: a.acquiredDate ? a.acquiredDate.slice(0, 10) : '', sourceType: a.sourceType ?? '', sourceName: a.sourceName ?? '', isVaccinated: a.isVaccinated,
  vaccinationDetails: a.vaccinationDetails ?? '', isDewormed: a.isDewormed, dewormingDetails: a.dewormingDetails ?? '', hasHealthCertificate: a.hasHealthCertificate,
  healthNotes: a.healthNotes ?? '', costPrice: a.costPrice ?? null, askingPrice: a.askingPrice, currentCage: a.currentCage ?? '', feedingSchedule: a.feedingSchedule ?? '',
  specialNeeds: a.specialNeeds ?? '', isFeatured: a.isFeatured, notes: a.notes ?? '', images: (a.imageUrls ?? []).map((url) => ({ url })),
});

export function LiveAnimalFormScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const { guard } = useDeskOnline('petshopAnimals');
  const { costHidden, cost } = useCostMask();
  const [d, setD] = useState<Draft>(blank);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setDirty(true); setD((x) => ({ ...x, [k]: v })); };

  const q = useQuery({ queryKey: [PET_KEYS.animal, id], queryFn: () => liveAnimalsApi.getOne(id!), enabled: editing });
  useEffect(() => { if (q.data) { setD(fromAnimal(q.data)); setDirty(false); } }, [q.data]);
  const locked = !!q.data && ['SOLD', 'DECEASED', 'RETURNED'].includes(q.data.status);

  const errors: Record<string, string> = {};
  if (!d.species) errors.species = t('Kaun sa janwar — chunein');
  if (!d.askingPrice || d.askingPrice <= 0) errors.askingPrice = t('Bechne ka rate likhein');
  if (d.acquiredDate && d.acquiredDate > todayKey()) errors.acquiredDate = t('Aane ki date aage ki nahi ho sakti');
  const first = Object.values(errors)[0];
  const err = (k: string) => (touched ? errors[k] : undefined);

  const submit = () => guard(async () => {
    setTouched(true);
    if (first) { toast.error(first); return; }
    const o = (v: string) => v.trim() || undefined;
    const body: Partial<LiveAnimal> = {
      species: d.species as PetSpecies, breed: o(d.breed), name: o(d.name), gender: o(d.gender), ageMonths: d.ageMonths != null ? Math.round(d.ageMonths) : undefined, color: o(d.color),
      weightKg: d.weightKg ?? undefined, acquiredDate: d.acquiredDate || undefined, sourceType: o(d.sourceType), sourceName: o(d.sourceName),
      isVaccinated: d.isVaccinated, vaccinationDetails: o(d.vaccinationDetails), isDewormed: d.isDewormed, dewormingDetails: o(d.dewormingDetails),
      hasHealthCertificate: d.hasHealthCertificate, healthNotes: o(d.healthNotes), costPrice: d.costPrice ?? undefined, askingPrice: d.askingPrice ?? 0,
      currentCage: o(d.currentCage), feedingSchedule: o(d.feedingSchedule), specialNeeds: o(d.specialNeeds), isFeatured: d.isFeatured, notes: o(d.notes), imageUrls: d.images.map((i) => i.url),
    };
    setSaving(true);
    try {
      const a = editing ? await liveAnimalsApi.update(id!, body) : await liveAnimalsApi.create(body);
      setDirty(false);
      refreshPet([PET_KEYS.animals, PET_KEYS.animal, PET_KEYS.posAnimals]);
      toast.success(editing ? t('Save ho gaya') : t('{{animalNumber}} darj ho gaya — counter par card aa gaya', { animalNumber: a.animalNumber }));
      router.replace(`/petshop/live-animals/${a.id}` as never);
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setSaving(false); }
  });

  if (editing && q.isLoading) return <FormTemplate title={t('Naya janwar')} onSave={() => undefined}><Skeleton height={300} /></FormTemplate>;
  if (editing && !q.data) return <FormTemplate title={t('Naya janwar')} onSave={() => undefined}><EmptyState icon={PawPrint} title={t('Ye janwar nahi mila')} /></FormTemplate>;
  const margin = d.costPrice != null && d.askingPrice ? d.askingPrice - d.costPrice : null;

  return (
    <FormTemplate title={editing ? t('{{animalNumber}} — badlein', { animalNumber: q.data?.animalNumber }) : t('Naya janwar')} subtitle={t('Darj hote hi counter par iska card aa jata hai')}
      dirty={dirty} saving={saving} saveDisabled={locked} onSave={submit}>
      <View style={{ gap: th.space(4) }}>
        <OfflineNote feature="petshopAnimals" />
        {locked && <Card tone="warning"><Text size="sm">{t('Ye janwar {{value}} hai — badla nahi ja sakta.', { value: q.data?.status === 'SOLD' ? t('bik chuka') : t('band') })}</Text></Card>}
        <FormSection title={t('Janwar')}>
          <ChipGroup wrap value={d.species} onChange={(v) => set('species', v as PetSpecies)} options={(Object.keys(SPECIES) as PetSpecies[]).map((k) => ({ value: k, label: `${SPECIES[k].emoji} ${t(SPECIES[k].label)}` }))} />
          {err('species') && <Text size="xs" tone="danger">{err('species')}</Text>}
          <Input label={t('Nasal (breed)')} value={d.breed} onChangeText={(v) => set('breed', v)} placeholder={t('Persian, German Shepherd, Budgie')} hint={t('Counter par isi se dhoondte hain')} />
          <Input label={t('Naam (marzi)')} value={d.name} onChangeText={(v) => set('name', v)} placeholder={t('Tiger')} />
          <Select label={t('Jins')} value={d.gender || null} onChange={(v) => set('gender', v)} options={GENDERS.map((g) => ({ value: g.value, label: t(g.label) }))} />
          <NumberInput label={t('Umar (mahine)')} integer value={d.ageMonths} onChangeValue={(v) => set('ageMonths', v)} placeholder="3" />
          <Input label={t('Rang')} value={d.color} onChangeText={(v) => set('color', v)} placeholder={t('Safed, bhoora')} />
          <NumberInput label={t('Wazan (kg)')} value={d.weightKg} onChangeValue={(v) => set('weightKg', v)} />
        </FormSection>
        <FormSection title={t('Sehat')}>
          <Switch value={d.isVaccinated} onChange={(v) => set('isVaccinated', v)} label={t('Vaccine lagi hai')} />
          {d.isVaccinated && <Input value={d.vaccinationDetails} onChangeText={(v) => set('vaccinationDetails', v)} placeholder={t('DHPP, Rabies — date')} />}
          <Switch value={d.isDewormed} onChange={(v) => set('isDewormed', v)} label={t('Deworming hui hai')} />
          {d.isDewormed && <Input value={d.dewormingDetails} onChangeText={(v) => set('dewormingDetails', v)} placeholder={t('Dawa aur date')} />}
          <Switch value={d.hasHealthCertificate} onChange={(v) => set('hasHealthCertificate', v)} label={t('Sehat ka certificate hai')} />
          <TextArea label={t('Sehat ke note (marzi)')} value={d.healthNotes} onChangeText={(v) => set('healthNotes', v)} placeholder={t('Khaansi thi, ab theek…')} />
          <Text size="xs" tone="muted">{t('Baad ki vaccine / doctor visit janwar ke page par "Sehat record" se likhein.')}</Text>
        </FormSection>
        <FormSection title={t('Kahan se, kahan rakha')}>
          <Select label={t('Kahan se aaya')} value={d.sourceType || null} onChange={(v) => set('sourceType', v)} options={SOURCES.map((s) => ({ value: s.value, label: t(s.label) }))} />
          <Input label={t('Kis se (marzi)')} value={d.sourceName} onChangeText={(v) => set('sourceName', v)} placeholder={t('Breeder ka naam')} />
          <DatePicker label={t('Aane ki date')} value={keyToDate(d.acquiredDate)} maximumDate={new Date()} onChange={(x) => set('acquiredDate', dateToKey(x))} hint={t('Kitne din se dukaan me — isi se ginti')} error={err('acquiredDate')} />
          <Input label={t('Cage')} value={d.currentCage} onChangeText={(v) => set('currentCage', v)} placeholder="A-3" />
          <Input label={t('Khana kab')} value={d.feedingSchedule} onChangeText={(v) => set('feedingSchedule', v)} placeholder={t('Subah 9, shaam 6')} />
          <Input label={t('Khaas dekh bhaal')} value={d.specialNeeds} onChangeText={(v) => set('specialNeeds', v)} placeholder={t('Garam jagah')} />
          <TextArea label={t('Note (marzi)')} value={d.notes} onChangeText={(v) => set('notes', v)} />
        </FormSection>
        <FormSection title={t('Paisa')}>
          <MoneyInput label={t('Bechne ka rate (Rs)')} value={d.askingPrice} onChangeValue={(v) => set('askingPrice', v)} error={err('askingPrice')} hint={t('Counter par yahi rate aata hai; bill par kam bhi kar sakte hain')} />
          {!costHidden && <MoneyInput label={t('Cost (Rs)')} value={d.costPrice} onChangeValue={(v) => set('costPrice', v)} hint={t('Kitne ka liya — profit aur mar jane par loss isi se')} />}
          {!costHidden && margin !== null && <Text size="sm" weight="semibold" tone={margin >= 0 ? 'success' : 'danger'}>{t('Profit: {{margin}}', { margin: cost(margin) })}</Text>}
          <Switch value={d.isFeatured} onChange={(v) => set('isFeatured', v)} label={t('Counter par upar dikhayein')} />
        </FormSection>
        <FormSection title={t('Tasveerein')}>
          <PhotoField value={d.images} onChange={(v) => set('images', v)} max={10} />
        </FormSection>
        {d.askingPrice ? <Text size="xs" tone="muted">{t('Rate {{price}}', { price: formatMoney(d.askingPrice) })}</Text> : null}
      </View>
    </FormTemplate>
  );
}
