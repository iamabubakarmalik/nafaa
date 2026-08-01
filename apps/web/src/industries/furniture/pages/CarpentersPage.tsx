import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Hammer, Plus, Search, X, Edit3, Trash2, RefreshCw, Phone,
  DollarSign, TrendingUp, Save, MapPin, Clock, Award, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { carpentersApi, type FurnitureCarpenter } from '../api/carpenters.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';

const SPECIALIZATIONS = [
  'Sofa Making', 'Bed Making', 'Wardrobe Making', 'Dining Furniture',
  'Office Furniture', 'Kitchen Cabinets', 'Custom Design',
  'Polishing', 'Upholstery', 'Carving', 'CNC Work', 'Restoration',
];

const MATERIALS = [
  'SOLID_WOOD_SHEESHAM', 'SOLID_WOOD_TEAK', 'SOLID_WOOD_ROSEWOOD',
  'MDF', 'PLYWOOD', 'ENGINEERED_WOOD', 'METAL_IRON',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CarpentersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FurnitureCarpenter | null>(null);

  const { data: carpenters = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['carpenters-all', activeOnly],
    queryFn: () => carpentersApi.list({ active: activeOnly ? true : undefined }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return carpenters;
    return carpenters.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.employeeCode.toLowerCase().includes(q) ||
      (c.workshopLocation || '').toLowerCase().includes(q)
    );
  }, [carpenters, search]);

  const stats = useMemo(() => ({
    total: carpenters.length,
    active: carpenters.filter((c) => c.isActive).length,
    activeProjects: carpenters.reduce((s, c) => s + Number(c.activeProjects || 0), 0),
    totalRevenue: carpenters.reduce((s, c) => s + Number(c.totalRevenue || 0), 0),
  }), [carpenters]);

  const remove = useMutation({
    mutationFn: (id: string) => carpentersApi.remove(id),
    onSuccess: () => { toast.success('Carpenter deactivated'); qc.invalidateQueries({ queryKey: ['carpenters-all'] }); },
  });

  return (
    <div className="space-y-5">
      {showForm && <CarpenterFormModal editing={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => { setShowForm(false); setEditing(null); qc.invalidateQueries({ queryKey: ['carpenters-all'] }); }} />}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-800 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Hammer className="h-3.5 w-3.5 text-amber-300" /> Workshop Team
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🔨 Carpenters</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.active} active • {stats.activeProjects} active projects • Revenue{' '}
              <strong className="text-emerald-300">{formatPKR(stats.totalRevenue)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> New Carpenter
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={User} label="Total" value={stats.total} sub={`${stats.active} active`} tone="orange" />
        <Kpi icon={Hammer} label="Active Projects" value={stats.activeProjects} sub="In workshop" tone="amber" />
        <Kpi icon={DollarSign} label="Total Revenue" value={formatPKR(stats.totalRevenue)} sub="Lifetime" tone="emerald" />
        <Kpi icon={Award} label="Avg per Carpenter" value={stats.active > 0 ? formatPKR(stats.totalRevenue / stats.active) : '—'} sub="Per carpenter" tone="violet" />
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, phone, code, workshop..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button onClick={() => setActiveOnly(!activeOnly)}
            className={`h-12 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${activeOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-700'}`}>
            Active Only
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Hammer className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No carpenters yet</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Add your workshop team members</p>
          <Button className="mt-4 bg-gradient-to-r from-orange-600 to-red-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add First Carpenter
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((c) => (
            <CarpenterCard key={c.id} carpenter={c}
              onEdit={() => { setEditing(c); setShowForm(true); }}
              onDelete={() => { if (confirm(`Deactivate "${c.name}"?`)) remove.mutate(c.id); }} />
          ))}
        </section>
      )}
    </div>
  );
}

