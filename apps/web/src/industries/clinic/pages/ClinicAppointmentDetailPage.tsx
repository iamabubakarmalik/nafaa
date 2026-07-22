import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, X, Sparkles, User, Phone, Calendar, Clock,
  Save, Activity, FileText, Pill, TestTube, Printer, DollarSign,
  AlertCircle, Video, Home, Zap, Plus, Trash2, Ban,
} from 'lucide-react';
import { appointmentsApi, type AppointmentStatus } from '../api/appointments.api';
import { vitalsApi } from '../api/vitals.api';
import { encountersApi } from '../api/encounters.api';
import { prescriptionsApi } from '../api/prescriptions.api';
import { labOrdersApi } from '../api/lab-orders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format, differenceInYears } from 'date-fns';

const STATUS_FLOW: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED', 'ARRIVED', 'IN_CONSULTATION', 'COMPLETED'];

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; textColor: string }> = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-slate-500', textColor: 'text-slate-700' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-500', textColor: 'text-blue-700' },
  ARRIVED: { label: 'Arrived', color: 'bg-cyan-500', textColor: 'text-cyan-700' },
  IN_CONSULTATION: { label: 'In Consultation', color: 'bg-amber-500', textColor: 'text-amber-700' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-600', textColor: 'text-emerald-700' },
  NO_SHOW: { label: 'No Show', color: 'bg-orange-600', textColor: 'text-orange-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500', textColor: 'text-rose-700' },
  RESCHEDULED: { label: 'Rescheduled', color: 'bg-violet-500', textColor: 'text-violet-700' },
};

