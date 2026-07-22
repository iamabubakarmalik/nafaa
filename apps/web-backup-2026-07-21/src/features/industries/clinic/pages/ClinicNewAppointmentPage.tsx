import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Save, User, Phone, Search, Sparkles, Calendar, X,
  Clock, Video, Home, Zap, UserCog, AlertCircle,
} from 'lucide-react';
import { appointmentsApi } from '../api/appointments.api';
import { doctorsApi } from '../api/doctors.api';
import { patientsApi } from '../api/patients.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import { format, addMinutes } from 'date-fns';

const VISIT_TYPES = [
  { value: 'FIRST_VISIT', label: 'First Visit', emoji: '🆕' },
  { value: 'FOLLOW_UP', label: 'Follow-up', emoji: '🔄' },
  { value: 'CONSULTATION', label: 'Consultation', emoji: '💬' },
  { value: 'ROUTINE_CHECKUP', label: 'Routine Checkup', emoji: '✅' },
  { value: 'VACCINATION', label: 'Vaccination', emoji: '💉' },
  { value: 'PROCEDURE', label: 'Procedure', emoji: '🩹' },
  { value: 'DENTAL_CHECKUP', label: 'Dental', emoji: '🦷' },
  { value: 'ANTENATAL', label: 'Antenatal', emoji: '🤰' },
  { value: 'POSTNATAL', label: 'Postnatal', emoji: '🤱' },
  { value: 'PHYSIO_SESSION', label: 'Physio', emoji: '💪' },
  { value: 'COUNSELING', label: 'Counseling', emoji: '🧘' },
];

