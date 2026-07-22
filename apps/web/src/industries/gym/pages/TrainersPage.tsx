import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dumbbell, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  Star, Clock, DollarSign, Award, Users, Calendar, Phone, User,
} from 'lucide-react';
import { trainersApi, type TrainerRole, type Trainer } from '../api/trainers.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';
import { apiClient } from '@core/api/client';

const ROLES: { value: TrainerRole; label: string; emoji: string }[] = [
  { value: 'HEAD_TRAINER', label: 'Head Trainer', emoji: '👑' },
  { value: 'PERSONAL_TRAINER', label: 'Personal Trainer', emoji: '💪' },
  { value: 'YOGA_INSTRUCTOR', label: 'Yoga', emoji: '🧘' },
  { value: 'ZUMBA_INSTRUCTOR', label: 'Zumba', emoji: '💃' },
  { value: 'CROSSFIT_COACH', label: 'CrossFit', emoji: '🏋️' },
  { value: 'CARDIO_COACH', label: 'Cardio', emoji: '🏃' },
  { value: 'STRENGTH_COACH', label: 'Strength', emoji: '⚡' },
  { value: 'NUTRITIONIST', label: 'Nutritionist', emoji: '🥗' },
  { value: 'PHYSIOTHERAPIST', label: 'Physio', emoji: '🩺' },
  { value: 'MMA_COACH', label: 'MMA', emoji: '🥊' },
  { value: 'BOXING_COACH', label: 'Boxing', emoji: '🥊' },
  { value: 'DANCE_INSTRUCTOR', label: 'Dance', emoji: '💃' },
  { value: 'OTHER', label: 'Other', emoji: '⭐' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TrainersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Trainer | null>(null);

  const { data: trainers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['gym-trainers', roleFilter, search],
    queryFn: () => trainersApi.list({
      role: roleFilter === 'all' ? undefined : roleFilter,
      search: search.trim() || undefined,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => trainersApi.remove(id),
    onSuccess: () => { toast.success('Trainer deactivated'); queryClient.invalidateQueries({ queryKey: ['gym-trainers'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Dumbbell className="h-3.5 w-3.5 text-amber-300" />
              Training Staff
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💪 Trainers</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Personal trainers, instructors, coaches</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Add Trainer
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search trainer..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-violet-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setRoleFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (roleFilter === 'all' ? 'bg-violet-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All</button>
          {ROLES.map((r) => (
            <button key={r.value} onClick={() => setRoleFilter(r.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (roleFilter === r.value ? 'bg-violet-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{r.emoji} {r.label}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <TrainerForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['gym-trainers'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-72 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : trainers.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Dumbbell className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No trainers yet</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainers.map((t) => (
            <TrainerCard
              key={t.id}
              trainer={t}
              onEdit={() => { setEditing(t); setShowForm(true); }}
              onDelete={() => { if (confirm('Deactivate trainer?')) removeMutation.mutate(t.id); }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function TrainerCard({ trainer, onEdit, onDelete }: any) {
  const role = ROLES.find((r) => r.value === trainer.role);
  const staffName = trainer.staff
    ? ((trainer.staff.firstName || '') + ' ' + (trainer.staff.lastName || '')).trim() || trainer.staff.name
    : 'Trainer';

  return (
    <div className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-xl transition p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {trainer.photoUrl ? (
            <img src={trainer.photoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-200" />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-2xl font-extrabold shadow">
              {staffName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={
            'absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-2 ring-white ' +
            (trainer.isAvailable ? 'bg-emerald-500' : 'bg-slate-400')
          } />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold truncate">{staffName}</div>
          <div className="flex items-center gap-1 text-xs text-violet-600 font-extrabold">
            <span>{role?.emoji}</span>
            <span>{role?.label}</span>
          </div>
          <div className="text-[10px] font-mono font-bold text-slate-500">{trainer.trainerNumber}</div>
          {trainer.experienceYears && (
            <div className="text-[10px] font-bold text-slate-500">{trainer.experienceYears} years exp</div>
          )}
        </div>
      </div>

      {trainer.specializations?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {trainer.specializations.slice(0, 3).map((s: string, i: number) => (
            <span key={i} className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/40 text-violet-700 text-[9px] font-extrabold uppercase">{s}</span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-slate-600 font-bold">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {trainer.workStartTime}–{trainer.workEndTime}
        </span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {trainer.workingDays.length}d/wk
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs">
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Clients</div>
          <div className="font-extrabold tabular-nums">{trainer.activeClients}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Sessions</div>
          <div className="font-extrabold tabular-nums">{trainer.totalSessions}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-amber-700 inline-flex items-center justify-center gap-0.5">
            <Star className="h-2 w-2 fill-current" /> Rating
          </div>
          <div className="font-extrabold text-amber-700 tabular-nums">
            {trainer.avgRating ? trainer.avgRating.toFixed(1) : '—'}
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 p-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-emerald-700 font-extrabold">Per Session</span>
          <span className="font-extrabold text-emerald-900 tabular-nums">{formatPKR(trainer.perSessionRate)}</span>
        </div>
        {trainer.commissionPct > 0 && (
          <div className="text-[10px] font-bold text-emerald-600 mt-0.5">
            Commission: {trainer.commissionPct}%
          </div>
        )}
      </div>

      <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
        <button onClick={onEdit} className="flex-1 h-9 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
          <Edit3 className="h-3 w-3" />
          Edit
        </button>
        <button onClick={onDelete} className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function TrainerForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    staffId: editing?.staffId ?? '',
    role: editing?.role ?? 'PERSONAL_TRAINER',
    specializations: editing?.specializations?.join(', ') ?? '',
    certifications: editing?.certifications?.join(', ') ?? '',
    experienceYears: editing?.experienceYears ?? '',
    bio: editing?.bio ?? '',
    photoUrl: editing?.photoUrl ?? '',
    hourlyRate: editing?.hourlyRate ?? 0,
    perSessionRate: editing?.perSessionRate ?? 0,
    monthlyPackageRate: editing?.monthlyPackageRate ?? 0,
    commissionPct: editing?.commissionPct ?? 0,
    commissionFixed: editing?.commissionFixed ?? 0,
    workingDays: editing?.workingDays ?? [1, 2, 3, 4, 5, 6],
    workStartTime: editing?.workStartTime ?? '06:00',
    workEndTime: editing?.workEndTime ?? '22:00',
    isAvailable: editing?.isAvailable ?? true,
    maxDailyClients: editing?.maxDailyClients ?? '',
    languages: editing?.languages?.join(', ') ?? '',
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-list-for-trainer'],
    queryFn: () => apiClient.get('/staff?isActive=true&limit=200').then((r) => r.data?.data?.items ?? r.data?.items ?? r.data ?? []),
    enabled: !editing,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        specializations: form.specializations ? form.specializations.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        certifications: form.certifications ? form.certifications.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        languages: form.languages ? form.languages.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
        hourlyRate: Number(form.hourlyRate) || 0,
        perSessionRate: Number(form.perSessionRate) || 0,
        monthlyPackageRate: Number(form.monthlyPackageRate) || 0,
        commissionPct: Number(form.commissionPct) || 0,
        commissionFixed: Number(form.commissionFixed) || 0,
        maxDailyClients: form.maxDailyClients ? Number(form.maxDailyClients) : undefined,
      };
      return editing ? trainersApi.update(editing.id, payload) : trainersApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Trainer added'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const toggleDay = (day: number) => {
    const days = form.workingDays.includes(day) ? form.workingDays.filter((d: number) => d !== day) : [...form.workingDays, day];
    setForm({ ...form, workingDays: days });
  };

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-violet-300 dark:border-violet-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-violet-50 dark:bg-violet-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Trainer' : 'New Trainer Profile'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {!editing && (
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Select Staff *</label>
            <select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
              <option value="">-- Pick from HR/Staff --</option>
              {(staffList ?? []).map((s: any) => {
                const nm = ((s.firstName || '') + ' ' + (s.lastName || '')).trim() || s.name || s.staffNumber;
                return <option key={s.id} value={s.id}>{nm} • {s.phone || ''}</option>;
              })}
            </select>
          </div>
        )}

        <div className="flex gap-4">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Photo</label>
            {form.photoUrl ? (
              <div className="relative h-24 w-24 rounded-2xl overflow-hidden border-2 border-slate-200">
                <img src={form.photoUrl} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setForm({ ...form, photoUrl: '' })} className="absolute top-1 right-1 h-6 w-6 rounded bg-rose-600 text-white flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="h-24 w-24">
                <UploadDropzone onUploaded={(records) => {
                  const first = Array.isArray(records) ? records[0] : records;
                  const url = typeof first === 'string' ? first : (first as any)?.url;
                  if (url) setForm({ ...form, photoUrl: url });
                }} />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>)}
            </select>
            <input type="number" step="0.1" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} placeholder="Experience (years)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-violet-500" />
          </div>
        </div>

        <input value={form.specializations} onChange={(e) => setForm({ ...form, specializations: e.target.value })} placeholder="Specializations (comma separated)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
        <input value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} placeholder="Certifications (ACE, NASM, ISSA...)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
        <input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="Languages (English, Urdu...)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />

        <textarea rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />

        {/* Rates */}
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <div className="text-sm font-extrabold text-emerald-900 mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Per Hour</label>
              <input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Per Session</label>
              <input type="number" value={form.perSessionRate} onChange={(e) => setForm({ ...form, perSessionRate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Monthly Pkg</label>
              <input type="number" value={form.monthlyPackageRate} onChange={(e) => setForm({ ...form, monthlyPackageRate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
        </div>

        {/* Commission */}
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="text-sm font-extrabold text-amber-900 mb-3 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Commission
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Percentage %</label>
              <input type="number" step="0.1" value={form.commissionPct} onChange={(e) => setForm({ ...form, commissionPct: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Fixed (Rs)</label>
              <input type="number" value={form.commissionFixed} onChange={(e) => setForm({ ...form, commissionFixed: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
          </div>
        </div>

        {/* Working Schedule */}
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-blue-900 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Working Schedule
          </div>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => toggleDay(i)} className={
                'py-2 rounded-lg text-xs font-extrabold transition ' +
                (form.workingDays.includes(i) ? 'bg-blue-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300')
              }>{d}</button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <input type="time" value={form.workStartTime} onChange={(e) => setForm({ ...form, workStartTime: e.target.value })} className="h-11 rounded-xl border-2 border-blue-300 bg-white px-3 text-sm font-extrabold focus:outline-none focus:border-blue-500" />
            <input type="time" value={form.workEndTime} onChange={(e) => setForm({ ...form, workEndTime: e.target.value })} className="h-11 rounded-xl border-2 border-blue-300 bg-white px-3 text-sm font-extrabold focus:outline-none focus:border-blue-500" />
          </div>
          <input type="number" value={form.maxDailyClients} onChange={(e) => setForm({ ...form, maxDailyClients: e.target.value })} placeholder="Max daily clients" className="h-11 w-full rounded-xl border-2 border-blue-300 bg-white px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500" />
        </div>

        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 cursor-pointer">
          <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} className="h-5 w-5 rounded" />
          <div className="flex-1">
            <div className="text-sm font-extrabold text-emerald-900">Available for booking</div>
            <div className="text-xs text-emerald-700 font-semibold">Members can book this trainer</div>
          </div>
        </label>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.staffId}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </section>
  );
}