export default function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'encounter' | 'prescription' | 'labs'>('overview');
  const [showPayment, setShowPayment] = useState(false);

  const { data: apt, isLoading, refetch } = useQuery({
    queryKey: ['clinic-appointment', id],
    queryFn: () => appointmentsApi.getOne(id!),
    enabled: !!id,
    refetchInterval: 60_000,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => appointmentsApi.updateStatus(id!, status),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['clinic-appointment', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  if (isLoading || !apt) {
    return <div className="h-64 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />;
  }

  const statusCfg = STATUS_CONFIG[apt.status];
  const currentIdx = STATUS_FLOW.indexOf(apt.status);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
  const remaining = apt.total - apt.paidAmount;
  const isFullyPaid = remaining <= 0.01;
  const age = apt.patient?.dateOfBirth ? differenceInYears(new Date(), new Date(apt.patient.dateOfBirth)) : null;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/clinic/appointments')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                Token #{apt.tokenNumber || '?'} • {apt.appointmentNumber}
              </div>
              <h1 className="mt-1 text-3xl font-extrabold">{apt.patient?.fullName || 'Patient'}</h1>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-sm">
                <span className={'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase text-white ' + statusCfg.color}>
                  {statusCfg.label}
                </span>
                {apt.isEmergency && <span className="px-2 py-0.5 rounded bg-red-500 text-white text-xs font-extrabold uppercase inline-flex items-center gap-0.5"><Zap className="h-3 w-3" />EMERGENCY</span>}
                {apt.isTelemedicine && <span className="px-2 py-0.5 rounded bg-purple-500 text-white text-xs font-extrabold uppercase inline-flex items-center gap-0.5"><Video className="h-3 w-3" />TELE</span>}
                {apt.isHomeVisit && <span className="px-2 py-0.5 rounded bg-blue-500 text-white text-xs font-extrabold uppercase inline-flex items-center gap-0.5"><Home className="h-3 w-3" />HOME</span>}
                <span className="text-white/80 font-semibold inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(apt.scheduledStart), 'dd MMM yyyy, HH:mm')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <Printer className="h-4 w-4" />
              Print
            </button>
            {!isFullyPaid && apt.status !== 'CANCELLED' && (
              <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowPayment(true)}>
                <DollarSign className="h-4 w-4" />
                Payment
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Status flow */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-extrabold">Visit Workflow</h3>
          {nextStatus && !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(apt.status) && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => statusMutation.mutate(nextStatus)} loading={statusMutation.isPending} className={STATUS_CONFIG[nextStatus].color + ' text-white'}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark {STATUS_CONFIG[nextStatus].label}
              </Button>
              {apt.status !== 'COMPLETED' && (
                <Button size="sm" variant="secondary" onClick={() => statusMutation.mutate('NO_SHOW')} className="bg-orange-50 text-orange-700 border-orange-300">
                  <Ban className="h-3.5 w-3.5" />
                  No Show
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STATUS_FLOW.map((s, i) => {
            const isActive = i <= currentIdx;
            const isCurrent = i === currentIdx;
            const cfg = STATUS_CONFIG[s];
            return (
              <div key={s} className="flex items-center shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div className={
                    'h-9 w-9 rounded-full flex items-center justify-center text-xs font-extrabold transition ' +
                    (isCurrent ? cfg.color + ' text-white ring-4 ring-blue-200 shadow' :
                     isActive ? cfg.color + ' text-white' : 'bg-slate-200 dark:bg-neutral-700 text-slate-500')
                  }>
                    {isActive && !isCurrent ? '✓' : i + 1}
                  </div>
                  <span className={'text-[9px] font-extrabold uppercase ' + (isActive ? cfg.textColor : 'text-slate-400')}>
                    {cfg.label}
                  </span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={'h-0.5 w-8 mx-1 ' + (i < currentIdx ? 'bg-blue-500' : 'bg-slate-200 dark:bg-neutral-700')} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 border-b-2 border-slate-200 dark:border-neutral-800 overflow-x-auto">
        {[
          { v: 'overview', label: 'Overview', icon: User },
          { v: 'vitals', label: 'Vitals', icon: Activity },
          { v: 'encounter', label: 'SOAP Notes', icon: FileText },
          { v: 'prescription', label: 'Prescription', icon: Pill },
          { v: 'labs', label: 'Lab Orders', icon: TestTube },
        ].map((t) => (
          <button key={t.v} onClick={() => setActiveTab(t.v as any)} className={
            'shrink-0 px-4 py-3 text-sm font-extrabold border-b-2 transition -mb-0.5 inline-flex items-center gap-2 ' +
            (activeTab === t.v ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700')
          }>
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          {activeTab === 'overview' && (
            <>
              {/* Patient Info */}
              <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
                <h3 className="text-sm font-extrabold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-fuchsia-600" />
                  Patient
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="font-extrabold text-slate-900 dark:text-white text-base">
                    {apt.patient?.fullName}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-blue-600">{apt.patient?.mrn}</div>
                  {apt.patient?.phonePrimary && (
                    <a href={'tel:' + apt.patient.phonePrimary} className="flex items-center gap-1 text-blue-700 font-bold hover:underline">
                      <Phone className="h-3 w-3" />
                      {apt.patient.phonePrimary}
                    </a>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {age !== null && <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-xs font-extrabold">{age}y</span>}
                    {apt.patient?.gender && <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-xs font-extrabold">{apt.patient.gender}</span>}
                    {apt.patient?.bloodGroup && (
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-extrabold">
                        🩸 {apt.patient.bloodGroup.replace('_POS', '+').replace('_NEG', '−')}
                      </span>
                    )}
                  </div>
                  {apt.patient?.allergies?.length > 0 && (
                    <div className="mt-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 p-2">
                      <div className="text-[10px] uppercase font-extrabold text-rose-700 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        ALLERGIES
                      </div>
                      <div className="text-xs font-bold text-rose-900 mt-1">{apt.patient.allergies.join(', ')}</div>
                    </div>
                  )}
                  {apt.patient?.chronicConditions?.length > 0 && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-2">
                      <div className="text-[10px] uppercase font-extrabold text-amber-700">Chronic Conditions</div>
                      <div className="text-xs font-bold text-amber-900 mt-1">{apt.patient.chronicConditions.join(', ')}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Doctor Info */}
              <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
                <h3 className="text-sm font-extrabold mb-3">Attending Doctor</h3>
                <div className="text-base font-extrabold">
                  {apt.doctor?.title} {apt.doctor?.fullName}
                </div>
                <div className="text-xs font-bold text-slate-500 uppercase">
                  {apt.doctor?.specialties?.[0]?.replace(/_/g, ' ')}
                </div>
              </div>

              {/* Complaint */}
              {apt.chiefComplaint && (
                <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 p-4">
                  <div className="text-xs font-extrabold text-blue-700 uppercase">Chief Complaint</div>
                  <div className="mt-1 text-sm font-bold">{apt.chiefComplaint}</div>
                </div>
              )}
              {apt.reasonForVisit && (
                <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 p-4">
                  <div className="text-xs font-extrabold text-slate-500 uppercase">Reason for Visit</div>
                  <div className="mt-1 text-sm">{apt.reasonForVisit}</div>
                </div>
              )}
            </>
          )}

          {activeTab === 'vitals' && <VitalsPanel appointmentId={id!} initialVitals={apt.vitals} />}
          {activeTab === 'encounter' && <EncounterPanel appointmentId={id!} initialEncounter={apt.encounter} />}
          {activeTab === 'prescription' && <PrescriptionPanel appointmentId={id!} encounter={apt.encounter} />}
          {activeTab === 'labs' && <LabOrdersPanel appointmentId={id!} encounter={apt.encounter} patientId={apt.patientId} doctorId={apt.doctorId} />}
        </div>

        {/* Bill Summary */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-blue-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">💰 Bill</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Consultation</span><span className="font-bold tabular-nums">{formatPKR(apt.consultationFee)}</span></div>
                {apt.otherCharges > 0 && <div className="flex justify-between"><span className="text-white/70">Other</span><span className="font-bold tabular-nums">{formatPKR(apt.otherCharges)}</span></div>}
                {apt.taxAmount > 0 && <div className="flex justify-between"><span className="text-white/70">Tax</span><span className="font-bold tabular-nums">{formatPKR(apt.taxAmount)}</span></div>}
                {apt.discount > 0 && <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(apt.discount)}</span></div>}
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(apt.total)}</span>
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/70">Paid</span>
                  <span className="font-extrabold text-emerald-300 tabular-nums">{formatPKR(apt.paidAmount)}</span>
                </div>
                {remaining > 0 && (
                  <div className="flex justify-between">
                    <span className="text-amber-300 font-extrabold">Remaining</span>
                    <span className="font-extrabold text-amber-300 tabular-nums">{formatPKR(remaining)}</span>
                  </div>
                )}
                {isFullyPaid && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/30 text-emerald-200 text-xs font-extrabold">
                    <CheckCircle2 className="h-3 w-3" />
                    PAID IN FULL
                  </div>
                )}
              </div>
              {!isFullyPaid && apt.status !== 'CANCELLED' && (
                <Button size="lg" className="w-full mt-4 bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowPayment(true)}>
                  <DollarSign className="h-4 w-4" />
                  Add Payment
                </Button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {showPayment && <PaymentModal apptId={id!} remaining={remaining} onClose={() => setShowPayment(false)} onDone={() => { setShowPayment(false); refetch(); }} />}
    </div>
  );
}

// ─── Vitals Panel ───
function VitalsPanel({ appointmentId, initialVitals }: any) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>({
    bpSystolic: initialVitals?.bpSystolic ?? '',
    bpDiastolic: initialVitals?.bpDiastolic ?? '',
    pulseRate: initialVitals?.pulseRate ?? '',
    respiratoryRate: initialVitals?.respiratoryRate ?? '',
    temperatureC: initialVitals?.temperatureC ?? '',
    spo2: initialVitals?.spo2 ?? '',
    bloodSugar: initialVitals?.bloodSugar ?? '',
    bloodSugarType: initialVitals?.bloodSugarType ?? 'RANDOM',
    heightCm: initialVitals?.heightCm ?? '',
    weightKg: initialVitals?.weightKg ?? '',
    painScore: initialVitals?.painScore ?? '',
    notes: initialVitals?.notes ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => vitalsApi.record(appointmentId, {
      ...form,
      bpSystolic: form.bpSystolic ? Number(form.bpSystolic) : undefined,
      bpDiastolic: form.bpDiastolic ? Number(form.bpDiastolic) : undefined,
      pulseRate: form.pulseRate ? Number(form.pulseRate) : undefined,
      respiratoryRate: form.respiratoryRate ? Number(form.respiratoryRate) : undefined,
      temperatureC: form.temperatureC ? Number(form.temperatureC) : undefined,
      spo2: form.spo2 ? Number(form.spo2) : undefined,
      bloodSugar: form.bloodSugar ? Number(form.bloodSugar) : undefined,
      heightCm: form.heightCm ? Number(form.heightCm) : undefined,
      weightKg: form.weightKg ? Number(form.weightKg) : undefined,
      painScore: form.painScore ? Number(form.painScore) : undefined,
    }),
    onSuccess: () => { toast.success('Vitals saved'); queryClient.invalidateQueries({ queryKey: ['clinic-appointment'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
      <h3 className="font-extrabold flex items-center gap-2">
        <Activity className="h-4 w-4 text-red-600" />
        Vital Signs
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <VitalField label="BP Systolic" value={form.bpSystolic} onChange={(v: any) => setForm({ ...form, bpSystolic: v })} unit="mmHg" color="red" />
        <VitalField label="BP Diastolic" value={form.bpDiastolic} onChange={(v: any) => setForm({ ...form, bpDiastolic: v })} unit="mmHg" color="red" />
        <VitalField label="Pulse" value={form.pulseRate} onChange={(v: any) => setForm({ ...form, pulseRate: v })} unit="bpm" color="pink" />
        <VitalField label="Resp Rate" value={form.respiratoryRate} onChange={(v: any) => setForm({ ...form, respiratoryRate: v })} unit="/min" color="cyan" />
        <VitalField label="Temperature" value={form.temperatureC} onChange={(v: any) => setForm({ ...form, temperatureC: v })} unit="°C" color="orange" step="0.1" />
        <VitalField label="SpO2" value={form.spo2} onChange={(v: any) => setForm({ ...form, spo2: v })} unit="%" color="blue" />
        <VitalField label="Blood Sugar" value={form.bloodSugar} onChange={(v: any) => setForm({ ...form, bloodSugar: v })} unit="mg/dL" color="amber" />
        <VitalField label="Pain Score" value={form.painScore} onChange={(v: any) => setForm({ ...form, painScore: v })} unit="/10" color="rose" />
        <VitalField label="Height" value={form.heightCm} onChange={(v: any) => setForm({ ...form, heightCm: v })} unit="cm" color="slate" step="0.1" />
        <VitalField label="Weight" value={form.weightKg} onChange={(v: any) => setForm({ ...form, weightKg: v })} unit="kg" color="slate" step="0.1" />
      </div>

      <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes about vitals..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-red-500 resize-none" />

      <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} className="bg-gradient-to-r from-red-600 to-rose-700">
        <Save className="h-4 w-4" />
        Save Vitals
      </Button>
    </div>
  );
}

function VitalField({ label, value, onChange, unit, color, step }: any) {
  const colors: Record<string, string> = {
    red: 'border-red-200 bg-red-50 focus:border-red-500',
    pink: 'border-pink-200 bg-pink-50 focus:border-pink-500',
    cyan: 'border-cyan-200 bg-cyan-50 focus:border-cyan-500',
    orange: 'border-orange-200 bg-orange-50 focus:border-orange-500',
    blue: 'border-blue-200 bg-blue-50 focus:border-blue-500',
    amber: 'border-amber-200 bg-amber-50 focus:border-amber-500',
    rose: 'border-rose-200 bg-rose-50 focus:border-rose-500',
    slate: 'border-slate-200 bg-slate-50 focus:border-slate-500',
  };
  return (
    <div>
      <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-0.5 block">{label}</label>
      <div className="relative">
        <input type="number" step={step || '1'} value={value} onChange={(e) => onChange(e.target.value)} className={'h-11 w-full rounded-xl border-2 px-3 pr-12 text-sm font-extrabold tabular-nums focus:outline-none ' + colors[color]} />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">{unit}</span>
      </div>
    </div>
  );
}

// ─── Encounter (SOAP) Panel ───
function EncounterPanel({ appointmentId, initialEncounter }: any) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>({
    subjective: initialEncounter?.subjective ?? '',
    objective: initialEncounter?.objective ?? '',
    assessment: initialEncounter?.assessment ?? '',
    plan: initialEncounter?.plan ?? '',
    provisionalDiagnosis: initialEncounter?.provisionalDiagnosis ?? '',
    finalDiagnosis: initialEncounter?.finalDiagnosis ?? '',
    icd10Codes: initialEncounter?.icd10Codes?.join(', ') ?? '',
    advice: initialEncounter?.advice ?? '',
    dietaryAdvice: initialEncounter?.dietaryAdvice ?? '',
    followUpAdvice: initialEncounter?.followUpAdvice ?? '',
    followUpDate: initialEncounter?.followUpDate ? initialEncounter.followUpDate.slice(0, 10) : '',
    referredTo: initialEncounter?.referredTo ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => encountersApi.upsert(appointmentId, {
      ...form,
      icd10Codes: form.icd10Codes ? form.icd10Codes.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => { toast.success('Encounter saved'); queryClient.invalidateQueries({ queryKey: ['clinic-appointment'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
      <h3 className="font-extrabold flex items-center gap-2">
        <FileText className="h-4 w-4 text-emerald-600" />
        SOAP Notes
      </h3>

      <div>
        <label className="text-xs font-extrabold text-blue-700 mb-1 block">S — Subjective (patient reports)</label>
        <textarea rows={3} value={form.subjective} onChange={(e) => setForm({ ...form, subjective: e.target.value })} placeholder="Patient's own words about symptoms..." className="w-full rounded-xl border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />
      </div>

      <div>
        <label className="text-xs font-extrabold text-emerald-700 mb-1 block">O — Objective (examination findings)</label>
        <textarea rows={3} value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Physical exam, observations..." className="w-full rounded-xl border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />
      </div>

      <div>
        <label className="text-xs font-extrabold text-amber-700 mb-1 block">A — Assessment (diagnosis)</label>
        <textarea rows={2} value={form.assessment} onChange={(e) => setForm({ ...form, assessment: e.target.value })} className="w-full rounded-xl border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />
      </div>

      <div>
        <label className="text-xs font-extrabold text-purple-700 mb-1 block">P — Plan (treatment plan)</label>
        <textarea rows={3} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="Treatment plan, tests, follow-up..." className="w-full rounded-xl border-2 border-purple-200 bg-purple-50 dark:bg-purple-950/30 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-purple-500 resize-none" />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <input value={form.provisionalDiagnosis} onChange={(e) => setForm({ ...form, provisionalDiagnosis: e.target.value })} placeholder="Provisional diagnosis" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
        <input value={form.finalDiagnosis} onChange={(e) => setForm({ ...form, finalDiagnosis: e.target.value })} placeholder="Final diagnosis" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
      </div>

      <input value={form.icd10Codes} onChange={(e) => setForm({ ...form, icd10Codes: e.target.value })} placeholder="ICD-10 codes (e.g. J06.9, I10, comma separated)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-blue-500" />

      <textarea rows={2} value={form.advice} onChange={(e) => setForm({ ...form, advice: e.target.value })} placeholder="General advice..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />
      <textarea rows={2} value={form.dietaryAdvice} onChange={(e) => setForm({ ...form, dietaryAdvice: e.target.value })} placeholder="Dietary advice..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />

      <div className="grid sm:grid-cols-2 gap-3">
        <input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
        <input value={form.referredTo} onChange={(e) => setForm({ ...form, referredTo: e.target.value })} placeholder="Referred to (specialist)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
      </div>

      <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} className="bg-gradient-to-r from-emerald-600 to-green-700">
        <Save className="h-4 w-4" />
        Save Encounter
      </Button>
    </div>
  );
}

// ─── Prescription Panel ───
function PrescriptionPanel({ appointmentId, encounter }: any) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<any[]>([]);
  const [generalInstructions, setGeneralInstructions] = useState('');

  const addItem = () => setItems([...items, { drugName: '', strength: '', form: 'Tablet', dose: '', frequency: '', route: 'Oral', durationDays: '', afterMeal: true, beforeMeal: false, atBedtime: false, emptyStomach: false, instructions: '' }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, patch: any) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!encounter?.id) throw new Error('Please save Encounter first');
      return prescriptionsApi.create({
        encounterId: encounter.id,
        generalInstructions,
        items: items.filter((it) => it.drugName.trim()),
      });
    },
    onSuccess: () => { toast.success('Prescription created'); queryClient.invalidateQueries({ queryKey: ['clinic-appointment'] }); setItems([]); setGeneralInstructions(''); },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed'),
  });

  return (
    <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold flex items-center gap-2">
          <Pill className="h-4 w-4 text-cyan-600" />
          Prescription
        </h3>
        <Button size="sm" onClick={addItem} className="bg-gradient-to-r from-cyan-600 to-blue-700">
          <Plus className="h-3.5 w-3.5" />
          Add Drug
        </Button>
      </div>

      {!encounter?.id && (
        <div className="rounded-lg bg-amber-50 border-2 border-amber-200 p-3 text-xs font-bold text-amber-800">
          ⚠️ Please save SOAP Notes tab first before creating a prescription.
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
          <Pill className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-extrabold text-slate-700">No drugs added</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold text-slate-600">Drug #{i + 1}</span>
                <button onClick={() => removeItem(i)} className="h-6 w-6 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              <div className="grid sm:grid-cols-3 gap-2">
                <input value={item.drugName} onChange={(e) => updateItem(i, { drugName: e.target.value })} placeholder="Drug name *" className="h-10 rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
                <input value={item.strength} onChange={(e) => updateItem(i, { strength: e.target.value })} placeholder="Strength (500mg)" className="h-10 rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
                <select value={item.form} onChange={(e) => updateItem(i, { form: e.target.value })} className="h-10 rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
                  <option>Tablet</option><option>Capsule</option><option>Syrup</option><option>Injection</option>
                  <option>Drops</option><option>Cream</option><option>Ointment</option><option>Inhaler</option>
                </select>
              </div>

              <div className="grid sm:grid-cols-4 gap-2">
                <input value={item.dose} onChange={(e) => updateItem(i, { dose: e.target.value })} placeholder="Dose (1)" className="h-10 rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
                <input value={item.frequency} onChange={(e) => updateItem(i, { frequency: e.target.value })} placeholder="Freq (TDS/BD)" className="h-10 rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
                <input value={item.route} onChange={(e) => updateItem(i, { route: e.target.value })} placeholder="Route (Oral)" className="h-10 rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
                <input type="number" value={item.durationDays} onChange={(e) => updateItem(i, { durationDays: e.target.value })} placeholder="Duration (days)" className="h-10 rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-cyan-500" />
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'beforeMeal', label: 'Before Meal' },
                  { key: 'afterMeal', label: 'After Meal' },
                  { key: 'emptyStomach', label: 'Empty Stomach' },
                  { key: 'atBedtime', label: 'At Bedtime' },
                ].map((m) => (
                  <label key={m.key} className={
                    'flex items-center gap-1 px-2 py-1 rounded-lg border-2 cursor-pointer text-xs font-extrabold ' +
                    (item[m.key] ? 'border-cyan-500 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-600')
                  }>
                    <input type="checkbox" checked={item[m.key]} onChange={(e) => updateItem(i, { [m.key]: e.target.checked })} className="h-3 w-3 rounded" />
                    {m.label}
                  </label>
                ))}
              </div>

              <input value={item.instructions} onChange={(e) => updateItem(i, { instructions: e.target.value })} placeholder="Additional instructions..." className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
            </div>
          ))}
        </div>
      )}

      <textarea rows={2} value={generalInstructions} onChange={(e) => setGeneralInstructions(e.target.value)} placeholder="General instructions..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-cyan-500 resize-none" />

      <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={items.length === 0 || !encounter?.id} className="bg-gradient-to-r from-cyan-600 to-blue-700">
        <Save className="h-4 w-4" />
        Create Prescription
      </Button>

      {encounter?.prescriptions?.length > 0 && (
        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-sm font-extrabold mb-2">Existing Prescriptions ({encounter.prescriptions.length})</h4>
          <div className="space-y-2">
            {encounter.prescriptions.map((rx: any) => (
              <div key={rx.id} className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-extrabold text-xs">{rx.prescriptionNumber}</span>
                  <span className="text-[10px] font-bold text-slate-500">{format(new Date(rx.issuedAt), 'dd MMM')}</span>
                </div>
                <div className="space-y-1">
                  {rx.items?.map((it: any) => (
                    <div key={it.id} className="text-xs font-bold text-slate-700">
                      • {it.drugName} {it.strength} — {it.dose} • {it.frequency} • {it.durationDays}d
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lab Orders Panel ───
function LabOrdersPanel({ appointmentId, encounter, patientId, doctorId }: any) {
  const queryClient = useQueryClient();
  const [tests, setTests] = useState<any[]>([]);
  const [labName, setLabName] = useState('');
  const [urgency, setUrgency] = useState('ROUTINE');
  const [notes, setNotes] = useState('');

  const addTest = () => setTests([...tests, { testName: '', category: 'HEMATOLOGY', price: 0 }]);
  const removeTest = (i: number) => setTests(tests.filter((_, idx) => idx !== i));
  const updateTest = (i: number, patch: any) => setTests(tests.map((t, idx) => idx === i ? { ...t, ...patch } : t));

  const saveMutation = useMutation({
    mutationFn: () => labOrdersApi.create({
      encounterId: encounter?.id,
      patientId,
      doctorId,
      labName,
      urgency,
      notes,
      tests: tests.filter((t) => t.testName.trim()),
    }),
    onSuccess: () => { toast.success('Lab order created'); queryClient.invalidateQueries({ queryKey: ['clinic-appointment'] }); setTests([]); setNotes(''); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const totalCost = tests.reduce((s, t) => s + (Number(t.price) || 0), 0);

  return (
    <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold flex items-center gap-2">
          <TestTube className="h-4 w-4 text-violet-600" />
          Lab Orders
        </h3>
        <Button size="sm" onClick={addTest} className="bg-gradient-to-r from-violet-600 to-purple-700">
          <Plus className="h-3.5 w-3.5" />
          Add Test
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <input value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="Lab name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
        <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
          <option value="ROUTINE">Routine</option>
          <option value="URGENT">Urgent</option>
          <option value="STAT">STAT (Immediate)</option>
        </select>
      </div>

      {tests.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
          <TestTube className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-extrabold text-slate-700">No tests added</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tests.map((test, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50/50 p-3">
              <div className="grid sm:grid-cols-6 gap-2">
                <input value={test.testName} onChange={(e) => updateTest(i, { testName: e.target.value })} placeholder="Test name" className="sm:col-span-3 h-10 rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
                <select value={test.category} onChange={(e) => updateTest(i, { category: e.target.value })} className="sm:col-span-2 h-10 rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
                  <option>HEMATOLOGY</option><option>BIOCHEMISTRY</option><option>MICROBIOLOGY</option>
                  <option>SEROLOGY</option><option>URINE</option><option>STOOL</option>
                  <option>RADIOLOGY</option><option>ULTRASOUND</option><option>ECG</option><option>OTHER</option>
                </select>
                <div className="flex gap-1">
                  <input type="number" step="0.01" value={test.price} onChange={(e) => updateTest(i, { price: e.target.value })} placeholder="Price" className="h-10 flex-1 rounded-lg border-2 border-emerald-300 bg-emerald-50 px-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
                  <button onClick={() => removeTest(i)} className="h-10 w-10 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-lg bg-emerald-50 border-2 border-emerald-200 p-2 text-right">
            <span className="text-xs font-bold text-slate-600">Total: </span>
            <span className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(totalCost)}</span>
          </div>
        </div>
      )}

      <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />

      <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={tests.length === 0} className="bg-gradient-to-r from-violet-600 to-purple-700">
        <Save className="h-4 w-4" />
        Order Lab Tests
      </Button>

      {encounter?.labOrders?.length > 0 && (
        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-sm font-extrabold mb-2">Existing Lab Orders ({encounter.labOrders.length})</h4>
          <div className="space-y-2">
            {encounter.labOrders.map((lo: any) => (
              <div key={lo.id} className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-extrabold text-xs">{lo.orderNumber}</span>
                  <span className={
                    'px-2 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ' +
                    (lo.status === 'REPORTED' ? 'bg-emerald-600' : lo.status === 'COMPLETED' ? 'bg-blue-600' : 'bg-amber-500')
                  }>{lo.status}</span>
                </div>
                <div className="text-xs font-bold text-slate-700">
                  {lo.tests?.map((t: any) => t.testName).join(' • ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentModal({ apptId, remaining, onClose, onDone }: any) {
  const [amount, setAmount] = useState(remaining);
  const payMutation = useMutation({
    mutationFn: () => appointmentsApi.addPayment(apptId, amount),
    onSuccess: () => { toast.success('Payment recorded'); onDone(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
          <h3 className="font-extrabold">Add Payment</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Amount *</label>
            <input type="number" step="0.01" autoFocus value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700" onClick={() => payMutation.mutate()} loading={payMutation.isPending} disabled={amount <= 0}>
              <CheckCircle2 className="h-4 w-4" />
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
