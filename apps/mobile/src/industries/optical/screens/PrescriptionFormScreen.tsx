/**
 * Write or correct a prescription (web PrescriptionFormPage): customer, who
 * prescribed it, the date and how long it holds, eye power for both eyes
 * (checked like a lab reads it), vision, fitting height and contact lens fit.
 * Saved prescriptions feed glasses orders and the "running out" call-back list.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { powerDraftOf, powerErrors, powerOf, emptyPower, plusYear, POWER_KEYS, type PowerDraft } from '@nafaa/core/industries/optical';
import { useMutation } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { DatePicker, ErrorState, FormSection, FormTemplate, Input, Select, SkeletonRows, TextArea, toast } from '@/design';
import { prescriptionsApi, type RxInput } from '../api';
import { PartyFields, PowerGrid, emptyParty, partyErrors, powerErrorText, type PartyDraft } from '../components/parts';
import { OPTICAL_KEYS, RX_TYPES, asDate, dayKey, isoAt, refreshOptical, todayKey } from '../meta';

export function PrescriptionFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const online = useOnlineStatus();
  const existing = useQuery({ queryKey: [OPTICAL_KEYS.rx, 'one', id], queryFn: () => prescriptionsApi.getOne(id!), enabled: editing });

  const [party, setParty] = useState<PartyDraft>(emptyParty);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [type, setType] = useState('DISTANCE');
  const [doctor, setDoctor] = useState('');
  const [clinic, setClinic] = useState('');
  const [date, setDate] = useState(todayKey());
  const [expiry, setExpiry] = useState(plusYear(todayKey()));
  const [power, setPower] = useState<PowerDraft>(emptyPower());
  const [rva, setRva] = useState('');
  const [lva, setLva] = useState('');
  const [seg, setSeg] = useState('');
  const [cl, setCl] = useState({ rbc: '', lbc: '', rdia: '', ldia: '' });
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(!editing);

  useEffect(() => {
    const r = existing.data;
    if (!r || loaded) return;
    setParty({ customerId: r.customerId ?? undefined, name: r.customerName, phone: r.customerPhone ?? '' });
    setAge(r.customerAge != null ? String(r.customerAge) : ''); setGender(r.customerGender ?? ''); setType(r.prescriptionType ?? '');
    setDoctor(r.doctorName ?? r.prescribedBy ?? ''); setClinic(r.clinicName ?? '');
    setDate(dayKey(r.prescriptionDate)); setExpiry(r.expiryDate ? dayKey(r.expiryDate) : '');
    setPower(powerDraftOf(r)); setRva(r.rightVa ?? ''); setLva(r.leftVa ?? ''); setSeg(r.segHeight != null ? String(r.segHeight) : '');
    setCl({ rbc: r.clRightBaseCurve ?? '', lbc: r.clLeftBaseCurve ?? '', rdia: r.clRightDiameter ?? '', ldia: r.clLeftDiameter ?? '' });
    setNotes(r.notes ?? '');
    setLoaded(true);
  }, [existing.data, loaded]);
  const touch = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => { setDirty(true); fn(...a); };

  const p = powerOf(power);
  const pErr = powerErrors(p);
  const pe = partyErrors(party, false);
  const ageN = age ? Number(age) : null;
  const errors: Record<string, string> = { ...pe };
  if (ageN != null && (!Number.isInteger(ageN) || ageN > 120)) errors.age = t('Umar 0 se 120');
  if (!Object.keys(p).length) errors.power = t('Kam se kam ek aankh ka number likhein');
  if (Object.keys(pErr).length) errors.power = powerErrorText(pErr) ?? '';
  if (date && expiry && expiry <= date) errors.expiry = t('Muddat nuskhe ki date ke baad honi chahiye');
  if (date > todayKey()) errors.date = t('Aage ki date nahi ho sakti');

  const save = useMutation({
    mutationFn: () => {
      const body: RxInput = {
        customerId: party.customerId, customerName: party.name.trim(), customerPhone: party.phone.trim() || undefined,
        customerAge: ageN ?? undefined, customerGender: gender || undefined, prescriptionType: type || undefined,
        doctorName: doctor.trim() || undefined, prescribedBy: doctor.trim() || undefined, clinicName: clinic.trim() || undefined,
        prescriptionDate: isoAt(date), expiryDate: expiry ? isoAt(expiry) : undefined,
        ...Object.fromEntries(POWER_KEYS.map((k) => [k, p[k] ?? null])),
        rightVa: rva.trim() || undefined, leftVa: lva.trim() || undefined, segHeight: seg ? Number(seg) : undefined,
        clRightBaseCurve: cl.rbc.trim() || undefined, clLeftBaseCurve: cl.lbc.trim() || undefined, clRightDiameter: cl.rdia.trim() || undefined, clLeftDiameter: cl.ldia.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      return editing ? prescriptionsApi.update(id!, body) : prescriptionsApi.create(body);
    },
    onSuccess: (r) => {
      setDirty(false);
      toast.success(editing ? t('Nuskha save ho gaya') : t('{{prescriptionNumber}} ban gaya', { prescriptionNumber: r.prescriptionNumber }));
      refreshOptical([OPTICAL_KEYS.rx]);
      router.replace(`/optical/prescriptions/${r.id}` as never);
    },
  });
  const submit = () => {
    setTried(true);
    const first = Object.values(errors)[0];
    if (first) { toast.error(first); return; }
    if (!online) { toast.warning(onlineNeededText('opticalDesk')); return; }
    if (!save.isPending) save.mutate();
  };
  const show = (k: string) => (tried ? errors[k] : undefined);

  if (editing && !loaded) {
    return <FormTemplate title={t('Nuskha badlein')} onSave={() => undefined}>{existing.isError ? <ErrorState error={existing.error} onRetry={() => void existing.refetch()} /> : <SkeletonRows count={5} />}</FormTemplate>;
  }

  return (
    <FormTemplate title={editing ? t('{{prescriptionNumber}} — badlein', { prescriptionNumber: existing.data?.prescriptionNumber }) : t('Naya nuskha')} subtitle={t('Customer, doctor, date aur dono aankhon ka number')}
      dirty={dirty} saving={save.isPending} onSave={submit} saveLabel={editing ? t('Save karein') : t('Nuskha save karein')}>
      <FormSection title={t('Customer')}>
        <PartyFields value={party} onChange={touch(setParty)} errors={tried ? pe : {}} phoneRequired={false} />
        <Input label={t('Umar')} value={age} onChangeText={touch((v: string) => setAge(v.replace(/\D/g, '').slice(0, 3)))} keyboardType="number-pad" error={show('age')} hint={t('ADD (parhne ka number) umar ke saath barhta hai')} />
        <Select label={t('Jins')} value={gender} onChange={touch(setGender)} hint={t('Marzi hai')}
          options={[{ value: '', label: '—' }, { value: 'MALE', label: t('Mard') }, { value: 'FEMALE', label: t('Aurat') }, { value: 'OTHER', label: t('Doosra') }]} />
      </FormSection>
      <FormSection title={t('Number')} description={t('Dayan (R) aur bayan (L) — SPH, CYL, AXIS, ADD aur PD')}>
        <PowerGrid value={power} onChange={touch(setPower)} errors={tried ? pErr : {}} />
        <Input label={t('Nazar R (VA)')} value={rva} onChangeText={touch(setRva)} placeholder="6/6" ltr />
        <Input label={t('Nazar L (VA)')} value={lva} onChangeText={touch(setLva)} placeholder="6/9" ltr />
        <Input label={t('Fitting height (mm)')} value={seg} onChangeText={touch((v: string) => setSeg(v.replace(/[^\d.]/g, '')))} keyboardType="decimal-pad" hint={t('Progressive / bifocal ke liye')} />
      </FormSection>
      <FormSection title={t('Contact lens')} description={t('Sirf contact lens ke nuskhe me — warna khali chhor dein')}>
        <Input label={t('R base curve')} value={cl.rbc} onChangeText={touch((v: string) => setCl({ ...cl, rbc: v }))} placeholder="8.6" ltr />
        <Input label={t('R DIA')} value={cl.rdia} onChangeText={touch((v: string) => setCl({ ...cl, rdia: v }))} placeholder="14.2" ltr />
        <Input label={t('L base curve')} value={cl.lbc} onChangeText={touch((v: string) => setCl({ ...cl, lbc: v }))} placeholder="8.6" ltr />
        <Input label={t('L DIA')} value={cl.ldia} onChangeText={touch((v: string) => setCl({ ...cl, ldia: v }))} placeholder="14.2" ltr />
      </FormSection>
      <FormSection title={t('Doctor aur muddat')}>
        <Select label={t('Type')} value={type} onChange={touch(setType)} options={[{ value: '', label: '—' }, ...RX_TYPES.map((x) => ({ value: x.value, label: t(x.label) }))]} />
        <Input label={t('Doctor')} value={doctor} onChangeText={touch(setDoctor)} placeholder={t('Dr. Ahmed / dukaan ka optometrist')} maxLength={120} />
        <Input label={t('Clinic / hospital')} value={clinic} onChangeText={touch(setClinic)} hint={t('Marzi hai')} maxLength={120} />
        <DatePicker label={t('Nuskhe ki date')} value={asDate(date)} maximumDate={new Date()} error={show('date')}
          onChange={touch((d: Date) => { const k = dayKey(d.toISOString()); setDate(k); if (!editing) setExpiry(plusYear(k)); })} />
        <DatePicker label={t('Kab tak chalega')} value={expiry ? asDate(expiry) : null} error={show('expiry')} hint={t('Aam taur par 1 saal')} onChange={touch((d: Date) => setExpiry(dayKey(d.toISOString())))} />
        <TextArea label={t('Note')} value={notes} onChangeText={touch(setNotes)} hint={t('Marzi hai')} maxLength={2000} />
      </FormSection>
    </FormTemplate>
  );
}