function CarpenterCard({ carpenter, onEdit, onDelete }: any) {
  return (
    <div className={`rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-lg transition ${carpenter.isActive ? 'border-slate-200 hover:border-orange-300' : 'border-slate-100 opacity-70'}`}>
      <div className="flex items-start gap-3">
        {carpenter.photoUrl ? (
          <img src={carpenter.photoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover border-2 border-slate-200 shrink-0" />
        ) : (
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-700 text-white flex items-center justify-center font-extrabold text-2xl shrink-0 shadow">
            {carpenter.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-slate-900 truncate">{carpenter.name}</div>
          <div className="text-[10px] font-mono text-slate-500">{carpenter.employeeCode}</div>
          <div className="text-xs font-bold text-slate-600 mt-0.5 inline-flex items-center gap-1">
            <Phone className="h-3 w-3" /> {carpenter.phone}
          </div>
          {carpenter.workshopLocation && (
            <div className="text-[10px] font-bold text-slate-500 mt-0.5 inline-flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" /> {carpenter.workshopLocation}
            </div>
          )}
        </div>
      </div>

      {carpenter.specializations?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {carpenter.specializations.slice(0, 3).map((s: string) => (
            <span key={s} className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-extrabold">{s}</span>
          ))}
          {carpenter.specializations.length > 3 && (
            <span className="text-[10px] font-extrabold text-slate-500">+{carpenter.specializations.length - 3}</span>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Total</div>
          <div className="text-lg font-extrabold text-slate-900 tabular-nums">{carpenter.totalProjects || 0}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Active</div>
          <div className="text-lg font-extrabold text-amber-700 tabular-nums">{carpenter.activeProjects || 0}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Done</div>
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{carpenter.completedProjects || 0}</div>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
        <div className="text-[9px] uppercase font-extrabold text-slate-500">Revenue</div>
        <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(carpenter.totalRevenue || 0)}</div>
      </div>

      {carpenter.experienceYears && (
        <div className="mt-2 text-[10px] font-bold text-slate-500 inline-flex items-center gap-1">
          <Award className="h-2.5 w-2.5" /> {carpenter.experienceYears} years experience
        </div>
      )}

      <div className="mt-3 flex gap-1.5 pt-3 border-t border-slate-100">
        <button onClick={onEdit}
          className="flex-1 h-9 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
          <Edit3 className="h-3.5 w-3.5" /> Edit
        </button>
        <button onClick={onDelete}
          className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function CarpenterFormModal({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    employeeCode: editing?.employeeCode ?? '', name: editing?.name ?? '', phone: editing?.phone ?? '',
    cnic: editing?.cnic ?? '', address: editing?.address ?? '',
    specializations: editing?.specializations ?? [],
    materialsExpertise: editing?.materialsExpertise ?? [],
    experienceYears: editing?.experienceYears ?? '',
    workshopLocation: editing?.workshopLocation ?? '',
    workingDays: editing?.workingDays ?? [1, 2, 3, 4, 5, 6],
    workStartTime: editing?.workStartTime ?? '09:00',
    workEndTime: editing?.workEndTime ?? '18:00',
    dailyWage: editing?.dailyWage ?? '',
    perProjectRate: editing?.perProjectRate ?? '',
    commissionPct: editing?.commissionPct ?? 0,
    isActive: editing?.isActive ?? true,
    photoUrl: editing?.photoUrl ?? '',
    notes: editing?.notes ?? '',
  });

  const save = useMutation({
    mutationFn: () => editing ? carpentersApi.update(editing.id, form as any) : carpentersApi.create(form as any),
    onSuccess: () => { toast.success(editing ? 'Carpenter updated' : 'Carpenter created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const togSpec = (v: string) => {
    setForm({ ...form, specializations: form.specializations.includes(v) ? form.specializations.filter((x: string) => x !== v) : [...form.specializations, v] });
  };
  const togMaterial = (v: string) => {
    setForm({ ...form, materialsExpertise: form.materialsExpertise.includes(v) ? form.materialsExpertise.filter((x: string) => x !== v) : [...form.materialsExpertise, v] });
  };
  const togDay = (i: number) => {
    setForm({ ...form, workingDays: form.workingDays.includes(i) ? form.workingDays.filter((x: number) => x !== i) : [...form.workingDays, i].sort() });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-orange-600 to-red-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">{editing ? '✏️ Edit Carpenter' : '➕ New Carpenter'}</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Employee Code *</Lbl>
              <input value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value.toUpperCase() })}
                placeholder="CARP-001"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-extrabold focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <Lbl>Full Name *</Lbl>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Carpenter name"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <Lbl>Phone *</Lbl>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="03XX XXXXXXX"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <Lbl>CNIC</Lbl>
              <input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })}
                placeholder="XXXXX-XXXXXXX-X"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-orange-500" />
            </div>
          </div>

          <div>
            <Lbl>Photo</Lbl>
            {form.photoUrl ? (
              <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={form.photoUrl} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setForm({ ...form, photoUrl: '' })}
                  className="absolute top-1 right-1 h-7 w-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <UploadDropzone purpose="carpenter-photo" maxFiles={1}
                onUploaded={(recs: any[]) => {
                  const first = Array.isArray(recs) ? recs[0] : recs;
                  const url = typeof first === 'string' ? first : (first as any)?.url;
                  if (url) setForm({ ...form, photoUrl: url });
                }} />
            )}
          </div>

          <div>
            <Lbl>Specializations</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {SPECIALIZATIONS.map((s) => {
                const a = form.specializations.includes(s);
                return (
                  <button key={s} type="button" onClick={() => togSpec(s)}
                    className={`px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition ${a ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300'}`}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Lbl>Materials Expertise</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {MATERIALS.map((m) => {
                const a = form.materialsExpertise.includes(m);
                return (
                  <button key={m} type="button" onClick={() => togMaterial(m)}
                    className={`px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition ${a ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300'}`}>
                    {m.replace(/_/g, ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Experience (years)</Lbl>
              <input type="number" value={form.experienceYears}
                onChange={(e) => setForm({ ...form, experienceYears: e.target.value === '' ? '' : Number(e.target.value) as any })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <Lbl>Workshop Location</Lbl>
              <input value={form.workshopLocation} onChange={(e) => setForm({ ...form, workshopLocation: e.target.value })}
                placeholder="Main workshop"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
            </div>
          </div>

          <div>
            <Lbl>Working Days</Lbl>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map((d, i) => {
                const a = form.workingDays.includes(i);
                return (
                  <button key={d} type="button" onClick={() => togDay(i)}
                    className={`h-10 rounded-lg border-2 text-xs font-extrabold transition ${a ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Start Time</Lbl>
              <input type="time" value={form.workStartTime} onChange={(e) => setForm({ ...form, workStartTime: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <Lbl>End Time</Lbl>
              <input type="time" value={form.workEndTime} onChange={(e) => setForm({ ...form, workEndTime: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Lbl>Daily Wage</Lbl>
              <input type="number" value={form.dailyWage}
                onChange={(e) => setForm({ ...form, dailyWage: e.target.value === '' ? '' : Number(e.target.value) as any })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <Lbl>Per Project Rate</Lbl>
              <input type="number" value={form.perProjectRate}
                onChange={(e) => setForm({ ...form, perProjectRate: e.target.value === '' ? '' : Number(e.target.value) as any })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <Lbl>Commission %</Lbl>
              <input type="number" step="0.1" value={form.commissionPct}
                onChange={(e) => setForm({ ...form, commissionPct: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-orange-500" />
            </div>
          </div>

          <div>
            <Lbl>Address</Lbl>
            <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Home address"
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-orange-500" />
          </div>

          <div>
            <Lbl>Notes</Lbl>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-orange-500" />
          </div>

          <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-slate-200 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold text-slate-700">Active</span>
          </label>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-orange-600 to-red-700"
            onClick={() => save.mutate()} loading={save.isPending}
            disabled={!form.name.trim() || !form.phone.trim() || !form.employeeCode.trim()}>
            <Save className="h-4 w-4" /> {editing ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    orange: 'from-orange-500 to-red-700', amber: 'from-amber-500 to-orange-700',
    emerald: 'from-emerald-500 to-teal-700', violet: 'from-violet-500 to-purple-700',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1 truncate">{value}</div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5">{sub}</div>
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
