import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, X, Edit3, Trash2, Star, RefreshCw,
  Award, Save, DollarSign, TrendingUp, Phone, Clock, Calendar,
  CheckCircle2, XCircle, Scissors, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { groomersApi, type PetGroomer } from '../api/groomers.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';

const SPECIES = [
  { v: 'DOG', l: 'Dog', e: '🐕' },
  { v: 'CAT', l: 'Cat', e: '🐈' },
  { v: 'BIRD', l: 'Bird', e: '🦜' },
  { v: 'RABBIT', l: 'Rabbit', e: '🐰' },
  { v: 'ALL', l: 'All', e: '🌐' },
];

const SERVICE_TYPES = [
  { v: 'BATH_BASIC', l: 'Basic Bath' },
  { v: 'BATH_DELUXE', l: 'Deluxe Bath' },
  { v: 'FULL_GROOMING', l: 'Full Grooming' },
  { v: 'HAIRCUT', l: 'Haircut' },
  { v: 'NAIL_TRIMMING', l: 'Nail Trim' },
  { v: 'EAR_CLEANING', l: 'Ear Clean' },
  { v: 'TEETH_CLEANING', l: 'Teeth Clean' },
  { v: 'FLEA_TREATMENT', l: 'Flea Treat' },
  { v: 'DE_SHEDDING', l: 'De-shed' },
  { v: 'STYLING', l: 'Styling' },
];

const WEEKDAYS = [
  { v: 0, l: 'Sun' }, { v: 1, l: 'Mon' }, { v: 2, l: 'Tue' },
  { v: 3, l: 'Wed' }, { v: 4, l: 'Thu' }, { v: 5, l: 'Fri' }, { v: 6, l: 'Sat' },
];

export default function GroomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PetGroomer | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const { data: groomers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['groomers-list', activeOnly],
    queryFn: () => groomersApi.list({ active: activeOnly ? true : undefined }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return groomers;
    return groomers.filter((g) =>
      g.name.toLowerCase().includes(q) ||
      g.phone.includes(q) ||
      g.employeeCode.toLowerCase().includes(q)
    );
  }, [groomers, search]);

  const stats = useMemo(() => ({
    total: groomers.length,
    active: groomers.filter((g) => g.isActive).length,
    totalRevenue: groomers.reduce((s, g) => s + Number(g.totalRevenue || 0), 0),
    totalAppointments: groomers.reduce((s, g) => s + g.completedAppointments, 0),
  }), [groomers]);

  const remove = useMutation({
    mutationFn: (id: string) => groomersApi.remove(id),
    onSuccess: () => {
      toast.success('Groomer deactivated');
      qc.invalidateQueries({ queryKey: ['groomers-list'] });
    },
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <GroomerFormModal editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['groomers-list'] });
          }} />
      )}

      {selected && (
        <GroomerDetailModal groomerId={selected} onClose={() => setSelected(null)} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Users className="h-3.5 w-3.5 text-amber-300" /> Groomers Management
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👨‍🔧 Groomers</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.active} active • {stats.totalAppointments} appointments • Revenue{' '}
              <strong className="text-emerald-300">{formatPKR(stats.totalRevenue)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> Add Groomer
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Groomers" value={stats.total} icon={Users} tone="blue" />
        <StatCard label="Active" value={stats.active} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Appointments" value={stats.totalAppointments} icon={Scissors} tone="violet" />
        <StatCard label="Total Revenue" value={formatPKR(stats.totalRevenue)} icon={DollarSign} tone="amber" />
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, phone, employee code..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button onClick={() => setActiveOnly(!activeOnly)}
            className={`h-12 px-4 rounded-2xl border-2 text-sm font-extrabold inline-flex items-center gap-1.5 ${
              activeOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'}`}>
            <CheckCircle2 className="h-4 w-4" /> Active Only
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Users className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No groomers yet</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Add your first groomer</p>
          <Button className="mt-4 bg-gradient-to-r from-blue-600 to-cyan-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add First Groomer
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((g) => (
            <GroomerCard key={g.id} groomer={g}
              onView={() => setSelected(g.id)}
              onEdit={() => { setEditing(g); setShowForm(true); }}
              onDelete={() => { if (confirm(`Deactivate ${g.name}?`)) remove.mutate(g.id); }} />
          ))}
        </section>
      )}
    </div>
  );
}

