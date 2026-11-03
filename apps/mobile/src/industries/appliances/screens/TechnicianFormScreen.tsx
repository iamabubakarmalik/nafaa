/** Add or edit a field technician (web TechnicianForm): contact, area, what he can fit or repair, visit rate and commission. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { ChipGroup, EmptyState, FormSection, FormTemplate, Input, MoneyInput, Skeleton, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { cnicOk, errText, opt, phoneOk, useDeskOnline } from '../../_shared/trade/desk';
import { techniciansApi } from '../api';
import { KEYS, groupLabel, refreshAppliances } from '../meta';

const SKILLS: Array<{ id: string; group: string; types: string[] }> = [
  { id: 'ac', group: 'ac', types: ['AIR_CONDITIONER_SPLIT', 'AIR_CONDITIONER_INVERTER', 'AIR_CONDITIONER_WINDOW'] },
  { id: 'fridge', group: 'fridge', types: ['REFRIGERATOR', 'DEEP_FREEZER'] },
  { id: 'washer', group: 'washer', types: ['WASHING_MACHINE_TOP_LOAD', 'WASHING_MACHINE_FRONT_LOAD', 'WASHING_MACHINE_TWIN_TUB'] },
  { id: 'tv', group: 'tv', types: ['LED_TV', 'SMART_TV'] },
  { id: 'geyser', group: 'water', types: ['GEYSER_ELECTRIC', 'GEYSER_GAS'] },
  { id: 'kitchen', group: 'kitchen', types: ['MICROWAVE_OVEN', 'GAS_STOVE', 'CHIMNEY'] },
  { id: 'power', group: 'power', types: ['SOLAR_PANEL', 'SOLAR_INVERTER', 'UPS'] },
];
const DAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Jumma', 'Hafta'];
const TIMES = ['07:00', '08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

export function TechnicianFormScreen() {
  const th = useTheme();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { guard } = useDeskOnline('appliancesDesk');
  const q = useQuery({ queryKey: [KEYS.tech, 'one', edit], queryFn: () => techniciansApi.getOne(edit!), enabled: !!edit });
  const [code, setCode] = useState(`T-${String(Date.now()).slice(-4)}`);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  const [zone, setZone] = useState('');
  const [cats, setCats] = useState<string[]>([]);
  const [brands, setBrands] = useState('');
  const [years, setYears] = useState<number | null>(null);
  const [days, setDays] = useState<string[]>(['1', '2', '3', '4', '5', '6']);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('18:00');
  const [visit, setVisit] = useState<number | null>(null);
  const [commission, setCommission] = useState<number | null>(null);
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const mark = <T,>(set: (v: T) => void) => (v: T) => { setDirty(true); set(v); };
  const x = q.data;
  useEffect(() => {
    if (!x) return;
    setCode(x.employeeCode); setName(x.name); setPhone(x.phone); setCnic(x.cnic ?? ''); setAddress(x.address ?? ''); setZone(x.currentZone ?? ''); setCats(x.categoriesExpertise ?? []);
    setBrands((x.brandsExpertise ?? []).join(', ')); setYears(x.experienceYears ?? null); setDays((x.workingDays ?? []).map(String)); setStart(x.workStartTime); setEnd(x.workEndTime);
    setVisit(Number(x.visitChargeRate) || null); setCommission(Number(x.commissionPct) || null); setActive(x.isActive); setNotes(x.notes ?? ''); setDirty(false);
  }, [x]);

  const errors = {
    code: code.trim() ? undefined : t('Code likhein'), name: name.trim().length < 2 ? t('Naam likhein') : undefined,
    phone: phoneOk(phone) ? undefined : t('Sahi mobile number (03xx-xxxxxxx)'), cnic: cnicOk(cnic) ? undefined : t('CNIC 13 hindse'),
    commission: (commission ?? 0) > 100 ? t('100% se zyada nahi') : undefined,
  };
  const first = Object.values(errors).find(Boolean);
  const e = (v?: string) => (touched ? v : undefined);
  const skills = SKILLS.filter((s) => s.types.every((c) => cats.includes(c))).map((s) => s.id);
  const setSkills = (ids: string[]) => mark(setCats)([...new Set(SKILLS.filter((s) => ids.includes(s.id)).flatMap((s) => s.types).concat(cats.filter((c) => !SKILLS.some((s) => s.types.includes(c)))))]);

  const submit = () => guard(async () => {
    setTouched(true);
    if (first) { toast.error(first); return; }
    setSaving(true);
    try {
      const body = {
        employeeCode: code.trim(), name: name.trim(), phone: phone.trim(), cnic: opt(cnic), address: opt(address), currentZone: opt(zone), categoriesExpertise: cats,
        brandsExpertise: brands.split(',').map((b) => b.trim()).filter(Boolean), experienceYears: years ?? undefined, workingDays: days.map(Number).sort(), workStartTime: start, workEndTime: end,
        visitChargeRate: visit ?? 0, commissionPct: commission ?? 0, isActive: active, notes: opt(notes),
      };
      const saved = edit ? await techniciansApi.update(edit, body) : await techniciansApi.create(body);
      setDirty(false);
      refreshAppliances([KEYS.tech]);
      toast.success(edit ? t('Technician update') : t('Technician jur gaya'));
      router.replace(`/appliances/technicians/${saved.id}` as never);
    } catch (err) { toast.error(errText(err, t('Save nahi hua'))); } finally { setSaving(false); }
  });

  if (edit && q.isLoading) return <FormTemplate title={t('Naya technician')} onSave={() => undefined}><Skeleton height={300} /></FormTemplate>;
  if (edit && !x) return <FormTemplate title={t('Naya technician')} onSave={() => undefined}><EmptyState title={t('Technician nahi mila')} /></FormTemplate>;
  return (
    <FormTemplate title={x ? t('{{name}} — badlein', { name: x.name }) : t('Naya technician')} subtitle={t('Fitting aur repair par jane wala banda')} dirty={dirty} saving={saving} onSave={submit}>
      <View style={{ gap: th.space(4) }}>
        <FormSection title={t('Banda')}>
          <Input label={t('Code')} value={code} onChangeText={mark(setCode)} error={e(errors.code)} hint={t('Apna number')} ltr />
          <Input label={t('Naam')} value={name} onChangeText={mark(setName)} placeholder={t('Imran')} error={e(errors.name)} />
          <Input label={t('Phone')} value={phone} onChangeText={mark(setPhone)} keyboardType="phone-pad" ltr placeholder="0300-1234567" error={touched || phone ? errors.phone : undefined} />
          <Input label={t('CNIC')} value={cnic} onChangeText={mark(setCnic)} placeholder="35202-1234567-1" ltr error={errors.cnic} hint={t('Marzi hai')} />
          <Input label={t('Ghar ka pata')} value={address} onChangeText={mark(setAddress)} />
          <Input label={t('Ilaqa')} value={zone} onChangeText={mark(setZone)} placeholder={t('Johar Town')} hint={t('Qareeb ke kaam isi ko')} />
          <NumberInput label={t('Tajurba (saal)')} integer value={years} onChangeValue={mark(setYears)} />
        </FormSection>
        <FormSection title={t('Kya kaam karta hai')}>
          <ChipGroup multiple wrap value={skills} onChange={setSkills} options={SKILLS.map((s) => ({ value: s.id, label: groupLabel(s.group) }))} />
          <Input label={t('Brands')} value={brands} onChangeText={mark(setBrands)} placeholder={t('Haier, Gree, Dawlance')} hint={t('Comma laga kar')} />
        </FormSection>
        <FormSection title={t('Kaam ke din')}>
          <ChipGroup multiple wrap value={days} onChange={mark(setDays)} options={DAYS.map((d, i) => ({ value: String(i), label: t(d) }))} />
          <Text size="sm" weight="semibold" tone="secondary">{t('Shuru')}</Text>
          <ChipGroup value={start} onChange={mark(setStart)} options={TIMES.map((x2) => ({ value: x2, label: x2 }))} />
          <Text size="sm" weight="semibold" tone="secondary">{t('Chhutti')}</Text>
          <ChipGroup value={end} onChange={mark(setEnd)} options={TIMES.map((x2) => ({ value: x2, label: x2 }))} />
        </FormSection>
        <FormSection title={t('Paisa')}>
          <MoneyInput label={t('Visit rate')} value={visit} onChangeValue={mark(setVisit)} placeholder="1000" />
          <NumberInput label={t('Commission %')} value={commission} onChangeValue={mark(setCommission)} placeholder="10" error={e(errors.commission)} hint={t('Har mukammal kaam par')} />
          <Switch value={active} onChange={mark(setActive)} label={t('Active')} description={t('Band ho to naye kaam me nahi aata; purana record rehta hai')} />
          <TextArea label={t('Note')} value={notes} onChangeText={mark(setNotes)} />
        </FormSection>
      </View>
    </FormTemplate>
  );
}
