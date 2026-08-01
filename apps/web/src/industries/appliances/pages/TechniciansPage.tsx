import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap, Plus, Search, X, RefreshCw, Star, MapPin, Phone,
  Award, TrendingUp, Save, Edit3, Trash2, User, Grid3x3, List,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { techniciansApi, type Technician } from '../api/technicians.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';

export default function TechniciansPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Technician | null>(null);

  const { data: technicians = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['technicians-list', activeOnly],
    queryFn: () => techniciansApi.list({ active: activeOnly ? true : undefined }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return technicians;
    return technicians.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.phone.includes(q) ||
      t.employeeCode.toLowerCase().includes(q) ||
      (t.cnic || '').includes(q) ||
      (t.currentZone || '').toLowerCase().includes(q)
    );
  }, [technicians, search]);

  const stats = useMemo(() => ({
    total: technicians.length,
    active: technicians.filter((t) => t.isActive).length,
    totalJobs: technicians.reduce((s, t) => s + t.completedJobs, 0),
    totalRevenue: technicians.reduce((s, t) => s + t.totalRevenue, 0),
  }), [technicians]);

  const remove = useMutation({
    mutationFn: (id: string) => techniciansApi.remove(id),
    onSuccess: () => {
      toast.success('Technician removed');
      qc.invalidateQueries({ queryKey: ['technicians-list'] });
    },
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <TechnicianFormModal
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['technicians-list'] });
          }}
        />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Zap className="h-3.5 w-3.5 text-amber-300" /> Technicians
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">⚡ Technicians</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.active} active • {stats.totalJobs} jobs done • Revenue{' '}
              <strong className="text-emerald-300">{formatPKR(stats.totalRevenue)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> New Technician
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Zap} label="Total Tech" value={stats.total} sub={`${stats.active} active`} tone="violet" />
        <Kpi icon={CheckCircle2} label="Jobs Done" value={stats.totalJobs} sub="All-time" tone="emerald" />
        <Kpi icon={TrendingUp} label="Total Revenue" value={formatPKR(stats.totalRevenue)} sub="Generated" tone="blue" />
        <Kpi icon={Star} label="Avg Rating" value={stats.total > 0 ? (technicians.reduce((s, t) => s + (t.avgRating || 0), 0) / stats.total).toFixed(1) : '—'} sub="Customer rating" tone="amber" />
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, phone, code, CNIC, zone..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="inline-flex rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
            <button onClick={() => setView('grid')}
              className={`px-4 h-12 text-xs font-extrabold transition ${view === 'grid' ? 'bg-violet-600 text-white' : 'text-slate-600'}`}>
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button onClick={() => setView('table')}
              className={`px-4 h-12 text-xs font-extrabold border-l-2 border-slate-200 transition ${view === 'table' ? 'bg-violet-600 text-white' : 'text-slate-600'}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
          <button onClick={() => setActiveOnly(!activeOnly)}
            className={['h-12 px-4 rounded-2xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition',
              activeOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'].join(' ')}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Active Only
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Zap className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No technicians yet</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Add technicians to assign installations & service requests</p>
          <Button className="mt-4 bg-gradient-to-r from-violet-600 to-purple-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add First Technician
          </Button>
        </div>
      ) : view === 'grid' ? (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((t) => (
            <TechnicianCard key={t.id} technician={t}
              onEdit={() => { setEditing(t); setShowForm(true); }}
              onDelete={() => { if (confirm(`Remove "${t.name}"?`)) remove.mutate(t.id); }} />
          ))}
        </section>
      ) : (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b-2 border-slate-200">
              <tr>
                <Th>Technician</Th>
                <Th>Phone</Th>
                <Th>Zone</Th>
                <Th className="text-right">Jobs</Th>
                <Th className="text-right">Revenue</Th>
                <Th className="text-center">Rating</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-violet-50/40">
                  <td className="px-3 py-2.5">
                    <Link to={`/appliances/technicians/${t.id}`} className="flex items-center gap-3 group">
                      {t.photoUrl ? (
                        <img src={t.photoUrl} alt="" className="h-10 w-10 rounded-full object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-extrabold shrink-0">
                          {t.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm group-hover:text-violet-700">{t.name}</div>
                        <div className="text-[10px] font-mono text-slate-500">{t.employeeCode}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono font-bold text-slate-700">{t.phone}</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-slate-600">{t.currentZone || '—'}</td>
                  <td className="px-3 py-2.5 text-right font-extrabold text-slate-900 tabular-nums">{t.completedJobs}/{t.totalJobs}</td>
                  <td className="px-3 py-2.5 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(t.totalRevenue)}</td>
                  <td className="px-3 py-2.5 text-center">
                    {t.avgRating ? (
                      <span className="inline-flex items-center gap-0.5 text-xs font-extrabold text-amber-700">
                        <Star className="h-3 w-3 fill-current" /> {t.avgRating.toFixed(1)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditing(t); setShowForm(true); }}
                        className="h-8 w-8 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 flex items-center justify-center">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { if (confirm(`Remove "${t.name}"?`)) remove.mutate(t.id); }}
                        className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function TechnicianCard({ technician: t, onEdit, onDelete }: any) {
  return (
    <div className="group relative rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 hover:shadow-xl hover:-translate-y-0.5 transition">
      <Link to={`/appliances/technicians/${t.id}`} className="block">
        <div className="flex items-start gap-3">
          {t.photoUrl ? (
            <img src={t.photoUrl} alt="" className="h-14 w-14 rounded-2xl object-cover border-2 border-slate-200 shrink-0" />
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center font-extrabold text-xl shrink-0 shadow">
              {t.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 truncate group-hover:text-violet-700 transition">{t.name}</h3>
            <div className="text-[10px] font-mono font-bold text-slate-500">{t.employeeCode}</div>
            {t.avgRating && (
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-extrabold text-amber-700">
                <Star className="h-3 w-3 fill-current" /> {t.avgRating.toFixed(1)}
                <span className="text-slate-500 font-bold">({t.totalReviews})</span>
              </div>
            )}
          </div>
          {!t.isActive && (
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-extrabold uppercase">Inactive</span>
          )}
        </div>

        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold">
            <Phone className="h-3 w-3 text-emerald-600" /> {t.phone}
          </div>
          {t.currentZone && (
            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
              <MapPin className="h-3 w-3 text-blue-600" /> {t.currentZone}
            </div>
          )}
          {t.experienceYears && (
            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
              <Award className="h-3 w-3 text-amber-600" /> {t.experienceYears} years exp
            </div>
          )}
        </div>

        {t.specializations?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {t.specializations.slice(0, 3).map((s: string) => (
              <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-extrabold">{s}</span>
            ))}
            {t.specializations.length > 3 && (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-extrabold">+{t.specializations.length - 3}</span>
            )}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
          <div>
            <div className="text-[9px] uppercase font-extrabold text-slate-500">Jobs</div>
            <div className="text-base font-extrabold text-slate-900 tabular-nums">{t.completedJobs}/{t.totalJobs}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase font-extrabold text-slate-500">Revenue</div>
            <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(t.totalRevenue)}</div>
          </div>
        </div>
      </Link>

      <div className="mt-3 flex gap-1.5">
        <button onClick={onEdit}
          className="flex-1 h-9 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
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

function TechnicianFormModal({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    employeeCode: editing?.employeeCode ?? `TECH-${Math.floor(1000 + Math.random() * 9000)}`,
    name: editing?.name ?? '',
    phone: editing?.phone ?? '',
    cnic: editing?.cnic ?? '',
    address: editing?.address ?? '',
    experienceYears: editing?.experienceYears ?? '',
    currentZone: editing?.currentZone ?? '',
    workStartTime: editing?.workStartTime ?? '09:00',
    workEndTime: editing?.workEndTime ?? '18:00',
    visitChargeRate: editing?.visitChargeRate ?? 500,
    hourlyRate: editing?.hourlyRate ?? 0,
    commissionPct: editing?.commissionPct ?? 10,
    photoUrl: editing?.photoUrl ?? '',
    notes: editing?.notes ?? '',
    isActive: editing?.isActive ?? true,
    specializations: editing?.specializations ?? [],
  });

  const save = useMutation({
    mutationFn: () => editing ? techniciansApi.update(editing.id, form as any) : techniciansApi.create(form as any),
    onSuccess: () => {
      toast.success(editing ? 'Technician updated' : 'Technician added');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const [newSpec, setNewSpec] = useState('');
  const addSpec = () => {
    if (!newSpec.trim()) return;
    setForm({ ...form, specializations: [...(form.specializations || []), newSpec.trim()] });
    setNewSpec('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">{editing ? '✏️ Edit Technician' : '➕ New Technician'}</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Photo</label>
            {form.photoUrl ? (
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-slate-200">
                <img src={form.photoUrl} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setForm({ ...form, photoUrl: '' })}
                  className="absolute top-1 right-1 h-7 w-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <UploadDropzone purpose="technician-photo" maxFiles={1}
                onUploaded={(recs: any[]) => {
                  const first = Array.isArray(recs) ? recs[0] : recs;
                  const url = typeof first === 'string' ? first : (first as any)?.url;
                  if (url) setForm({ ...form, photoUrl: url });
                }} />
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Full Name *</label>
              <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Ali Ahmad"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Employee Code *</label>
              <input value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value.toUpperCase() })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Phone *</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="03XX XXXXXXX"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">CNIC</label>
              <input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })}
                placeholder="XXXXX-XXXXXXX-X"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Address</label>
            <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Experience (years)</label>
              <input type="number" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="5"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Current Zone</label>
              <input value={form.currentZone} onChange={(e) => setForm({ ...form, currentZone: e.target.value })}
                placeholder="e.g. Lahore East"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Work Start</label>
              <input type="time" value={form.workStartTime} onChange={(e) => setForm({ ...form, workStartTime: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Work End</label>
              <input type="time" value={form.workEndTime} onChange={(e) => setForm({ ...form, workEndTime: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-emerald-700 mb-1.5">Visit Charge</label>
              <input type="number" value={form.visitChargeRate} onChange={(e) => setForm({ ...form, visitChargeRate: Number(e.target.value) })}
                placeholder="500"
                className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-emerald-700 mb-1.5">Hourly Rate</label>
              <input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })}
                placeholder="0"
                className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-emerald-700 mb-1.5">Commission %</label>
              <input type="number" value={form.commissionPct} onChange={(e) => setForm({ ...form, commissionPct: Number(e.target.value) })}
                placeholder="10"
                className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Specializations</label>
            <div className="flex gap-2 mb-2">
              <input value={newSpec} onChange={(e) => setNewSpec(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpec())}
                placeholder="e.g. AC Installation, Fridge Repair"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
              <button onClick={addSpec} disabled={!newSpec.trim()}
                className="h-11 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold disabled:opacity-50">
                Add
              </button>
            </div>
            {form.specializations?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.specializations.map((s: string) => (
                  <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-100 text-violet-800 text-xs font-extrabold">
                    {s}
                    <button onClick={() => setForm({ ...form, specializations: form.specializations.filter((x: string) => x !== s) })}
                      className="hover:text-rose-700">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Notes</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
          </div>

          <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-slate-200 cursor-pointer">
            <input type="checkbox" checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded" />
            <span className="text-xs font-extrabold text-slate-700">Active (can be assigned)</span>
          </label>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700"
            onClick={() => save.mutate()} loading={save.isPending}
            disabled={!form.name.trim() || !form.phone.trim() || !form.employeeCode.trim()}>
            <Save className="h-4 w-4" /> {editing ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = '' }: any) {
  return <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 ${className}`}>{children}</th>;
}

function Kpi({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-700',
    emerald: 'from-emerald-500 to-emerald-700',
    blue: 'from-blue-500 to-blue-700',
    amber: 'from-amber-500 to-orange-600',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 font-bold mt-0.5">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
