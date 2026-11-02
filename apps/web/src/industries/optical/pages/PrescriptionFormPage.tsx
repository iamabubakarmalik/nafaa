/**
 * Write or correct a nuskha: customer, who prescribed it, the date and how
 * long it holds, eye power for both eyes (checked like a lab reads it),
 * nazar, fitting height and contact lens fit. Saved nuskhe feed glasses
 * orders and the "muddat qareeb" call-back list.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, FileText, Save, Stethoscope, UserRound } from 'lucide-react';
import { Button, Card, Input, PageShell, Select, Skeleton, Textarea } from '@/design-system/components';
import { prescriptionsApi, type RxInput } from '../api/prescriptions.api';
import { CustomerFields, FormHeader, PowerGrid, emptyParty, emptyPower, partyErrors, powerDraftOf, powerOf, type PartyDraft, type PowerDraft } from '../components/ui';
import { useFormKeys } from '../hooks/usePageKeys';
import { OPTICAL_KEYS, RX_TYPES, apiError, powerErrors, toDateInput, todayInput } from '../lib/meta';
import { t } from '@core/i18n';

const plusYear = (d: string) => { const x = new Date(`${d}T12:00:00`); x.setFullYear(x.getFullYear() + 1); return x.toLocaleDateString('en-CA'); };
const T = ({ icon: Icon, children }: { icon: typeof Eye; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;

export default function PrescriptionFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const existing = useQuery({ queryKey: [OPTICAL_KEYS.rx, 'one', id], queryFn: () => prescriptionsApi.getOne(id!), enabled: editing });

  const [party, setParty] = useState<PartyDraft>(emptyParty);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [type, setType] = useState('DISTANCE');
  const [doctor, setDoctor] = useState('');
  const [clinic, setClinic] = useState('');
  const [date, setDate] = useState(todayInput());
  const [expiry, setExpiry] = useState(plusYear(todayInput()));
  const [power, setPower] = useState<PowerDraft>(emptyPower);
  const [rva, setRva] = useState('');
  const [lva, setLva] = useState('');
  const [seg, setSeg] = useState('');
  const [cl, setCl] = useState({ rbc: '', lbc: '', rdia: '', ldia: '' });
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);
  const [loaded, setLoaded] = useState(!editing);

  useEffect(() => {
    const r = existing.data;
    if (!r || loaded) return;
    setParty({ customerId: r.customerId ?? undefined, name: r.customerName, phone: r.customerPhone ?? '' });
    setAge(r.customerAge != null ? String(r.customerAge) : ''); setGender(r.customerGender ?? ''); setType(r.prescriptionType ?? '');
    setDoctor(r.doctorName ?? r.prescribedBy ?? ''); setClinic(r.clinicName ?? '');
    setDate(toDateInput(r.prescriptionDate)); setExpiry(toDateInput(r.expiryDate));
    setPower(powerDraftOf(r)); setRva(r.rightVa ?? ''); setLva(r.leftVa ?? ''); setSeg(r.segHeight != null ? String(r.segHeight) : '');
    setCl({ rbc: r.clRightBaseCurve ?? '', lbc: r.clLeftBaseCurve ?? '', rdia: r.clRightDiameter ?? '', ldia: r.clLeftDiameter ?? '' });
    setNotes(r.notes ?? '');
    setLoaded(true);
  }, [existing.data, loaded]);

  const p = powerOf(power);
  const pErr = powerErrors(p);
  const pe = partyErrors(party, false);
  const ageN = age ? Number(age) : null;
  const errors: Record<string, string> = { ...pe };
  if (ageN != null && (!Number.isInteger(ageN) || ageN > 120)) errors.age = t('Umar 0 se 120');
  if (!Object.keys(p).length) errors.power = t('Kam se kam ek aankh ka number likhein');
  if (Object.keys(pErr).length) errors.power = Object.values(pErr)[0];
  if (date && expiry && expiry <= date) errors.expiry = t('Muddat nuskhe ki date ke baad honi chahiye');
  if (date > todayInput()) errors.date = t('Aage ki date nahi ho sakti');

  const save = useMutation({
    mutationFn: () => {
      const body: RxInput = {
        customerId: party.customerId, customerName: party.name.trim(), customerPhone: party.phone.trim() || undefined,
        customerAge: ageN ?? undefined, customerGender: gender || undefined, prescriptionType: type || undefined,
        doctorName: doctor.trim() || undefined, prescribedBy: doctor.trim() || undefined, clinicName: clinic.trim() || undefined,
        prescriptionDate: new Date(`${date}T12:00:00`).toISOString(), expiryDate: expiry ? new Date(`${expiry}T12:00:00`).toISOString() : undefined,
        ...Object.fromEntries(Object.keys(emptyPower).map((k) => [k, (p as Record<string, number | undefined>)[k] ?? null])),
        rightVa: rva.trim() || undefined, leftVa: lva.trim() || undefined, segHeight: seg ? Number(seg) : undefined,
        clRightBaseCurve: cl.rbc.trim() || undefined, clLeftBaseCurve: cl.lbc.trim() || undefined, clRightDiameter: cl.rdia.trim() || undefined, clLeftDiameter: cl.ldia.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      return editing ? prescriptionsApi.update(id!, body) : prescriptionsApi.create(body);
    },
    onSuccess: (r) => { toast.success(editing ? t('Nuskha save ho gaya') : t('{{prescriptionNumber}} ban gaya', { prescriptionNumber: r.prescriptionNumber })); qc.invalidateQueries({ queryKey: [OPTICAL_KEYS.rx] }); navigate(`/optical/prescriptions/${r.id}`, { replace: true }); },
    onError: (e) => toast.error(apiError(e, t('Nuskha save nahi hua'))),
  });
  const submit = () => {
    setTried(true);
    const first = Object.values(errors)[0];
    if (first) { toast.error(first); return; }
    if (!save.isPending) save.mutate();
  };
  useFormKeys(submit);
  const show = (k: string) => (tried ? errors[k] : undefined);

  if (editing && !loaded) {
    if (existing.isError) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold">{t('Ye nuskha nahi mila')}</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/optical/prescriptions')}>{t('Nuskhe par wapas')}</Button></div></PageShell>;
    return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-96 rounded-2xl" /></PageShell>;
  }

  return (
    <PageShell>
      <FormHeader title={editing ? t('{{prescriptionNumber}} — badlein', { prescriptionNumber: existing.data?.prescriptionNumber }) : t('Naya nuskha')} hint={t('Customer, doctor, date aur dono aankhon ka number')} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={UserRound}>{t('Customer')}</T>}>
            <CustomerFields value={party} onChange={setParty} errors={tried ? pe : {}} phoneRequired={false} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input label={t('Umar')} inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))} error={show('age')} hint={t('ADD (parhne ka number) umar ke saath barhta hai')} />
              <Select label={t('Jins')} value={gender} onChange={(e) => setGender(e.target.value)} options={[{ value: '', label: '—' }, { value: 'MALE', label: t('Mard') }, { value: 'FEMALE', label: t('Aurat') }, { value: 'OTHER', label: t('Doosra') }]} hint={t('Marzi hai')} />
            </div>
          </Card>
          <Card className="rounded-2xl" title={<T icon={Eye}>{t('Number')}</T>} description={t('Dayan (R) aur bayan (L) — SPH, CYL, AXIS, ADD aur PD')}>
            <PowerGrid value={power} onChange={setPower} errors={tried ? pErr : {}} />
            {show('power') && !Object.keys(pErr).length && <p className="mt-1.5 text-[0.8125rem] font-medium text-rose-600">{show('power')}</p>}
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Input label={t('Nazar R (VA)')} value={rva} onChange={(e) => setRva(e.target.value)} placeholder="6/6" />
              <Input label={t('Nazar L (VA)')} value={lva} onChange={(e) => setLva(e.target.value)} placeholder="6/9" />
              <Input label={t('Fitting height (mm)')} inputMode="decimal" value={seg} onChange={(e) => setSeg(e.target.value.replace(/[^\d.]/g, ''))} hint={t('Progressive / bifocal ke liye')} />
            </div>
          </Card>
          <Card className="rounded-2xl" title={<T icon={Eye}>{t('Contact lens')}</T>} description={t('Sirf contact lens ke nuskhe me — warna khali chhor dein')}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Input label={t('R base curve')} value={cl.rbc} onChange={(e) => setCl({ ...cl, rbc: e.target.value })} placeholder="8.6" />
              <Input label={t('R DIA')} value={cl.rdia} onChange={(e) => setCl({ ...cl, rdia: e.target.value })} placeholder="14.2" />
              <Input label={t('L base curve')} value={cl.lbc} onChange={(e) => setCl({ ...cl, lbc: e.target.value })} placeholder="8.6" />
              <Input label={t('L DIA')} value={cl.ldia} onChange={(e) => setCl({ ...cl, ldia: e.target.value })} placeholder="14.2" />
            </div>
          </Card>
        </div>
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="rounded-2xl" title={<T icon={Stethoscope}>{t('Doctor aur muddat')}</T>}>
            <div className="space-y-3">
              <Select label={t('Type')} value={type} onChange={(e) => setType(e.target.value)} options={[{ value: '', label: '—' }, ...RX_TYPES]} />
              <Input label={t('Doctor')} value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder={t('Dr. Ahmed / dukaan ka optometrist')} maxLength={120} />
              <Input label={t('Clinic / hospital')} value={clinic} onChange={(e) => setClinic(e.target.value)} hint={t('Marzi hai')} maxLength={120} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label={t('Nuskhe ki date')} type="date" max={todayInput()} value={date} onChange={(e) => { setDate(e.target.value); if (!editing && e.target.value) setExpiry(plusYear(e.target.value)); }} error={show('date')} />
                <Input label={t('Kab tak chalega')} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} error={show('expiry')} hint={t('Aam taur par 1 saal')} />
              </div>
              <Textarea label={t('Note')} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} hint={t('Marzi hai')} maxLength={2000} />
              <Button fullWidth size="lg" onClick={submit} loading={save.isPending} leftIcon={editing ? <Save className="h-4 w-4" /> : <FileText className="h-4 w-4" />}>{editing ? t('Save karein') : t('Nuskha save karein')}</Button>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