export default function NewAppointmentPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<any>({
    patientId: '',
    doctorId: '',
    visitType: 'FIRST_VISIT',
    isTelemedicine: false,
    isHomeVisit: false,
    isEmergency: false,
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '',
    chiefComplaint: '',
    reasonForVisit: '',
    patientNotes: '',
    otherCharges: 0,
    discount: 0,
    taxAmount: 0,
  });

  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  const { data: patientsData } = useQuery({
    queryKey: ['patients-for-appointment', patientSearch],
    queryFn: () => patientsApi.list({ search: patientSearch || undefined }),
    enabled: showPatientPicker,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors-for-appointment'],
    queryFn: () => doctorsApi.list({ active: true }),
  });

  // Auto-calculate consultation fee
  let consultationFee = 0;
  if (selectedDoctor) {
    consultationFee = selectedDoctor.consultationFee;
    if (form.visitType === 'FOLLOW_UP' && selectedDoctor.followUpFee) consultationFee = selectedDoctor.followUpFee;
    if (form.isTelemedicine && selectedDoctor.telemedicineFee) consultationFee = selectedDoctor.telemedicineFee;
    if (form.isHomeVisit && selectedDoctor.homeVisitFee) consultationFee = selectedDoctor.homeVisitFee;
    if (form.isEmergency && selectedDoctor.emergencyFee) consultationFee = selectedDoctor.emergencyFee;
  }
  const total = Math.max(consultationFee + Number(form.otherCharges) + Number(form.taxAmount) - Number(form.discount), 0);

  const scheduledStart = form.scheduledDate && form.scheduledTime ? new Date(form.scheduledDate + 'T' + form.scheduledTime) : null;
  const scheduledEnd = scheduledStart && selectedDoctor ? addMinutes(scheduledStart, selectedDoctor.slotDurationMin || 15) : null;

  const createMutation = useMutation({
    mutationFn: () => appointmentsApi.create({
      patientId: form.patientId,
      doctorId: form.doctorId,
      visitType: form.visitType,
      isTelemedicine: form.isTelemedicine,
      isHomeVisit: form.isHomeVisit,
      isEmergency: form.isEmergency,
      scheduledStart: scheduledStart?.toISOString(),
      scheduledEnd: scheduledEnd?.toISOString(),
      chiefComplaint: form.chiefComplaint,
      reasonForVisit: form.reasonForVisit,
      patientNotes: form.patientNotes,
      otherCharges: Number(form.otherCharges) || 0,
      discount: Number(form.discount) || 0,
      taxAmount: Number(form.taxAmount) || 0,
    }),
    onSuccess: (apt) => {
      toast.success('Appointment ' + apt.appointmentNumber + ' booked!');
      navigate('/clinic/appointments/' + apt.id);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const canSubmit = form.patientId && form.doctorId && form.scheduledDate && form.scheduledTime;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/clinic/appointments')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                New Booking
              </div>
              <h1 className="mt-1 text-2xl font-extrabold">📅 New Appointment</h1>
            </div>
          </div>
          <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} className="bg-white text-slate-900 hover:bg-slate-100">
            <Save className="h-4 w-4" />
            Book Appointment
          </Button>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* Patient */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-fuchsia-600" />
              Patient *
            </h3>
            {selectedPatient ? (
              <div className="rounded-xl bg-fuchsia-50 dark:bg-fuchsia-950/30 border-2 border-fuchsia-200 p-3 flex items-center gap-3">
                <User className="h-5 w-5 text-fuchsia-600" />
                <div className="flex-1">
                  <div className="font-extrabold">{selectedPatient.fullName}</div>
                  <div className="text-xs text-slate-600 font-bold">{selectedPatient.mrn} • {selectedPatient.phonePrimary}</div>
                  {selectedPatient.allergies?.length > 0 && (
                    <div className="mt-1 text-xs font-extrabold text-rose-700 inline-flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Allergies: {selectedPatient.allergies.slice(0, 3).join(', ')}
                    </div>
                  )}
                </div>
                <button onClick={() => { setSelectedPatient(null); setForm({ ...form, patientId: '' }); }} className="text-xs font-extrabold text-fuchsia-600 hover:underline">Change</button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowPatientPicker(!showPatientPicker)} className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-extrabold text-slate-600 hover:border-fuchsia-400">
                  <Search className="h-4 w-4 inline mr-1" />
                  Search Patient
                </button>
                {showPatientPicker && (
                  <div className="rounded-xl border-2 border-fuchsia-300 bg-fuchsia-50/50 p-3 space-y-2">
                    <input autoFocus value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Search MRN/name/phone/CNIC..." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
                    <div className="max-h-52 overflow-y-auto space-y-1">
                      {(patientsData ?? []).map((p) => (
                        <button key={p.id} onClick={() => { setSelectedPatient(p); setForm({ ...form, patientId: p.id }); setShowPatientPicker(false); setPatientSearch(''); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white text-left">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-extrabold truncate">{p.fullName}</div>
                            <div className="text-[10px] font-mono font-bold text-blue-600">{p.mrn}</div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold">{p.phonePrimary}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Doctor */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCog className="h-4 w-4 text-blue-600" />
              Doctor *
            </h3>
            <select value={form.doctorId} onChange={(e) => {
              const doc = doctors.find((d) => d.id === e.target.value);
              setSelectedDoctor(doc);
              setForm({ ...form, doctorId: e.target.value });
            }} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              <option value="">-- Select Doctor --</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} {d.fullName} • {d.specialties[0]?.replace(/_/g, ' ')} • {formatPKR(d.consultationFee)}
                </option>
              ))}
            </select>

            {selectedDoctor && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 p-3">
                <div className="text-xs font-bold text-blue-700">
                  🕒 Working: {selectedDoctor.workStartTime}–{selectedDoctor.workEndTime} • Slot: {selectedDoctor.slotDurationMin} min
                </div>
                <div className="text-xs font-bold text-blue-700 mt-1">
                  💰 First Visit: {formatPKR(selectedDoctor.consultationFee)} • Follow-up: {formatPKR(selectedDoctor.followUpFee)}
                </div>
              </div>
            )}
          </section>

          {/* Visit Type */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-fuchsia-600" />
              Visit Type
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {VISIT_TYPES.map((v) => (
                <button key={v.value} onClick={() => setForm({ ...form, visitType: v.value })} className={
                  'p-2 rounded-xl border-2 text-xs font-extrabold transition ' +
                  (form.visitType === v.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-blue-300')
                }>
                  <div className="text-lg">{v.emoji}</div>
                  <div className="text-[10px] mt-0.5">{v.label}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
              <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.isTelemedicine ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40' : 'border-slate-200 dark:border-neutral-700')}>
                <input type="checkbox" checked={form.isTelemedicine} onChange={(e) => setForm({ ...form, isTelemedicine: e.target.checked })} className="h-4 w-4 rounded" />
                <Video className={'h-4 w-4 ' + (form.isTelemedicine ? 'text-purple-600' : 'text-slate-400')} />
                <span className="text-xs font-extrabold">Video</span>
              </label>
              <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.isHomeVisit ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40' : 'border-slate-200 dark:border-neutral-700')}>
                <input type="checkbox" checked={form.isHomeVisit} onChange={(e) => setForm({ ...form, isHomeVisit: e.target.checked })} className="h-4 w-4 rounded" />
                <Home className={'h-4 w-4 ' + (form.isHomeVisit ? 'text-blue-600' : 'text-slate-400')} />
                <span className="text-xs font-extrabold">Home</span>
              </label>
              <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.isEmergency ? 'border-red-500 bg-red-50 dark:bg-red-950/40' : 'border-slate-200 dark:border-neutral-700')}>
                <input type="checkbox" checked={form.isEmergency} onChange={(e) => setForm({ ...form, isEmergency: e.target.checked })} className="h-4 w-4 rounded" />
                <Zap className={'h-4 w-4 ' + (form.isEmergency ? 'text-red-600' : 'text-slate-400')} />
                <span className="text-xs font-extrabold">Emergency</span>
              </label>
            </div>
          </section>

          {/* Date/Time */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-600" />
              Date & Time *
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} min={new Date().toISOString().split('T')[0]} className="h-11 rounded-xl border-2 border-cyan-300 bg-cyan-50 dark:bg-cyan-950/30 px-3 text-sm font-extrabold focus:outline-none focus:border-cyan-500" />
              <input type="time" value={form.scheduledTime} onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })} className="h-11 rounded-xl border-2 border-cyan-300 bg-cyan-50 dark:bg-cyan-950/30 px-3 text-sm font-extrabold focus:outline-none focus:border-cyan-500" />
            </div>
            {scheduledStart && scheduledEnd && (
              <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-3 text-center">
                <div className="text-xs font-bold text-slate-500">Appointment: {format(scheduledStart, 'HH:mm')} → {format(scheduledEnd, 'HH:mm')}</div>
              </div>
            )}
          </section>

          {/* Complaint */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white">Chief Complaint & Notes</h3>
            <input value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} placeholder="Chief complaint (main problem)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
            <textarea rows={2} value={form.reasonForVisit} onChange={(e) => setForm({ ...form, reasonForVisit: e.target.value })} placeholder="Reason for visit / symptoms..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />
            <textarea rows={2} value={form.patientNotes} onChange={(e) => setForm({ ...form, patientNotes: e.target.value })} placeholder="Additional patient notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-blue-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">💰 Fee Summary</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Consultation</span><span className="font-bold tabular-nums">{formatPKR(consultationFee)}</span></div>
                {form.isEmergency && <div className="flex justify-between text-red-300"><span>Emergency</span><span className="font-bold">Applied</span></div>}
                {form.isTelemedicine && <div className="flex justify-between text-purple-300"><span>Telemedicine</span><span className="font-bold">Applied</span></div>}
                {form.isHomeVisit && <div className="flex justify-between text-blue-300"><span>Home Visit</span><span className="font-bold">Applied</span></div>}
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Other Charges</label>
                  <input type="number" value={form.otherCharges} onChange={(e) => setForm({ ...form, otherCharges: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Tax</label>
                  <input type="number" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Discount</label>
                  <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
              </div>
            </div>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} size="lg" className="w-full bg-gradient-to-r from-blue-600 to-cyan-700">
              <Save className="h-5 w-5" />
              Book Appointment
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