function GroomerCard({ groomer: g, onView, onEdit, onDelete }: any) {
  const dayOfWeek = new Date().getDay();
  const worksToday = g.workingDays?.includes(dayOfWeek);

  return (
    <div className={`rounded-2xl bg-white border-2 shadow-sm hover:shadow-lg transition-all overflow-hidden ${
      g.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {g.photoUrl ? (
            <img src={g.photoUrl} alt={g.name} className="h-16 w-16 rounded-2xl object-cover border-2 border-slate-200 shrink-0" />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center font-extrabold text-2xl shrink-0 shadow-md">
              {g.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 truncate">{g.name}</div>
            <div className="text-[10px] font-mono text-slate-500">{g.employeeCode}</div>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-600 mt-0.5">
              <Phone className="h-3 w-3" /> {g.phone}
            </div>
            <div className="flex items-center gap-1 flex-wrap mt-1.5">
              {g.isActive && worksToday && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase">Today</span>
              )}
              {!g.isActive && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-extrabold uppercase">Inactive</span>
              )}
              {g.avgRating && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold">
                  <Star className="h-2.5 w-2.5 fill-current" /> {g.avgRating.toFixed(1)}
                </span>
              )}
              {g.experienceYears && (
                <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold uppercase">
                  {g.experienceYears}y exp
                </span>
              )}
            </div>
          </div>
        </div>

        {g.specializations?.length > 0 && (
          <div className="mt-3">
            <div className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Specializes in</div>
            <div className="flex flex-wrap gap-1">
              {g.specializations.map((s: string) => (
                <span key={s} className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-extrabold">{s}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
          <div>
            <div className="text-[9px] uppercase font-extrabold text-slate-500">Appointments</div>
            <div className="text-lg font-extrabold text-slate-900 tabular-nums">{g.completedAppointments}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase font-extrabold text-slate-500">Revenue</div>
            <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(g.totalRevenue || 0)}</div>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-500">
          <Clock className="h-3 w-3" />
          {g.workStartTime} — {g.workEndTime}
          <span>•</span>
          <span>{g.workingDays?.map((d: number) => WEEKDAYS.find((w) => w.v === d)?.l).join(', ') || 'No days set'}</span>
        </div>

        <div className="mt-3 flex gap-1.5">
          <button onClick={onView}
            className="flex-1 h-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
            <Eye className="h-3.5 w-3.5" /> Details
          </button>
          <button onClick={onEdit}
            className="h-9 w-9 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 flex items-center justify-center">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          {g.isActive && (
            <button onClick={onDelete}
              className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GroomerFormModal({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    employeeCode: editing?.employeeCode ?? '',
    name: editing?.name ?? '',
    phone: editing?.phone ?? '',
    cnic: editing?.cnic ?? '',
    specializations: editing?.specializations ?? [],
    serviceTypes: editing?.serviceTypes ?? [],
    experienceYears: editing?.experienceYears ?? '',
    certifications: editing?.certifications ?? [],
    workingDays: editing?.workingDays ?? [1, 2, 3, 4, 5, 6],
    workStartTime: editing?.workStartTime ?? '09:00',
    workEndTime: editing?.workEndTime ?? '18:00',
    perServiceRate: editing?.perServiceRate ?? '',
    commissionPct: editing?.commissionPct ?? 20,
    isActive: editing?.isActive ?? true,
    photoUrl: editing?.photoUrl ?? '',
  });
  const [newCert, setNewCert] = useState('');

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        experienceYears: form.experienceYears === '' ? undefined : Number(form.experienceYears),
        perServiceRate: form.perServiceRate === '' ? undefined : Number(form.perServiceRate),
        commissionPct: Number(form.commissionPct),
      };
      return editing
        ? groomersApi.update(editing.id, payload)
        : groomersApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Groomer updated' : 'Groomer added');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const togSpec = (v: string) => {
    setForm({
      ...form,
      specializations: form.specializations.includes(v)
        ? form.specializations.filter((x: string) => x !== v)
        : [...form.specializations, v],
    });
  };
  const togService = (v: string) => {
    setForm({
      ...form,
      serviceTypes: form.serviceTypes.includes(v)
        ? form.serviceTypes.filter((x: string) => x !== v)
        : [...form.serviceTypes, v],
    });
  };
  const togDay = (d: number) => {
    setForm({
      ...form,
      workingDays: form.workingDays.includes(d)
        ? form.workingDays.filter((x: number) => x !== d)
        : [...form.workingDays, d].sort(),
    });
  };
  const addCert = () => {
    if (!newCert.trim() || form.certifications.includes(newCert.trim())) return;
    setForm({ ...form, certifications: [...form.certifications, newCert.trim()] });
    setNewCert('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">{editing ? '✏️ Edit Groomer' : '👨‍🔧 Add Groomer'}</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Employee Code *" placeholder="EMP-001"
              value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} />
            <Input label="Full Name *" placeholder="Ali Ahmed"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Phone *" placeholder="03XX XXXXXXX"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="CNIC" placeholder="XXXXX-XXXXXXX-X"
              value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />
          </div>

          <div>
            <Lbl>Photo</Lbl>
            {form.photoUrl ? (
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-slate-200">
                <img src={form.photoUrl} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setForm({ ...form, photoUrl: '' })}
                  className="absolute top-1 right-1 h-7 w-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <UploadDropzone purpose="groomer-photo" maxFiles={1}
                onUploaded={(recs: any[]) => {
                  const first = Array.isArray(recs) ? recs[0] : recs;
                  const url = typeof first === 'string' ? first : (first as any)?.url;
                  if (url) setForm({ ...form, photoUrl: url });
                }} />
            )}
          </div>

          <div>
            <Lbl>Specializations (species)</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {SPECIES.map((s) => {
                const active = form.specializations.includes(s.v);
                return (
                  <button key={s.v} type="button" onClick={() => togSpec(s.v)}
                    className={`px-3 py-1.5 rounded-full border-2 text-xs font-extrabold ${
                      active ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}`}>
                    {active ? '✓ ' : '+ '}{s.e} {s.l}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Lbl>Service Types</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {SERVICE_TYPES.map((s) => {
                const active = form.serviceTypes.includes(s.v);
                return (
                  <button key={s.v} type="button" onClick={() => togService(s.v)}
                    className={`px-3 py-1.5 rounded-full border-2 text-xs font-extrabold ${
                      active ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'}`}>
                    {active ? '✓ ' : '+ '}{s.l}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Experience (years)" type="number" value={form.experienceYears}
              onChange={(e) => setForm({ ...form, experienceYears: e.target.value === '' ? '' : Number(e.target.value) })} />
            <Input label="Per Service Rate (optional)" type="number" value={form.perServiceRate}
              onChange={(e) => setForm({ ...form, perServiceRate: e.target.value === '' ? '' : Number(e.target.value) })} />
          </div>

          <Input label="Commission %" type="number" value={form.commissionPct}
            onChange={(e) => setForm({ ...form, commissionPct: Number(e.target.value) })} />

          <div>
            <Lbl>Working Days</Lbl>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((d) => {
                const active = form.workingDays.includes(d.v);
                return (
                  <button key={d.v} type="button" onClick={() => togDay(d.v)}
                    className={`h-11 rounded-xl border-2 text-sm font-extrabold ${
                      active ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'}`}>
                    {d.l}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Work Start" type="time"
              value={form.workStartTime} onChange={(e) => setForm({ ...form, workStartTime: e.target.value })} />
            <Input label="Work End" type="time"
              value={form.workEndTime} onChange={(e) => setForm({ ...form, workEndTime: e.target.value })} />
          </div>

          <div>
            <Lbl>Certifications</Lbl>
            <div className="flex gap-2">
              <input value={newCert} onChange={(e) => setNewCert(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCert())}
                placeholder="Pet Grooming Certificate..."
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
              <button type="button" onClick={addCert} disabled={!newCert.trim()}
                className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm disabled:opacity-50">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {form.certifications.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.certifications.map((c: string, i: number) => (
                  <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-100 text-violet-800 text-xs font-extrabold">
                    <Award className="h-3 w-3" /> {c}
                    <button onClick={() => setForm({ ...form, certifications: form.certifications.filter((_: any, x: number) => x !== i) })}
                      className="hover:text-rose-700">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-slate-200 cursor-pointer">
            <input type="checkbox" checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold text-slate-700">Active groomer</span>
          </label>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700"
            onClick={() => save.mutate()} loading={save.isPending}
            disabled={!form.name.trim() || !form.employeeCode.trim() || !form.phone.trim()}>
            <Save className="h-4 w-4" /> {editing ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function GroomerDetailModal({ groomerId, onClose }: { groomerId: string; onClose: () => void }) {
  const { data: groomer } = useQuery({
    queryKey: ['groomer', groomerId],
    queryFn: () => groomersApi.getOne(groomerId),
  });

  if (!groomer) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="h-16 w-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-5">
          <button onClick={onClose} className="absolute top-3 right-3 h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            {groomer.photoUrl ? (
              <img src={groomer.photoUrl} alt="" className="h-20 w-20 rounded-2xl object-cover border-2 border-white/40" />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-white/20 flex items-center justify-center font-extrabold text-3xl">
                {groomer.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/70">{groomer.employeeCode}</div>
              <h3 className="font-extrabold text-2xl">{groomer.name}</h3>
              <div className="flex items-center gap-2 text-sm font-bold text-white/85 mt-0.5">
                <Phone className="h-3.5 w-3.5" /> {groomer.phone}
                {groomer.avgRating && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-0.5 text-amber-300">
                      <Star className="h-3.5 w-3.5 fill-current" /> {groomer.avgRating.toFixed(1)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <TileStat label="Appointments" value={groomer.completedAppointments} />
            <TileStat label="Revenue" value={formatPKR(groomer.totalRevenue || 0)} />
            <TileStat label="Commission" value={`${groomer.commissionPct}%`} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {(groomer.todayAppointments?.length ?? 0) > 0 && (
            <div>
              <div className="text-xs uppercase font-extrabold text-slate-600 mb-2">Today's Appointments</div>
              <div className="space-y-2">
                {groomer.todayAppointments?.map((a: any) => (
                  <div key={a.id} className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <Scissors className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm text-slate-900">
                        {a.petName} <span className="text-slate-500 font-bold">({a.petSpecies})</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-500">
                        {a.customerName} • {a.scheduledSlot}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-emerald-700 tabular-nums text-sm">{formatPKR(a.totalFee)}</div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase">{a.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {groomer.specializations?.length > 0 && (
            <div>
              <div className="text-xs uppercase font-extrabold text-slate-600 mb-2">Specializations</div>
              <div className="flex flex-wrap gap-1.5">
                {groomer.specializations.map((s: string) => (
                  <span key={s} className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-extrabold">{s}</span>
                ))}
              </div>
            </div>
          )}

          {groomer.certifications?.length > 0 && (
            <div>
              <div className="text-xs uppercase font-extrabold text-slate-600 mb-2">Certifications</div>
              <div className="flex flex-wrap gap-1.5">
                {groomer.certifications.map((c: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-violet-100 text-violet-800 text-xs font-extrabold">
                    <Award className="h-3 w-3" /> {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs uppercase font-extrabold text-slate-600 mb-2">Schedule</div>
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Clock className="h-4 w-4" />
                {groomer.workStartTime} — {groomer.workEndTime}
              </div>
              <div className="mt-2 flex gap-1">
                {WEEKDAYS.map((d) => {
                  const active = groomer.workingDays?.includes(d.v);
                  return (
                    <div key={d.v} className={`flex-1 h-8 rounded-lg text-[10px] font-extrabold flex items-center justify-center ${
                      active ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {d.l}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {(groomer.recentCompleted?.length ?? 0) > 0 && (
            <div>
              <div className="text-xs uppercase font-extrabold text-slate-600 mb-2">Recent Completed</div>
              <div className="space-y-2">
                {groomer.recentCompleted?.slice(0, 5).map((a: any) => (
                  <div key={a.id} className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 truncate">{a.petName} — {a.serviceType?.replace(/_/g, ' ')}</div>
                      <div className="text-[10px] font-bold text-slate-500">
                        {a.completedAt && new Date(a.completedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                        {a.customerRating && (
                          <span className="ml-1 inline-flex items-center gap-0.5 text-amber-500">
                            <Star className="h-2.5 w-2.5 fill-current" /> {a.customerRating}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-emerald-700 tabular-nums text-sm">{formatPKR(a.totalFee)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-700',
    emerald: 'from-emerald-500 to-teal-700',
    violet: 'from-violet-500 to-purple-700',
    amber: 'from-amber-500 to-orange-700',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1 truncate">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function TileStat({ label, value }: any) {
  return (
    <div className="rounded-xl bg-white/15 backdrop-blur border border-white/20 p-3">
      <div className="text-[10px] uppercase font-extrabold text-white/70">{label}</div>
      <div className="text-lg font-extrabold text-white tabular-nums mt-0.5 truncate">{value}</div>
    </div>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
