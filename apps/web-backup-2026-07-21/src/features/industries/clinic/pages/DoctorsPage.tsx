import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCog, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  Award, Star, Clock, Phone, Calendar, DollarSign, Video, Home,
  Zap, CheckCircle2, User, GraduationCap, Languages, Stethoscope,
} from 'lucide-react';
import { doctorsApi, type Specialty, type Doctor } from '../api/doctors.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';

const SPECIALTIES: { value: Specialty; label: string; emoji: string; category: string }[] = [
  { value: 'GENERAL_PRACTITIONER', label: 'General Practitioner', emoji: '🩺', category: 'Primary' },
  { value: 'FAMILY_PHYSICIAN', label: 'Family Physician', emoji: '👨‍⚕️', category: 'Primary' },
  { value: 'INTERNAL_MEDICINE', label: 'Internal Medicine', emoji: '🫀', category: 'Primary' },
  { value: 'PEDIATRICIAN', label: 'Pediatrician', emoji: '👶', category: 'Primary' },
  { value: 'GYNECOLOGIST', label: 'Gynecologist', emoji: '🤰', category: 'Women' },
  { value: 'OBSTETRICIAN', label: 'Obstetrician', emoji: '🤱', category: 'Women' },
  { value: 'MIDWIFE', label: 'Midwife', emoji: '👩‍⚕️', category: 'Women' },
  { value: 'DENTIST', label: 'Dentist', emoji: '🦷', category: 'Dental' },
  { value: 'ORTHODONTIST', label: 'Orthodontist', emoji: '😬', category: 'Dental' },
  { value: 'DERMATOLOGIST', label: 'Dermatologist', emoji: '🧴', category: 'Specialist' },
  { value: 'CARDIOLOGIST', label: 'Cardiologist', emoji: '❤️', category: 'Specialist' },
  { value: 'NEUROLOGIST', label: 'Neurologist', emoji: '🧠', category: 'Specialist' },
  { value: 'PSYCHIATRIST', label: 'Psychiatrist', emoji: '🧘', category: 'Mental' },
  { value: 'PSYCHOLOGIST', label: 'Psychologist', emoji: '💭', category: 'Mental' },
  { value: 'ORTHOPEDIC', label: 'Orthopedic', emoji: '🦴', category: 'Specialist' },
  { value: 'ENT_SPECIALIST', label: 'ENT Specialist', emoji: '👂', category: 'Specialist' },
  { value: 'OPHTHALMOLOGIST', label: 'Eye Specialist', emoji: '👁️', category: 'Specialist' },
  { value: 'UROLOGIST', label: 'Urologist', emoji: '💧', category: 'Specialist' },
  { value: 'NEPHROLOGIST', label: 'Nephrologist', emoji: '🫘', category: 'Specialist' },
  { value: 'ENDOCRINOLOGIST', label: 'Endocrinologist', emoji: '🧬', category: 'Specialist' },
  { value: 'GASTROENTEROLOGIST', label: 'Gastroenterologist', emoji: '🫃', category: 'Specialist' },
  { value: 'PULMONOLOGIST', label: 'Pulmonologist', emoji: '🫁', category: 'Specialist' },
  { value: 'ONCOLOGIST', label: 'Oncologist', emoji: '🎗️', category: 'Specialist' },
  { value: 'RADIOLOGIST', label: 'Radiologist', emoji: '📷', category: 'Diagnostic' },
  { value: 'PATHOLOGIST', label: 'Pathologist', emoji: '🔬', category: 'Diagnostic' },
  { value: 'ANESTHESIOLOGIST', label: 'Anesthesiologist', emoji: '💉', category: 'Surgery' },
  { value: 'SURGEON', label: 'Surgeon', emoji: '🔪', category: 'Surgery' },
  { value: 'PLASTIC_SURGEON', label: 'Plastic Surgeon', emoji: '✨', category: 'Surgery' },
  { value: 'PHYSIOTHERAPIST', label: 'Physiotherapist', emoji: '💪', category: 'Therapy' },
  { value: 'NUTRITIONIST', label: 'Nutritionist', emoji: '🥗', category: 'Wellness' },
  { value: 'DIETITIAN', label: 'Dietitian', emoji: '🍎', category: 'Wellness' },
  { value: 'HOMEOPATH', label: 'Homeopath', emoji: '🌿', category: 'Alternative' },
  { value: 'HAKEEM', label: 'Hakeem', emoji: '📜', category: 'Alternative' },
  { value: 'AYURVEDIC', label: 'Ayurvedic', emoji: '🕉️', category: 'Alternative' },
  { value: 'ACUPUNCTURIST', label: 'Acupuncturist', emoji: '📌', category: 'Alternative' },
  { value: 'VETERINARY', label: 'Veterinary', emoji: '🐾', category: 'Vet' },
  { value: 'NURSE_PRACTITIONER', label: 'Nurse Practitioner', emoji: '👩‍⚕️', category: 'Support' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DoctorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);

  const { data: doctors = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['clinic-doctors', specialtyFilter, search],
    queryFn: () => doctorsApi.list({
      specialty: specialtyFilter === 'all' ? undefined : specialtyFilter,
      search: search.trim() || undefined,
      active: true,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => doctorsApi.remove(id),
    onSuccess: () => { toast.success('Doctor deactivated'); queryClient.invalidateQueries({ queryKey: ['clinic-doctors'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Stethoscope className="h-3.5 w-3.5 text-amber-300" />
              Medical Team
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👨‍⚕️ Doctors</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">37 specialties, license tracking, consultation fees</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Add Doctor
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search doctor name, PMC #..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setSpecialtyFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (specialtyFilter === 'all' ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Specialties</button>
          {SPECIALTIES.slice(0, 15).map((s) => (
            <button key={s.value} onClick={() => setSpecialtyFilter(s.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (specialtyFilter === s.value ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s.emoji} {s.label}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <DoctorForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['clinic-doctors'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-72 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : doctors.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <UserCog className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No doctors yet</p>
          <Button className="mt-4 bg-gradient-to-r from-blue-600 to-cyan-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Add First Doctor
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onEdit={() => { setEditing(doctor); setShowForm(true); }}
              onDelete={() => { if (confirm('Deactivate ' + doctor.fullName + '?')) removeMutation.mutate(doctor.id); }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function DoctorCard({ doctor, onEdit, onDelete }: any) {
  const primary = SPECIALTIES.find((s) => s.value === doctor.specialties?.[0]);

  return (
    <div className={
      'group rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl transition-all overflow-hidden ' +
      (doctor.isFeatured ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className="relative p-4 bg-gradient-to-br from-blue-500 via-cyan-600 to-teal-600 text-white">
        <div className="flex items-start gap-3">
          {doctor.photoUrl ? (
            <img src={doctor.photoUrl} alt="" className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white/30 shrink-0" />
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-extrabold shrink-0 ring-4 ring-white/30">
              {doctor.fullName?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white/80">{doctor.title || 'Dr.'}</div>
            <h3 className="text-lg font-extrabold truncate">{doctor.fullName}</h3>
            <div className="mt-1 flex items-center gap-1 text-xs font-extrabold">
              <span>{primary?.emoji}</span>
              <span className="truncate">{primary?.label}</span>
            </div>
            {doctor.subSpecialty && (
              <div className="text-[10px] font-bold text-white/70 truncate">{doctor.subSpecialty}</div>
            )}
          </div>
        </div>
        {doctor.isFeatured && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
            <Star className="h-2 w-2 fill-current" /> Featured
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {doctor.qualifications?.length > 0 && (
          <div className="flex items-start gap-1 text-xs">
            <GraduationCap className="h-3 w-3 text-blue-600 mt-0.5 shrink-0" />
            <span className="font-bold text-slate-700 line-clamp-1">
              {doctor.qualifications.join(', ')}
            </span>
          </div>
        )}

        {doctor.yearsOfExperience && (
          <div className="text-xs font-extrabold text-slate-600 inline-flex items-center gap-1">
            <Award className="h-3 w-3" />
            {doctor.yearsOfExperience} years experience
          </div>
        )}

        {doctor.pmcNumber && (
          <div className="text-[10px] font-mono font-bold text-emerald-700 inline-flex items-center gap-1">
            <CheckCircle2 className="h-2.5 w-2.5" />
            PMC: {doctor.pmcNumber}
          </div>
        )}

        {doctor.languages?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {doctor.languages.slice(0, 3).map((l: string, i: number) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-[9px] font-extrabold text-slate-700">
                {l}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {doctor.acceptsTelemedicine && (
            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
              <Video className="h-2 w-2" /> TELE
            </span>
          )}
          {doctor.acceptsHomeVisit && (
            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
              <Home className="h-2 w-2" /> HOME
            </span>
          )}
          {doctor.acceptsEmergency && (
            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
              <Zap className="h-2 w-2" /> EMERGENCY
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs">
          <div className="text-center">
            <div className="text-[9px] uppercase font-extrabold text-slate-500">Patients</div>
            <div className="font-extrabold tabular-nums">{doctor.totalPatients}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] uppercase font-extrabold text-emerald-700">Fee</div>
            <div className="font-extrabold text-emerald-700 tabular-nums text-[10px]">{formatPKR(doctor.consultationFee).replace('Rs', '').trim()}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] uppercase font-extrabold text-amber-700 inline-flex items-center justify-center gap-0.5">
              <Star className="h-2 w-2 fill-current" />
              Rating
            </div>
            <div className="font-extrabold text-amber-700 tabular-nums">
              {doctor.avgRating ? doctor.avgRating.toFixed(1) : '—'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold">
          <Clock className="h-3 w-3" />
          {doctor.workStartTime}–{doctor.workEndTime}
          <span className="ml-auto">
            <Calendar className="h-3 w-3 inline mr-0.5" />
            {doctor.workingDays.length}d/week
          </span>
        </div>

        <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <button onClick={onEdit} className="flex-1 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/40 hover:bg-blue-200 text-blue-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
            <Edit3 className="h-3 w-3" />
            Edit
          </button>
          <button onClick={onDelete} className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DoctorForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    staffId: editing?.staffId ?? '',
    title: editing?.title ?? 'Dr.',
    fullName: editing?.fullName ?? '',
    qualifications: editing?.qualifications?.join(', ') ?? '',
    specialties: editing?.specialties ?? ['GENERAL_PRACTITIONER'],
    subSpecialty: editing?.subSpecialty ?? '',
    yearsOfExperience: editing?.yearsOfExperience ?? '',
    bio: editing?.bio ?? '',
    photoUrl: editing?.photoUrl ?? '',
    signatureUrl: editing?.signatureUrl ?? '',
    pmcNumber: editing?.pmcNumber ?? '',
    licenseNumber: editing?.licenseNumber ?? '',
    licenseExpiry: editing?.licenseExpiry ? editing.licenseExpiry.slice(0, 10) : '',
    registeredWith: editing?.registeredWith ?? 'PMC',
    consultationFee: editing?.consultationFee ?? 1000,
    followUpFee: editing?.followUpFee ?? 500,
    followUpDays: editing?.followUpDays ?? 7,
    telemedicineFee: editing?.telemedicineFee ?? '',
    homeVisitFee: editing?.homeVisitFee ?? '',
    emergencyFee: editing?.emergencyFee ?? '',
    slotDurationMin: editing?.slotDurationMin ?? 15,
    bufferMin: editing?.bufferMin ?? 0,
    maxDailyPatients: editing?.maxDailyPatients ?? '',
    workingDays: editing?.workingDays ?? [1, 2, 3, 4, 5, 6],
    workStartTime: editing?.workStartTime ?? '09:00',
    workEndTime: editing?.workEndTime ?? '21:00',
    breakStartTime: editing?.breakStartTime ?? '',
    breakEndTime: editing?.breakEndTime ?? '',
    languages: editing?.languages?.join(', ') ?? 'English, Urdu',
    services: editing?.services?.join(', ') ?? '',
    acceptsTelemedicine: editing?.acceptsTelemedicine ?? false,
    acceptsHomeVisit: editing?.acceptsHomeVisit ?? false,
    acceptsEmergency: editing?.acceptsEmergency ?? false,
    isFeatured: editing?.isFeatured ?? false,
  });

  const { data: staffList } = useQuery({
    queryKey: ['staff-for-clinic'],
    queryFn: () => apiClient.get('/staff?isActive=true&limit=200').then((r) => r.data?.data?.items ?? r.data?.items ?? r.data ?? []),
    enabled: !editing,
  });

  const saveMutation = useMutation({
    mutationFn: () => doctorsApi.upsert({
      ...form,
      qualifications: form.qualifications ? form.qualifications.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      languages: form.languages ? form.languages.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      services: form.services ? form.services.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : undefined,
      consultationFee: Number(form.consultationFee) || 0,
      followUpFee: Number(form.followUpFee) || 0,
      followUpDays: Number(form.followUpDays) || 7,
      telemedicineFee: form.telemedicineFee ? Number(form.telemedicineFee) : undefined,
      homeVisitFee: form.homeVisitFee ? Number(form.homeVisitFee) : undefined,
      emergencyFee: form.emergencyFee ? Number(form.emergencyFee) : undefined,
      slotDurationMin: Number(form.slotDurationMin) || 15,
      bufferMin: Number(form.bufferMin) || 0,
      maxDailyPatients: form.maxDailyPatients ? Number(form.maxDailyPatients) : undefined,
    }),
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Doctor added'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const toggleSpecialty = (s: Specialty) => {
    const set = new Set(form.specialties);
    if (set.has(s)) set.delete(s); else set.add(s);
    setForm({ ...form, specialties: Array.from(set) });
  };

  const toggleDay = (d: number) => {
    const set = new Set(form.workingDays);
    if (set.has(d)) set.delete(d); else set.add(d);
    setForm({ ...form, workingDays: Array.from(set).sort() });
  };

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-blue-300 dark:border-blue-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">{editing ? 'Edit Doctor Profile' : 'New Doctor Profile'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {!editing && (
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Select Staff *</label>
            <select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              <option value="">-- Pick from HR/Staff --</option>
              {(staffList ?? []).map((s: any) => {
                const nm = ((s.firstName || '') + ' ' + (s.lastName || '')).trim() || s.name || s.staffNumber;
                return <option key={s.id} value={s.id}>{nm}</option>;
              })}
            </select>
          </div>
        )}

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Photo</label>
          {form.photoUrl ? (
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-slate-200">
              <img src={form.photoUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setForm({ ...form, photoUrl: '' })} className="absolute top-1 right-1 h-6 w-6 rounded bg-rose-600 text-white flex items-center justify-center">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <UploadDropzone onUploaded={(records) => {
              const first = Array.isArray(records) ? records[0] : records;
              const url = typeof first === 'string' ? first : (first as any)?.url;
              if (url) setForm({ ...form, photoUrl: url });
            }} />
          )}
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          <select value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
            <option>Dr.</option><option>Prof.</option><option>Prof. Dr.</option><option>Assoc. Prof.</option>
          </select>
          <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Full name *" className="sm:col-span-2 h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <input type="number" value={form.yearsOfExperience} onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value })} placeholder="Years exp." className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500" />
        </div>

        <input value={form.qualifications} onChange={(e) => setForm({ ...form, qualifications: e.target.value })} placeholder="Qualifications (MBBS, FCPS, MD... comma separated)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />

        {/* Specialties */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Specialties * ({form.specialties.length} selected)</label>
          <div className="max-h-52 overflow-y-auto rounded-xl border-2 border-slate-200 dark:border-neutral-700 p-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
            {SPECIALTIES.map((s) => (
              <button key={s.value} onClick={() => toggleSpecialty(s.value)} className={
                'p-2 rounded-lg border-2 text-xs font-extrabold text-left transition ' +
                (form.specialties.includes(s.value) ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-blue-300')
              }>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>

        <input value={form.subSpecialty} onChange={(e) => setForm({ ...form, subSpecialty: e.target.value })} placeholder="Sub-specialty (e.g. Pediatric Cardiology)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />

        <textarea rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio / About..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />

        {/* License */}
        <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-2">
          <div className="text-sm font-extrabold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            License / Registration
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={form.pmcNumber} onChange={(e) => setForm({ ...form, pmcNumber: e.target.value })} placeholder="PMC #" className="h-10 rounded-lg border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
            <input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} placeholder="License #" className="h-10 rounded-lg border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
            <input value={form.registeredWith} onChange={(e) => setForm({ ...form, registeredWith: e.target.value })} placeholder="Registered with (PMC, PMDC, PDA...)" className="h-10 rounded-lg border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            <input type="date" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} className="h-10 rounded-lg border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        {/* Fees */}
        <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Consultation Fees
          </div>
          <div className="grid sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-0.5 block">First Visit</label>
              <input type="number" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} className="h-11 w-full rounded-lg border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-0.5 block">Follow-up</label>
              <input type="number" value={form.followUpFee} onChange={(e) => setForm({ ...form, followUpFee: e.target.value })} className="h-11 w-full rounded-lg border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-0.5 block">F-up Days</label>
              <input type="number" value={form.followUpDays} onChange={(e) => setForm({ ...form, followUpDays: e.target.value })} className="h-11 w-full rounded-lg border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-purple-700 mb-0.5 block">Telemedicine</label>
              <input type="number" value={form.telemedicineFee} onChange={(e) => setForm({ ...form, telemedicineFee: e.target.value })} className="h-11 w-full rounded-lg border-2 border-purple-300 bg-white dark:bg-purple-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-0.5 block">Home Visit</label>
              <input type="number" value={form.homeVisitFee} onChange={(e) => setForm({ ...form, homeVisitFee: e.target.value })} className="h-11 w-full rounded-lg border-2 border-blue-300 bg-white dark:bg-blue-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-red-700 mb-0.5 block">Emergency</label>
              <input type="number" value={form.emergencyFee} onChange={(e) => setForm({ ...form, emergencyFee: e.target.value })} className="h-11 w-full rounded-lg border-2 border-red-300 bg-white dark:bg-red-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-red-500" />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="rounded-xl border-2 border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-cyan-900 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Schedule
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-cyan-700 mb-1 block">Working Days</label>
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((d, i) => (
                <button key={d} onClick={() => toggleDay(i)} className={
                  'py-2 rounded-lg text-xs font-extrabold transition ' +
                  (form.workingDays.includes(i) ? 'bg-cyan-600 text-white shadow' : 'bg-white dark:bg-neutral-800 border border-slate-200 text-slate-600 hover:border-cyan-300')
                }>{d}</button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <input type="time" value={form.workStartTime} onChange={(e) => setForm({ ...form, workStartTime: e.target.value })} className="h-11 rounded-xl border-2 border-cyan-300 bg-white dark:bg-cyan-950/40 px-3 text-sm font-extrabold focus:outline-none focus:border-cyan-500" />
            <input type="time" value={form.workEndTime} onChange={(e) => setForm({ ...form, workEndTime: e.target.value })} className="h-11 rounded-xl border-2 border-cyan-300 bg-white dark:bg-cyan-950/40 px-3 text-sm font-extrabold focus:outline-none focus:border-cyan-500" />
            <input type="number" value={form.slotDurationMin} onChange={(e) => setForm({ ...form, slotDurationMin: e.target.value })} placeholder="Slot duration (min)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-cyan-500" />
            <input type="number" value={form.maxDailyPatients} onChange={(e) => setForm({ ...form, maxDailyPatients: e.target.value })} placeholder="Max daily patients" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-cyan-500" />
          </div>
        </div>

        <input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="Languages (comma separated)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />

        {/* Services */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.acceptsTelemedicine ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40' : 'border-slate-200 dark:border-neutral-700')}>
            <input type="checkbox" checked={form.acceptsTelemedicine} onChange={(e) => setForm({ ...form, acceptsTelemedicine: e.target.checked })} className="h-4 w-4 rounded" />
            <Video className={'h-4 w-4 ' + (form.acceptsTelemedicine ? 'text-purple-600' : 'text-slate-400')} />
            <span className="text-xs font-extrabold">Telemedicine</span>
          </label>
          <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.acceptsHomeVisit ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40' : 'border-slate-200 dark:border-neutral-700')}>
            <input type="checkbox" checked={form.acceptsHomeVisit} onChange={(e) => setForm({ ...form, acceptsHomeVisit: e.target.checked })} className="h-4 w-4 rounded" />
            <Home className={'h-4 w-4 ' + (form.acceptsHomeVisit ? 'text-blue-600' : 'text-slate-400')} />
            <span className="text-xs font-extrabold">Home Visit</span>
          </label>
          <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.acceptsEmergency ? 'border-red-500 bg-red-50 dark:bg-red-950/40' : 'border-slate-200 dark:border-neutral-700')}>
            <input type="checkbox" checked={form.acceptsEmergency} onChange={(e) => setForm({ ...form, acceptsEmergency: e.target.checked })} className="h-4 w-4 rounded" />
            <Zap className={'h-4 w-4 ' + (form.acceptsEmergency ? 'text-red-600' : 'text-slate-400')} />
            <span className="text-xs font-extrabold">Emergency</span>
          </label>
          <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.isFeatured ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'border-slate-200 dark:border-neutral-700')}>
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="h-4 w-4 rounded" />
            <Star className={'h-4 w-4 ' + (form.isFeatured ? 'text-amber-500 fill-amber-500' : 'text-slate-400')} />
            <span className="text-xs font-extrabold">Featured</span>
          </label>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.staffId && !editing}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Create Doctor'}
          </Button>
        </div>
      </div>
    </section>
  );
}
