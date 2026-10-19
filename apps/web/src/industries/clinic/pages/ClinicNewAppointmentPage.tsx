/**
 * Reception: find or register the patient, pick the doctor, and give a
 * token. The fee follows the doctor (follow-up rate inside the doctor's
 * follow-up days, emergency rate when ticked); it can be taken right away
 * (cash, card, split or khata) and the token slip prints with the bill.
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlarmClock, CalendarClock, CheckCircle2, GraduationCap, Printer, Siren, Stethoscope, Ticket, Timer, UserRound, Wallet } from 'lucide-react';
import { Button, Card, Input, PageHero, PageShell, Skeleton, Switch, Textarea, heroButton, heroIconButton } from '@/design-system/components';
import { HeroBack } from '@core/components/HeroBack';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { appointmentsApi, type Appointment, type FeePayment, type VisitType } from '../api/appointments.api';
import { doctorsApi, type Doctor } from '../api/doctors.api';
import { patientsApi, type Patient } from '../api/patients.api';
import { FeePayModal } from '../components/FeePayModal';
import { PatientPicker } from '../components/PatientPicker';
import { VISIT_TYPES, apiError, dayBounds, dayKey, drName, r2, specialtyLabel } from '../lib/meta';
import { printTokenSlip } from '../lib/print';

interface Done { apt: Appointment; patient: Patient; doctor: Doctor; billed?: boolean }

const localInput = (d: Date) => `${dayKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export default function ClinicNewAppointmentPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const [params] = useSearchParams();
  const canBill = usePermission(PERMISSIONS.POS_USE);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctorId, setDoctorId] = useState('');
  const [visitType, setVisitType] = useState<VisitType | ''>('');
  const [walkIn, setWalkIn] = useState(true);
  const [when, setWhen] = useState(() => localInput(new Date(Date.now() + 3600_000)));
  const [emergency, setEmergency] = useState(false);
  const [complaint, setComplaint] = useState('');
  const [discount, setDiscount] = useState('');
  const [other, setOther] = useState('');
  const [takeFee, setTakeFee] = useState(true);
  const [tried, setTried] = useState(false);
  const [paying, setPaying] = useState<Done | null>(null);
  const [last, setLast] = useState<Done | null>(null);

  // Opened from a patient page or a follow-up: start with that patient (and doctor).
  const patientParam = params.get('patient');
  useQuery({
    queryKey: ['clinic-patient', patientParam],
    queryFn: async () => { const p = await patientsApi.getOne(patientParam!); setPatient(p); return p; },
    enabled: !!patientParam && !patient,
  });
  useEffect(() => { const d = params.get('doctor'); if (d) setDoctorId(d); }, [params]);

  const { data: doctors = [], isLoading } = useQuery({ queryKey: ['clinic-doctors', 'active'], queryFn: () => doctorsApi.list({ active: 'true' }) });
  const today = dayBounds(dayKey());
  const { data: todays = [] } = useQuery({ queryKey: ['clinic-appointments', 'today-count', today.from], queryFn: () => appointmentsApi.list(today), refetchInterval: 60_000 });
  const load = useMemo(() => {
    const m = new Map<string, { total: number; waiting: number }>();
    for (const a of todays) {
      if (a.status === 'CANCELLED' || a.status === 'NO_SHOW') continue;
      const x = m.get(a.doctorId) ?? { total: 0, waiting: 0 };
      x.total += 1;
      if (a.status !== 'COMPLETED') x.waiting += 1;
      m.set(a.doctorId, x);
    }
    return m;
  }, [todays]);

  useEffect(() => { if (!doctorId && doctors.length === 1) setDoctorId(doctors[0].id); }, [doctors, doctorId]);
  const doctor = doctors.find((d) => d.id === doctorId) ?? null;

  const quote = useQuery({
    queryKey: ['clinic-fee-quote', doctorId, patient?.id],
    queryFn: () => appointmentsApi.feeQuote(doctorId, patient?.id),
    enabled: !!doctorId,
  });
  const effectiveType: VisitType = visitType || (emergency ? 'EMERGENCY' : quote.data?.visitType ?? 'FIRST_VISIT');
  const fee = !doctor ? 0
    : emergency && doctor.emergencyFee ? doctor.emergencyFee
      : effectiveType === 'FOLLOW_UP' && doctor.followUpFee ? doctor.followUpFee
        : doctor.consultationFee;
  const total = r2(Math.max(fee + (Number(other) || 0) - (Number(discount) || 0), 0));

  const errors = {
    patient: !patient ? 'Mareez chunein ya register karein' : undefined,
    doctor: !doctorId ? 'Doctor chunein' : undefined,
    discount: Number(discount) > fee + (Number(other) || 0) ? 'Discount fees se zyada hai' : Number(discount) < 0 ? 'Sahi likhein' : undefined,
    when: !walkIn && (!when || Number.isNaN(new Date(when).getTime())) ? 'Waqt likhein' : undefined,
  };

  const reset = () => { setPatient(null); setComplaint(''); setDiscount(''); setOther(''); setEmergency(false); setVisitType(''); setTried(false); };

  const create = useMutation({
    mutationFn: () => appointmentsApi.create({
      patientId: patient!.id, doctorId, walkIn, scheduledStart: walkIn ? new Date().toISOString() : new Date(when).toISOString(),
      visitType: visitType || (emergency ? 'EMERGENCY' : undefined), isEmergency: emergency, chiefComplaint: complaint.trim() || undefined,
      discount: Number(discount) || 0, otherCharges: Number(other) || 0,
    }),
    onSuccess: (apt) => {
      qc.invalidateQueries({ queryKey: ['clinic-appointments'] });
      qc.invalidateQueries({ queryKey: ['clinic-queue'] });
      const done = { apt, patient: patient!, doctor: doctor! };
      toast.success(`Token ${apt.tokenNumber} — ${drName(doctor)}`);
      if (takeFee && canBill && apt.total > 0) setPaying(done);
      else { setLast(done); reset(); }
    },
    onError: (e) => toast.error(apiError(e, 'Token nahi bana')),
  });

  const pay = useMutation({
    mutationFn: (body: FeePayment) => appointmentsApi.addPayment(paying!.apt.id, body),
    onSuccess: (res) => {
      const done = { ...paying!, apt: res, billed: true };
      printTokenSlip(res, done.patient, done.doctor, res.sale);
      toast.success(`Bill ${res.sale.saleNumber} ban gaya`);
      qc.invalidateQueries({ queryKey: ['clinic-appointments'] });
      setPaying(null); setLast(done); reset();
    },
    onError: (e) => toast.error(apiError(e, 'Bill nahi bana')),
  });

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    setTried(true);
    if (Object.values(errors).some(Boolean)) { toast.error(Object.values(errors).find(Boolean)!); return; }
    create.mutate();
  };

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Reception — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: UserRound, color: '#2563eb', title: 'Mareez', text: 'Phone ya naam likhein — purana mareez foran milta hai. Na mile to "Naya" se 10 second me register.' },
            { icon: Stethoscope, color: '#0891b2', title: 'Doctor', text: 'Doctor chunein; fees khud aa jati hai. Follow-up ke dinon me dobara aaye to follow-up fees lagti hai.' },
            { icon: Ticket, color: '#16a34a', title: 'Token', text: 'Abhi aaya mareez seedha line me jata hai. Baad ka waqt dena ho to "Abhi aaya" band karein.' },
            { icon: Wallet, color: '#d97706', title: 'Fees', text: 'Cash, card, do tareeqe ya khata — har payment bill banti hai aur drawer, day book aur khata me ek hi dafa aati hai.' },
          ]}
          shortcuts={[['Ctrl+S', 'token banayein'], ['Enter', 'pehla mareez chunein'], ['G', 'guide']]} />
      )}
      {paying && (
        <FeePayModal title={`Fees — Token ${paying.apt.tokenNumber}`} description={`${paying.patient.fullName} · ${drName(paying.doctor)} · ${formatPKR(paying.apt.total)}`}
          due={r2(paying.apt.total - paying.apt.paidAmount)} busy={pay.isPending}
          onClose={() => { setLast(paying); setPaying(null); reset(); }} onPay={(b) => pay.mutate(b)} />
      )}

      <PageHero title={<HeroBack to="/clinic/appointments" label="Appointments">Reception</HeroBack>} chip={<><Ticket />Naya token</>}
        meta="Mareez → doctor → token aur fees"
        actions={<>
          <Link to="/clinic/queue" className={heroButton}><Timer className="h-4 w-4" />Live line</Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>} />

      {last && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="min-w-0 flex-1 text-[0.875rem] text-emerald-900"><b>Token {last.apt.tokenNumber}</b> · {last.patient.fullName} · {drName(last.doctor)}{last.billed ? ' · bill ban gaya' : last.apt.total > 0 ? ' · fees baqi' : ''}</p>
          <Button size="sm" variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => printTokenSlip(last.apt, last.patient, last.doctor)}>Token print</Button>
          <Button size="sm" variant="secondary" onClick={() => navigate(`/clinic/appointments/${last.apt.id}`)}>Visit kholein</Button>
        </div>
      )}

      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]"
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <div className="space-y-4">
          <Card title="1. Mareez" description="Phone, naam, MR number ya CNIC">
            <div className="px-4 pb-4 sm:px-5 sm:pb-5"><PatientPicker value={patient} onChange={setPatient} autoFocus error={tried ? errors.patient : undefined} /></div>
          </Card>

          <Card title="2. Doctor" description="Aaj kis ke paas kitne mareez hain, saath dikhta hai">
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              {isLoading ? <div className="grid gap-2 sm:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
                : doctors.length === 0 ? (
                  <p className="rounded-xl bg-amber-50 px-3 py-3 text-[0.875rem] text-amber-900 ring-1 ring-amber-200">Abhi koi doctor nahi. <Link to="/clinic/doctors" className="font-semibold underline">Doctor jorein</Link></p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Doctor">
                    {doctors.map((d) => {
                      const l = load.get(d.id);
                      const full = !!d.maxDailyPatients && (l?.total ?? 0) >= d.maxDailyPatients;
                      return (
                        <button key={d.id} type="button" role="radio" aria-checked={doctorId === d.id} onClick={() => setDoctorId(d.id)}
                          className={cn('rounded-2xl p-3 text-left ring-1 transition', doctorId === d.id ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                          <p className="truncate text-[0.9375rem] font-semibold text-slate-900">{drName(d)}</p>
                          <p className="truncate text-[0.75rem] text-slate-500">{specialtyLabel(d.specialties?.[0]) || 'Doctor'} · {d.workStartTime}–{d.workEndTime}</p>
                          <div className="mt-2 flex items-center justify-between text-[0.75rem]">
                            <span className="font-bold tabular-nums text-slate-900">{formatPKR(d.consultationFee)}</span>
                            <span className={cn('rounded-full px-2 py-0.5 font-semibold', full ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600')}>
                              {l ? `${l.waiting} intezar · ${l.total} aaj` : 'Aaj koi nahi'}{d.maxDailyPatients ? ` / ${d.maxDailyPatients}` : ''}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              {tried && errors.doctor && <p className="mt-2 text-xs font-medium text-rose-600">{errors.doctor}</p>}
            </div>
          </Card>

          <Card title="3. Visit" description="Kis liye aaya — doctor ko pehle se pata ho">
            <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Visit type">
                {VISIT_TYPES.slice(0, 8).map((v) => (
                  <button key={v.value} type="button" role="radio" aria-checked={effectiveType === v.value} onClick={() => setVisitType(v.value)}
                    className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-semibold ring-1', effectiveType === v.value ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                    {v.label}
                  </button>
                ))}
              </div>
              {quote.data?.visitType === 'FOLLOW_UP' && !visitType && (
                <p className="text-[0.8125rem] text-emerald-700">Pichhli visit {new Date(quote.data.lastVisitAt!).toLocaleDateString('en-PK')} — follow-up fees lagi.</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <Switch checked={walkIn} onChange={(e) => setWalkIn(e.target.checked)} label={<span className="inline-flex items-center gap-1.5"><AlarmClock className="h-4 w-4 text-brand-600" />Abhi aaya (line me)</span>} description="Band karein to baad ka waqt dein" />
                  {!walkIn && <Input wrapperClassName="mt-2" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} error={tried ? errors.when : undefined} aria-label="Waqt" leftIcon={<CalendarClock className="h-4 w-4" />} />}
                </div>
                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <Switch checked={emergency} onChange={(e) => setEmergency(e.target.checked)} label={<span className="inline-flex items-center gap-1.5"><Siren className="h-4 w-4 text-rose-600" />Emergency</span>} description="Line me sab se upar; emergency fees agar rakhi hai" />
                </div>
              </div>
              <Textarea label="Shikayat" rows={2} value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="Bukhar 3 din se, khansi…" hint="Doctor ki screen par sab se upar aati hai" />
            </div>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card title="Fees" description={doctor ? drName(doctor) : 'Doctor chunein'}>
            <div className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
              <div className="flex justify-between text-[0.875rem]"><span className="text-slate-600">Consultation</span><span className="font-semibold tabular-nums">{formatPKR(fee)}</span></div>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Doosre charges" inputMode="decimal" size="sm" value={other} onChange={(e) => setOther(e.target.value)} placeholder="0" />
                <Input label="Discount" inputMode="decimal" size="sm" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" error={tried ? errors.discount : undefined} />
              </div>
              <div className="flex items-baseline justify-between border-t border-slate-100 pt-3"><span className="font-semibold text-slate-700">Kul</span><span className="text-2xl font-bold tabular-nums text-slate-900">{formatPKR(total)}</span></div>
              {canBill && <Switch checked={takeFee} onChange={(e) => setTakeFee(e.target.checked)} label="Fees abhi lein" description="Token ke saath bill aur parchi print" />}
              <Button type="submit" fullWidth size="lg" loading={create.isPending} leftIcon={<Ticket className="h-5 w-5" />}>Token banayein</Button>
              <p className="text-center text-[0.75rem] text-slate-500">Ctrl+S</p>
            </div>
          </Card>
        </aside>
      </form>
    </PageShell>
  );
}
