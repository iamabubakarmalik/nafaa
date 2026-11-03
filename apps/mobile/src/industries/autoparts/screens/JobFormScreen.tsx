/**
 * New job card (web NewWorkshopJobPage): the vehicle (picked from the shop's
 * list by its number, or new), its meter reading, the customer, what is wrong,
 * who will work on it and when it will be ready, what was in the vehicle, an
 * early labour estimate and any advance taken now. Parts are added on the job
 * once work starts, so they leave stock when they are fitted.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { badYears, digitsOf, labourLines, plate } from '@nafaa/core/industries/autoparts';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useBillLanguage } from '@/core/receipt';
import { Badge, Button, Card, ChipGroup, DatePicker, FormSection, FormTemplate, IconButton, Input, MoneyInput, Row, Select, Switch, Text, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { OfflineNote, dateToKey, keyToDate, shiftKey, todayKey, useDeskOnline, MethodChips } from '../../_shared/deskKit';
import { sendSlip } from '../../_shared/trade/slip';
import { customerVehiclesApi, mechanicsApi, vehicleMakesApi, vehicleModelsApi, workshopJobsApi, type CustomerVehicle, type JobCreateInput, type JobPriority, type JobType } from '../api';
import { JOB_KEY, JOB_TYPES, MAKES_KEY, MECHANIC_KEY, MODELS_KEY, PRIORITIES, VEHICLE_KEY, jobTypeOf, km, opt, priorityOf, refreshAuto, vehicleName } from '../meta';
import { jobCard } from '../slip';

const COMPLAINTS = ['Oil change', 'Tuning', 'Brake se awaz', 'AC thanda nahi', 'Start nahi hoti', 'Garam ho jati hai', 'Suspension se awaz', 'Clutch slip', 'Battery down', 'Lights / bijli', 'Pick nahi', 'Dhuan', 'Alignment', 'Denting painting'];
const FUEL = ['Khali', '1/4', '1/2', '3/4', 'Full'];

interface Labour { description: string; amount: number | null }
interface Draft {
  vehicleId: string; reg: string; makeId: string; makeName: string; modelName: string; year: number | null; odometer: number | null;
  name: string; phone: string; jobType: JobType; complaint: string; priority: JobPriority; mechanicId: string; promisedDay: string; bay: string;
  fuel: string; spare: boolean; toolkit: boolean; damages: string; labour: Labour[]; advance: number | null; method: string; notes: string;
}
const EMPTY: Draft = {
  vehicleId: '', reg: '', makeId: '', makeName: '', modelName: '', year: null, odometer: null, name: '', phone: '', jobType: 'GENERAL_SERVICE', complaint: '',
  priority: 'NORMAL', mechanicId: '', promisedDay: '', bay: '', fuel: '', spare: false, toolkit: false, damages: '', labour: [], advance: null, method: 'CASH', notes: '',
};

export function JobFormScreen() {
  const th = useTheme();
  const { vehicle: presetId } = useLocalSearchParams<{ vehicle?: string }>();
  const { guard } = useDeskOnline('autopartsDesk');
  const shopId = useAuthStore((s) => s.currentShopId) ?? undefined;
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Shop';
  const lang = useBillLanguage();
  const [f, setF] = useState<Draft>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [print, setPrint] = useState(true);
  const [lastKm, setLastKm] = useState<number | null>(null);
  const [regQuery, setRegQuery] = useState('');
  const lock = useRef(false);
  const set = (p: Partial<Draft>) => { setDirty(true); setF((x) => ({ ...x, ...p })); };

  const preset = useQuery({ queryKey: [VEHICLE_KEY, 'one', presetId], queryFn: () => customerVehiclesApi.getOne(presetId!), enabled: !!presetId });
  const pickVehicle = (v: CustomerVehicle) => {
    setLastKm(v.odometerKm ?? v.lastOdometerKm ?? null);
    set({ vehicleId: v.id, reg: v.registrationNumber, makeId: v.makeId ?? '', makeName: v.makeName ?? '', modelName: v.modelName ?? '', year: v.year ?? null, name: v.ownerName ?? '', phone: v.ownerPhone ?? '', odometer: null });
  };
  useEffect(() => { if (preset.data && !f.vehicleId) pickVehicle(preset.data); }, [preset.data]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const x = setTimeout(() => setRegQuery(f.vehicleId ? '' : f.reg.trim()), 250); return () => clearTimeout(x); }, [f.reg, f.vehicleId]);
  const look = useQuery({ queryKey: [VEHICLE_KEY, 'lookup', regQuery], queryFn: () => customerVehiclesApi.page({ search: regQuery, limit: 6 }), enabled: regQuery.length >= 2, staleTime: 30_000 });
  const matches = (look.data?.items ?? []).filter(() => !f.vehicleId);
  const makes = useQuery({ queryKey: [MAKES_KEY, 'active'], queryFn: () => vehicleMakesApi.list({ active: true }), staleTime: 5 * 60_000 });
  const models = useQuery({ queryKey: [MODELS_KEY, f.makeId], queryFn: () => vehicleModelsApi.list({ makeId: f.makeId, active: true }), enabled: !!f.makeId, staleTime: 5 * 60_000 });
  const mech = useQuery({ queryKey: [MECHANIC_KEY], queryFn: () => mechanicsApi.list(), staleTime: 5 * 60_000 });

  const labourTotal = f.labour.reduce((s, l) => s + (l.amount ?? 0), 0);
  const problems = useMemo(() => {
    const out: Record<string, string> = {};
    if (!f.reg.trim()) out.reg = t('Gaari ka number likhein'); else if (plate(f.reg).length < 3) out.reg = t('Number poora likhein');
    if (f.year && (f.year < 1950 || f.year > new Date().getFullYear() + 1)) out.year = t('Saal sahi likhein');
    if (f.odometer && f.vehicleId && lastKm && f.odometer < lastKm) out.odometer = t('Pichli dafa {{km}} tha — kam nahi ho sakta', { km: km(lastKm) });
    if (f.phone && digitsOf(f.phone).length < 10) out.phone = t('Phone number poora likhein');
    if (!f.complaint.trim()) out.complaint = t('Kya kaam hai ya kya kharabi hai — likhein');
    if (f.promisedDay && f.promisedDay < todayKey()) out.promisedDay = t('Ye waqt guzar chuka hai');
    if (f.labour.some((l) => !l.description.trim() && (l.amount ?? 0) > 0)) out.labour = t('Mazdoori ki har line ka kaam likhein');
    if ((f.advance ?? 0) > 0 && !f.name.trim() && !f.phone.trim()) out.advance = t('Advance ke liye customer ka naam ya phone likhein');
    if ((f.advance ?? 0) > 0 && labourTotal > 0 && (f.advance ?? 0) > labourTotal * 5) out.advance = t('Advance bohat zyada lag raha hai — check karein');
    return out;
  }, [f, labourTotal, lastKm]);
  const err = (k: string) => (touched ? problems[k] : undefined);

  const submit = () => guard(async () => {
    setTouched(true);
    const first = Object.values(problems)[0];
    if (first) { toast.error(first); return; }
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    try {
      const make = makes.data?.find((m) => m.id === f.makeId);
      const body: JobCreateInput = {
        vehicleId: f.vehicleId || undefined, registrationNumber: plate(f.reg), makeName: make?.name ?? opt(f.makeName), modelName: opt(f.modelName), year: f.year ?? undefined,
        odometerKm: f.odometer ?? undefined, customerName: opt(f.name), customerPhone: opt(f.phone), jobType: f.jobType, customerComplaint: f.complaint.trim(), priority: f.priority,
        primaryMechanicId: f.mechanicId || undefined, promisedAt: f.promisedDay ? new Date(`${f.promisedDay}T18:00:00`).toISOString() : undefined, bayNumber: opt(f.bay), fuelLevel: f.fuel || undefined,
        hasSpareTire: f.spare, hasToolkit: f.toolkit, externalDamages: opt(f.damages), internalNotes: opt(f.notes), shopId,
        laborItems: labourLines(f.labour.map((l) => ({ description: l.description, amount: l.amount ?? 0 }))), advance: f.advance || undefined, advanceMethod: f.advance ? (f.method as JobCreateInput['advanceMethod']) : undefined,
      };
      const job = await workshopJobsApi.create(body);
      setDirty(false);
      refreshAuto([JOB_KEY, VEHICLE_KEY], { money: true });
      toast.success(t('{{jobNumber}} ban gaya — {{registrationNumber}}', { jobNumber: job.jobNumber, registrationNumber: job.registrationNumber }));
      if (print) void sendSlip(jobCard(job, lang), shopName, lang).catch(() => undefined);
      router.replace(`/autoparts/jobs/${job.id}` as never);
    } catch (e) { toast.error(apiErrorMessage(e, t('Job nahi bana'))); } finally { lock.current = false; setSaving(false); }
  });

  const exactPlate = matches.find((v) => plate(v.registrationNumber) === plate(f.reg));
  const day = (n: number) => shiftKey(todayKey(), n);
  return (
    <FormTemplate title={t('Naya job card')} subtitle={t('Gaari ka number, meter, shikayat — parts kaam shuru hone par job me jorein')} dirty={dirty} saving={saving} onSave={submit}>
      <View style={{ gap: th.space(4) }}>
        <OfflineNote feature="autopartsDesk" />
        <FormSection title={t('Gaari')} description={t('Number likhte hi purani gaari mil jati hai — us ki history saath rehti hai')}>
          <Input label={t('Gaari ka number')} value={f.reg} onChangeText={(v) => { setLastKm(null); set({ reg: v.toUpperCase(), vehicleId: '' }); }} placeholder={t('LEA-1234 / ABC 123')} autoCapitalize="characters" ltr error={err('reg')}
            hint={f.vehicleId ? t('Purani gaari — history is job ke saath judegi') : exactPlate ? t('Ye gaari pehle se darj hai — neeche se chunein') : t('Nayi gaari khud darj ho jayegi')} />
          {matches.length > 0 && (
            <Card flush>
              {matches.map((v, i) => (
                <PickRow key={v.id} v={v} last={i === matches.length - 1} onPress={() => pickVehicle(v)} />
              ))}
            </Card>
          )}
          <Select label={t('Company')} value={f.makeId} searchable onChange={(v) => set({ makeId: v, makeName: makes.data?.find((m) => m.id === v)?.name ?? '', modelName: '' })} placeholder={f.vehicleId && f.makeName && !f.makeId ? f.makeName : t('Chunein')}
            options={(makes.data ?? []).map((m) => ({ value: m.id, label: m.name }))} />
          <Input label={t('Model')} value={f.modelName} onChangeText={(v) => set({ modelName: v })} placeholder={t('Corolla, CD 70…')} />
          {(models.data ?? []).length > 0 && <ChipGroup wrap value={f.modelName} onChange={(v) => set({ modelName: f.modelName === v ? '' : v })} options={(models.data ?? []).slice(0, 14).map((m) => ({ value: m.name, label: m.name }))} />}
          <NumberInput label={t('Saal')} integer value={f.year} onChangeValue={(v) => set({ year: v })} placeholder="2016" error={err('year')} />
          <NumberInput label={t('Meter (km)')} integer value={f.odometer} onChangeValue={(v) => set({ odometer: v })} placeholder="84500" error={err('odometer')} hint={t('Abhi meter par kitna hai — agli service ka hisaab isi se')} />
        </FormSection>

        <FormSection title={t('Kaam')}>
          <Text size="sm" weight="medium" tone="secondary">{t('Kya kaam hai')}</Text>
          <ChipGroup wrap value={f.jobType} onChange={(v) => set({ jobType: v as JobType })} options={JOB_TYPES.map((x) => ({ value: x, label: jobTypeOf(x) }))} />
          <Input label={t('Shikayat / kya karna hai')} value={f.complaint} onChangeText={(v) => set({ complaint: v })} multiline placeholder={t('Customer ne kya bataya')} error={err('complaint')} />
          <ChipGroup wrap value="" onChange={(c) => set({ complaint: f.complaint.includes(t(c)) ? f.complaint : [f.complaint.trim(), t(c)].filter(Boolean).join(', ') })} options={COMPLAINTS.map((c) => ({ value: c, label: t(c) }))} />
          <Select label={t('Mechanic')} value={f.mechanicId} onChange={(v) => set({ mechanicId: v })} placeholder={t('Baad me')} hint={mech.data && !mech.data.length ? t('Mechanic page par staff ko mechanic banayein') : t('Kis ke zimme hai')}
            options={[{ value: '', label: t('Baad me') }, ...(mech.data ?? []).map((m) => ({ value: m.id, label: `${m.staff?.fullName ?? 'Mechanic'}${m.openJobs ? ` (${t('{{n}} chal rahe', { n: m.openJobs })})` : ''}${m.isAvailable ? '' : ` — ${t('chutti')}`}` }))]} />
          <Select label={t('Jaldi')} value={f.priority} onChange={(v) => set({ priority: v as JobPriority })} options={PRIORITIES.map((p) => ({ value: p, label: t(priorityOf(p).label) }))} />
          <DatePicker label={t('Gaari kab deni hai')} value={keyToDate(f.promisedDay)} minimumDate={new Date()} onChange={(x) => set({ promisedDay: dateToKey(x) })} error={err('promisedDay')} hint={t('Is waqt ke baad job “Late” me aati hai')} />
          <ChipGroup value={f.promisedDay} onChange={(v) => set({ promisedDay: v })} options={[{ value: day(0), label: t('Aaj shaam') }, { value: day(1), label: t('Kal') }, { value: day(2), label: t('Parson') }, { value: day(7), label: t('Hafte baad') }]} />
        </FormSection>

        <FormSection title={t('Gaari ki halat')} description={t('Baad ke jhagre se bachne ke liye — parchi par chhapta hai')}>
          <Text size="sm" weight="medium" tone="secondary">{t('Petrol')}</Text>
          <ChipGroup value={f.fuel} onChange={(v) => set({ fuel: f.fuel === v ? '' : v })} options={FUEL.map((x) => ({ value: x, label: t(x) }))} />
          <Switch value={f.spare} onChange={(v) => set({ spare: v })} label={t('Stepney saath hai')} />
          <Switch value={f.toolkit} onChange={(v) => set({ toolkit: v })} label={t('Auzaar saath hain')} />
          <Input label={t('Pehle se nuqsan')} value={f.damages} onChangeText={(v) => set({ damages: v })} placeholder={t('Peeche bumper par scratch…')} hint={t('Marzi hai')} />
        </FormSection>

        <FormSection title={t('Customer')} description={t('Phone se purana customer khud mil jata hai; udhaar aur advance usi ke khata me')}>
          <Input label={t('Naam')} value={f.name} onChangeText={(v) => set({ name: v })} placeholder={t('Bilal Ahmad')} hint={t('Marzi hai — udhaar ke liye zaroori')} />
          <Input label={t('Phone')} keyboardType="phone-pad" ltr value={f.phone} onChangeText={(v) => set({ phone: v })} placeholder="03001234567" error={err('phone')} hint={t('WhatsApp par gaari tayyar hone ki khabar')} />
        </FormSection>

        <FormSection title={t('Mazdoori ka andaza')} description={t('Marzi hai — baad me job par bhi jor sakte hain')}>
          {f.labour.map((l, i) => (
            <Card key={i}>
              <View style={{ gap: th.space(2) }}>
                <Input label={t('Kaam')} value={l.description} placeholder={t('Oil change')} onChangeText={(v) => set({ labour: f.labour.map((x, j) => (j === i ? { ...x, description: v } : x)) })} />
                <MoneyInput label={t('Amount')} value={l.amount} onChangeValue={(v) => set({ labour: f.labour.map((x, j) => (j === i ? { ...x, amount: v } : x)) })} />
                <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => set({ labour: f.labour.filter((_, j) => j !== i) })} />
              </View>
            </Card>
          ))}
          {err('labour') ? <Text size="sm" tone="danger">{err('labour')}</Text> : null}
          <Button size="sm" variant="secondary" icon={Plus} onPress={() => set({ labour: [...f.labour, { description: f.labour.length ? '' : jobTypeOf(f.jobType), amount: null }] })}>{t('Mazdoori jorein')}</Button>
          {labourTotal > 0 ? <Text size="sm" weight="semibold" align="end">{t('Kul {{labourTotal}}', { labourTotal: formatMoney(labourTotal) })}</Text> : null}
        </FormSection>

        <FormSection title={t('Advance')} description={t('Abhi mila paisa customer ke khata me jama hota hai aur bill me katta hai')}>
          <MoneyInput label={t('Advance (Rs)')} value={f.advance} onChangeValue={(v) => set({ advance: v })} error={err('advance')} hint={(f.advance ?? 0) ? formatMoney(f.advance ?? 0) : t('Khali chhorein agar kuch nahi mila')} />
          {(f.advance ?? 0) > 0 && <MethodChips value={f.method} onChange={(v) => set({ method: v })} />}
        </FormSection>

        <FormSection title={t('Aur')}>
          <Input label={t('Bay / jagah')} value={f.bay} onChangeText={(v) => set({ bay: v })} placeholder={t('Bay 2')} hint={t('Marzi hai')} />
          <Input label={t('Andar ka note')} value={f.notes} onChangeText={(v) => set({ notes: v })} placeholder={t('Sirf staff ke liye')} hint={t('Parchi par nahi chhapta')} multiline />
          <Switch value={print} onChange={setPrint} label={t('Save ke baad parchi print karein')} />
        </FormSection>
      </View>
    </FormTemplate>
  );
}

function PickRow({ v, last, onPress }: { v: CustomerVehicle & { openJobs: number }; last: boolean; onPress: () => void }) {
  return (
    <Row style={{ padding: 12, borderBottomWidth: last ? 0 : 0.5, borderColor: '#0002' }} gap={2}>
      <View style={{ flex: 1 }}>
        <Text weight="semibold" ltr>{v.registrationNumber} <Text size="sm" tone="secondary">{vehicleName(v)}</Text></Text>
        <Text size="xs" tone="muted" numberOfLines={1}>{[v.ownerName, v.ownerPhone, v.lastServiceAt ? t('{{totalServices}} dafa aayi', { totalServices: v.totalServices }) : null].filter(Boolean).join(' · ')}</Text>
      </View>
      {v.openJobs > 0 ? <Badge tone="warning">{t('Job khuli hai')}</Badge> : null}
      <Button size="sm" variant="soft" onPress={onPress}>{t('Chunein')}</Button>
    </Row>
  );
}
