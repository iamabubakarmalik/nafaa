import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, X, Save, RefreshCw, Sparkles, Award,
  Clock, Star, Wrench, DollarSign, CheckCircle2,
} from 'lucide-react';
import { mechanicsApi } from '../api/mechanics.api';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { apiClient } from '@core/api/client';

export default function MechanicsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: mechanics = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['mechanics', search],
    queryFn: () => mechanicsApi.list({ search: search.trim() || undefined }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => mechanicsApi.remove(id),
    onSuccess: () => { toast.success('Mechanic removed'); queryClient.invalidateQueries({ queryKey: ['mechanics'] }); },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => mechanicsApi.toggleAvailability(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mechanics'] }),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Workshop Team
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🔧 Mechanics</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Skilled team with hourly rates & commissions</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Add Mechanic
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search mechanics..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-violet-500" />
        </div>
      </section>

      {showForm && (
        <MechanicForm editing={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['mechanics'] }); }} />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : mechanics.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Users className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No mechanics yet</p>
          <p className="text-xs text-slate-500 mt-1">Add staff first, then create mechanic profile</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mechanics.map((m) => {
            const nm = m.staff ? (((m.staff as any).firstName || '') + ' ' + ((m.staff as any).lastName || '')).trim() : 'Mechanic';
            return (
              <div key={m.id} className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-xl transition p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-200" />
                    ) : (
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-2xl font-extrabold shadow-lg ring-2 ring-white">
                        {nm.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button onClick={() => toggleMutation.mutate(m.id)} className={
                      'absolute -bottom-1 -right-1 h-6 w-6 rounded-full ring-2 ring-white flex items-center justify-center ' +
                      (m.isAvailable ? 'bg-emerald-500' : 'bg-slate-400')
                    }>
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 dark:text-white truncate">{nm}</div>
                    {m.yearsOfExperience && <div className="text-[10px] font-bold text-slate-500">{m.yearsOfExperience} yrs exp</div>}
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className={
                        'px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ' +
                        (m.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')
                      }>
                        {m.isAvailable ? 'Available' : 'Busy'}
                      </span>
                    </div>
                  </div>
                </div>

                {m.specialization?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {m.specialization.slice(0, 3).map((s: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/40 text-violet-700 text-[9px] font-extrabold uppercase">{s}</span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1.5">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
                    <div className="text-[9px] uppercase font-extrabold text-emerald-700">Rate</div>
                    <div className="text-sm font-extrabold text-emerald-800 tabular-nums">Rs {m.hourlyRate}/hr</div>
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-center">
                    <div className="text-[9px] uppercase font-extrabold text-amber-700">Commission</div>
                    <div className="text-sm font-extrabold text-amber-800 tabular-nums">{m.commissionPct}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs">
                  <div className="text-center">
                    <div className="text-[9px] uppercase font-extrabold text-slate-500">Jobs</div>
                    <div className="text-sm font-extrabold tabular-nums">{m.totalJobs}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] uppercase font-extrabold text-emerald-700">Revenue</div>
                    <div className="text-[10px] font-extrabold text-emerald-700 tabular-nums">Rs {(m.totalRevenue / 1000).toFixed(0)}k</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] uppercase font-extrabold text-amber-700 inline-flex items-center justify-center gap-0.5">
                      <Star className="h-2 w-2 fill-current" />
                      Rating
                    </div>
                    <div className="text-sm font-extrabold text-amber-700 tabular-nums">{m.avgRating ? m.avgRating.toFixed(1) : '—'}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function MechanicForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    staffId: editing?.staffId ?? '',
    specialization: editing?.specialization?.join(', ') ?? '',
    certifications: editing?.certifications?.join(', ') ?? '',
    yearsOfExperience: editing?.yearsOfExperience ?? '',
    bio: editing?.bio ?? '',
    hourlyRate: editing?.hourlyRate ?? 500,
    commissionPct: editing?.commissionPct ?? 20,
    workStartTime: editing?.workStartTime ?? '09:00',
    workEndTime: editing?.workEndTime ?? '18:00',
    isAvailable: editing?.isAvailable ?? true,
  });

  const { data: staffList } = useQuery({
    queryKey: ['staff-for-mechanic'],
    queryFn: () => apiClient.get('/staff?isActive=true&limit=200').then((r) => r.data?.data?.items ?? r.data?.items ?? r.data ?? []),
    enabled: !editing,
  });

  const saveMutation = useMutation({
    mutationFn: () => mechanicsApi.upsert({
      ...form,
      yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : undefined,
      hourlyRate: Number(form.hourlyRate),
      commissionPct: Number(form.commissionPct),
      specialization: form.specialization ? form.specialization.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      certifications: form.certifications ? form.certifications.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-violet-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-violet-50 dark:bg-violet-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Mechanic' : 'New Mechanic Profile'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5 space-y-3 max-h-[85vh] overflow-y-auto">
        {!editing && (
          <select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
            <option value="">Select Staff *</option>
            {(staffList ?? []).map((s: any) => {
              const nm = ((s.firstName || '') + ' ' + (s.lastName || '')).trim() || s.name || s.staffNumber;
              return <option key={s.id} value={s.id}>{nm} • {s.phone || ''}</option>;
            })}
          </select>
        )}

        <input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Specialization (comma separated) e.g. Engine, Electrical" className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
        <input value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} placeholder="Certifications (comma separated)" className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />

        <div className="grid sm:grid-cols-2 gap-3">
          <input type="number" value={form.yearsOfExperience} onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value })} placeholder="Years of experience" className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-violet-500" />
        </div>

        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <div className="text-sm font-extrabold text-emerald-900">💰 Compensation</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Hourly Rate (Rs)</label>
              <input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Commission %</label>
              <input type="number" step="0.1" value={form.commissionPct} onChange={(e) => setForm({ ...form, commissionPct: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Work Start</label>
            <input type="time" value={form.workStartTime} onChange={(e) => setForm({ ...form, workStartTime: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Work End</label>
            <input type="time" value={form.workEndTime} onChange={(e) => setForm({ ...form, workEndTime: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
        </div>

        <textarea rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio / short description..." className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />

        <div className="flex gap-2 pt-2">
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
