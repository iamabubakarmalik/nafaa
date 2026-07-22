import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  Award, Star, Clock, Phone, Calendar, DollarSign, TrendingUp,
  Camera, User, Scissors, CheckCircle2,
} from 'lucide-react';
import { staffProfilesApi, type StaffRole, type CommissionType, type StaffProfile } from '../api/staff-profiles.api';
import { salonServicesApi } from '../api/services.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';
import { apiClient } from '@core/api/client';

const ROLES: { value: StaffRole; label: string; emoji: string }[] = [
  { value: 'STYLIST', label: 'Stylist', emoji: '💇' },
  { value: 'COLORIST', label: 'Colorist', emoji: '🎨' },
  { value: 'BEAUTICIAN', label: 'Beautician', emoji: '✨' },
  { value: 'MAKEUP_ARTIST', label: 'Makeup Artist', emoji: '💄' },
  { value: 'NAIL_TECH', label: 'Nail Tech', emoji: '💅' },
  { value: 'MASSAGE_THERAPIST', label: 'Massage Therapist', emoji: '💆' },
  { value: 'MEHNDI_ARTIST', label: 'Mehndi Artist', emoji: '🎨' },
  { value: 'APPRENTICE', label: 'Apprentice', emoji: '👶' },
  { value: 'RECEPTIONIST', label: 'Receptionist', emoji: '💁' },
  { value: 'MANAGER', label: 'Manager', emoji: '👔' },
  { value: 'OTHER', label: 'Other', emoji: '⭐' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StaffPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StaffProfile | null>(null);
  const [managingServices, setManagingServices] = useState<StaffProfile | null>(null);

  const { data: profiles = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['salon-staff-profiles', roleFilter, search],
    queryFn: () => staffProfilesApi.list({
      role: roleFilter === 'all' ? undefined : roleFilter,
      search: search.trim() || undefined,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => staffProfilesApi.remove(id),
    onSuccess: () => {
      toast.success('Staff profile removed');
      queryClient.invalidateQueries({ queryKey: ['salon-staff-profiles'] });
    },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Team Members
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👨‍💼 Salon Staff</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Stylists, beauticians, commission tracking</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Add Staff Profile
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-violet-500" />
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
            }>
              {r.emoji} {r.label}
            </button>
          ))}
        </div>
      </section>

      {showForm && (
        <StaffProfileForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['salon-staff-profiles'] });
          }}
        />
      )}

      {managingServices && (
        <StaffServicesModal
          profile={managingServices}
          onClose={() => setManagingServices(null)}
          onSaved={() => { setManagingServices(null); queryClient.invalidateQueries({ queryKey: ['salon-staff-profiles'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <UserCheck className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No staff profiles yet</p>
          <p className="text-xs text-slate-500 mt-1">Pehle Staff module se employee add karo, phir yahaan salon profile banao</p>
          <Button className="mt-4 bg-gradient-to-r from-violet-600 to-purple-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Add First Profile
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <StaffCard
              key={profile.id}
              profile={profile}
              onEdit={() => { setEditing(profile); setShowForm(true); }}
              onDelete={() => { if (confirm('Deactivate ' + (profile.staff?.firstName || 'this staff') + '?')) removeMutation.mutate(profile.id); }}
              onManageServices={() => setManagingServices(profile)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StaffCard({ profile, onEdit, onDelete, onManageServices }: any) {
  const role = ROLES.find((r) => r.value === profile.role);
  const staff = profile.staff;
  const staffName = staff ? ((staff.firstName || '') + ' ' + (staff.lastName || '')).trim() || staff.name : 'Staff';

  return (
    <div className={
      'group rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl transition-all p-4 space-y-3 ' +
      (profile.isBookable ? 'border-slate-200 dark:border-neutral-800' : 'border-slate-200 dark:border-neutral-800 opacity-70')
    }>
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt={staffName} className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-neutral-700" />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-2xl font-extrabold shadow-lg ring-2 ring-white">
              {staffName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={
            'absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-2 ring-white dark:ring-neutral-900 ' +
            (profile.isBookable ? 'bg-emerald-500' : 'bg-slate-400')
          } />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-slate-900 dark:text-white truncate">{staffName}</div>
          <div className="flex items-center gap-1 text-xs text-violet-600 font-extrabold">
            <span>{role?.emoji}</span>
            <span>{role?.label}</span>
          </div>
          {profile.experienceYears && (
            <div className="text-[10px] text-slate-500 font-bold">{profile.experienceYears} years exp.</div>
          )}
          {staff?.phone && (
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mt-0.5">
              <Phone className="h-2.5 w-2.5" />
              {staff.phone}
            </div>
          )}
        </div>
      </div>

      {/* Specialization */}
      {profile.specialization?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {profile.specialization.slice(0, 3).map((s: string, i: number) => (
            <span key={i} className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/40 text-violet-700 text-[9px] font-extrabold uppercase">
              {s}
            </span>
          ))}
          {profile.specialization.length > 3 && (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 text-[9px] font-extrabold">
              +{profile.specialization.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Working hours */}
      <div className="flex items-center gap-3 text-xs text-slate-600 font-bold">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {profile.workStartTime}–{profile.workEndTime}
        </span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {profile.workingDays.length}d/week
        </span>
        <span className="inline-flex items-center gap-1">
          <Scissors className="h-3 w-3" />
          {profile.services?.length || 0} svc
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Bookings</div>
          <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{profile.totalAppointments}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-emerald-700">Revenue</div>
          <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(profile.totalRevenue).replace('Rs', '').trim()}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-amber-700 inline-flex items-center gap-0.5">
            <Star className="h-2 w-2 fill-current" />
            Rating
          </div>
          <div className="text-sm font-extrabold text-amber-700 tabular-nums">
            {profile.avgRating ? profile.avgRating.toFixed(1) : '—'}
          </div>
        </div>
      </div>

      {/* Commission info */}
      {profile.commissionType !== 'NONE' && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2 text-xs">
          <div className="flex items-center justify-between font-extrabold">
            <span className="inline-flex items-center gap-1 text-amber-800">
              <Award className="h-3 w-3" />
              Commission
            </span>
            <span className="text-amber-900 tabular-nums">
              {profile.commissionType === 'PERCENTAGE' && profile.commissionPct + '%'}
              {profile.commissionType === 'FIXED_PER_SERVICE' && formatPKR(profile.commissionFixed)}
              {profile.commissionType === 'HYBRID' && profile.commissionPct + '% + ' + formatPKR(profile.commissionFixed)}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
        <button onClick={onManageServices} className="flex-1 h-9 rounded-lg bg-violet-100 dark:bg-violet-950/40 hover:bg-violet-200 text-violet-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
          <Scissors className="h-3 w-3" />
          Services
        </button>
        <button onClick={onEdit} className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function StaffProfileForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    staffId: editing?.staffId ?? '',
    role: editing?.role ?? 'STYLIST',
    specialization: editing?.specialization?.join(', ') ?? '',
    experienceYears: editing?.experienceYears ?? '',
    bio: editing?.bio ?? '',
    photoUrl: editing?.photoUrl ?? '',
    commissionType: editing?.commissionType ?? 'PERCENTAGE',
    commissionPct: editing?.commissionPct ?? 0,
    commissionFixed: editing?.commissionFixed ?? 0,
    workingDays: editing?.workingDays ?? [1, 2, 3, 4, 5, 6],
    workStartTime: editing?.workStartTime ?? '09:00',
    workEndTime: editing?.workEndTime ?? '21:00',
    breakStartTime: editing?.breakStartTime ?? '',
    breakEndTime: editing?.breakEndTime ?? '',
    isBookable: editing?.isBookable ?? true,
    maxDailyBookings: editing?.maxDailyBookings ?? '',
    bookingBuffer: editing?.bookingBuffer ?? 0,
  });

  // Fetch staff list for picker
  const { data: staffList } = useQuery({
    queryKey: ['staff-list-for-salon'],
    queryFn: () => apiClient.get('/staff?isActive=true&limit=200').then((r) => r.data?.data?.items ?? r.data?.items ?? r.data ?? []),
    enabled: !editing,
  });

  const saveMutation = useMutation({
    mutationFn: () => staffProfilesApi.upsert({
      ...form,
      specialization: form.specialization ? form.specialization.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
      maxDailyBookings: form.maxDailyBookings ? Number(form.maxDailyBookings) : undefined,
      bookingBuffer: Number(form.bookingBuffer) || 0,
      commissionPct: Number(form.commissionPct) || 0,
      commissionFixed: Number(form.commissionFixed) || 0,
    }),
    onSuccess: () => { toast.success(editing ? 'Profile updated' : 'Profile created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const toggleDay = (day: number) => {
    const days = form.workingDays.includes(day) ? form.workingDays.filter((d: number) => d !== day) : [...form.workingDays, day];
    setForm({ ...form, workingDays: days });
  };

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-violet-300 dark:border-violet-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-violet-50 dark:bg-violet-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">{editing ? 'Edit Staff Profile' : 'New Staff Profile'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Staff picker (only for new) */}
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

        {/* Photo */}
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

        {/* Role + Experience */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Role *</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Experience (years)</label>
            <input type="number" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} placeholder="5" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-violet-500" />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Specialization (comma separated)</label>
          <input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Bridal, Balayage, Keratin" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
        </div>

        <textarea rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Short bio..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />

        {/* Commission */}
        <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Commission Setup
          </div>
          <select value={form.commissionType} onChange={(e) => setForm({ ...form, commissionType: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
            <option value="NONE">No Commission</option>
            <option value="PERCENTAGE">Percentage %</option>
            <option value="FIXED_PER_SERVICE">Fixed per service (Rs)</option>
            <option value="HYBRID">Hybrid (% + Fixed)</option>
          </select>
          {form.commissionType !== 'NONE' && (
            <div className="grid sm:grid-cols-2 gap-3">
              {(form.commissionType === 'PERCENTAGE' || form.commissionType === 'HYBRID') && (
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Percentage (%)</label>
                  <input type="number" step="0.1" value={form.commissionPct} onChange={(e) => setForm({ ...form, commissionPct: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
                </div>
              )}
              {(form.commissionType === 'FIXED_PER_SERVICE' || form.commissionType === 'HYBRID') && (
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Fixed (Rs)</label>
                  <input type="number" step="0.01" value={form.commissionFixed} onChange={(e) => setForm({ ...form, commissionFixed: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Working schedule */}
        <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Working Schedule
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Working Days</label>
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => toggleDay(i)}
                  className={
                    'py-2 rounded-lg text-xs font-extrabold transition ' +
                    (form.workingDays.includes(i) ? 'bg-blue-600 text-white shadow' : 'bg-white dark:bg-neutral-800 border border-slate-200 text-slate-600 hover:border-blue-300')
                  }
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Work Start</label>
              <input type="time" value={form.workStartTime} onChange={(e) => setForm({ ...form, workStartTime: e.target.value })} className="h-11 w-full rounded-xl border-2 border-blue-300 bg-white dark:bg-blue-950/40 px-3 text-sm font-extrabold focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Work End</label>
              <input type="time" value={form.workEndTime} onChange={(e) => setForm({ ...form, workEndTime: e.target.value })} className="h-11 w-full rounded-xl border-2 border-blue-300 bg-white dark:bg-blue-950/40 px-3 text-sm font-extrabold focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Break Start (optional)</label>
              <input type="time" value={form.breakStartTime} onChange={(e) => setForm({ ...form, breakStartTime: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Break End</label>
              <input type="time" value={form.breakEndTime} onChange={(e) => setForm({ ...form, breakEndTime: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Booking rules */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Max Daily Bookings</label>
            <input type="number" value={form.maxDailyBookings} onChange={(e) => setForm({ ...form, maxDailyBookings: e.target.value })} placeholder="Unlimited" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Buffer Between Bookings (min)</label>
            <input type="number" value={form.bookingBuffer} onChange={(e) => setForm({ ...form, bookingBuffer: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-violet-500" />
          </div>
        </div>

        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 cursor-pointer">
          <input type="checkbox" checked={form.isBookable} onChange={(e) => setForm({ ...form, isBookable: e.target.checked })} className="h-5 w-5 rounded" />
          <CheckCircle2 className={'h-5 w-5 ' + (form.isBookable ? 'text-emerald-600' : 'text-slate-400')} />
          <div className="flex-1">
            <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300">Accept online bookings</div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">Customers can book this staff directly</div>
          </div>
        </label>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.staffId}>
            <Save className="h-4 w-4" />
            {editing ? 'Update Profile' : 'Create Profile'}
          </Button>
        </div>
      </div>
    </section>
  );
}

function StaffServicesModal({ profile, onClose, onSaved }: { profile: StaffProfile; onClose: () => void; onSaved: () => void }) {
  const { data: allServices = [] } = useQuery({
    queryKey: ['salon-services-for-staff'],
    queryFn: () => salonServicesApi.list({}),
  });

  const [selected, setSelected] = useState<Record<string, { serviceId: string; isPrimary?: boolean; customPrice?: number }>>(() => {
    const initial: any = {};
    profile.services?.forEach((s: any) => {
      initial[s.serviceId] = { serviceId: s.serviceId, isPrimary: s.isPrimary, customPrice: s.customPrice };
    });
    return initial;
  });

  const saveMutation = useMutation({
    mutationFn: () => staffProfilesApi.assignServices(profile.id, Object.values(selected)),
    onSuccess: () => { toast.success('Services assigned'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const toggle = (serviceId: string) => {
    const copy = { ...selected };
    if (copy[serviceId]) delete copy[serviceId];
    else copy[serviceId] = { serviceId };
    setSelected(copy);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-violet-50 dark:bg-violet-950/30 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">Manage Services</h3>
            <p className="text-xs text-slate-500 font-semibold">{profile.staff?.firstName || 'Staff'} • {profile.role}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="text-xs text-slate-500 font-semibold mb-3">Selected: {Object.keys(selected).length} services</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {allServices.map((svc) => {
              const isSelected = !!selected[svc.id];
              return (
                <button
                  key={svc.id}
                  onClick={() => toggle(svc.id)}
                  className={
                    'p-3 rounded-xl border-2 text-left transition ' +
                    (isSelected ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-violet-300')
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{svc.name}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">{svc.category?.replace('_', ' ')}</div>
                      <div className="text-xs font-extrabold text-emerald-700 tabular-nums mt-1">{formatPKR(svc.price)}</div>
                    </div>
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-violet-600 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t-2 border-slate-200 dark:border-neutral-800 p-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
            <Save className="h-4 w-4" />
            Save Assignments
          </Button>
        </div>
      </div>
    </div>
  );
}
