import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCog, Plus, Search, X, Edit3, Trash2, RefreshCw,
  Phone, Mail, Calendar, Award, Save, Users, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { optometristsApi, type OpticalOptometrist } from '../api/optometrists.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function OptometristsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [availableToday, setAvailableToday] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<OpticalOptometrist | null>(null);

  const { data: list = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['optometrists-list', activeOnly, availableToday],
    queryFn: () => optometristsApi.list({
      active: activeOnly ? true : undefined,
      availableToday: availableToday ? true : undefined,
    }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter((o) =>
      o.name.toLowerCase().includes(q) ||
      o.phone.includes(q) ||
      o.employeeCode.toLowerCase().includes(q) ||
      (o.registrationNumber || '').toLowerCase().includes(q)
    );
  }, [list, search]);

  const remove = useMutation({
    mutationFn: (id: string) => optometristsApi.remove(id),
    onSuccess: () => {
      toast.success('Optometrist deactivated');
      qc.invalidateQueries({ queryKey: ['optometrists-list'] });
    },
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <OptometristFormModal editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false); setEditing(null);
            qc.invalidateQueries({ queryKey: ['optometrists-list'] });
          }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <UserCog className="h-3.5 w-3.5 text-amber-300" /> Optometrists Team
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👨‍⚕️ Optometrists</h1>
            <p className="mt-2 text-sm text-white/80">
              {list.length} total • {list.filter((o) => o.isActive).length} active
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> New Optometrist
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, phone, employee code, registration..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setActiveOnly(!activeOnly)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${activeOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200'}`}>
            Active only
          </button>
          <button onClick={() => setAvailableToday(!availableToday)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${availableToday ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}`}>
            <Calendar className="h-3 w-3" /> Available today
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <UserCog className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No optometrists yet</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Add your first team member</p>
          <Button className="mt-4 bg-gradient-to-r from-pink-600 to-rose-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add First Doctor
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((o) => <OptCard key={o.id} o={o}
            onEdit={() => { setEditing(o); setShowForm(true); }}
            onDelete={() => { if (confirm(`Deactivate "${o.name}"?`)) remove.mutate(o.id); }} />)}
        </section>
      )}
    </div>
  );
}

function OptCard({ o, onEdit, onDelete }: any) {
  return (
    <div className={`rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-lg transition ${o.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
      <div className="flex items-start gap-3">
        {o.photoUrl ? (
          <img src={o.photoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover border-2 border-slate-200 shrink-0" />
        ) : (
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-700 text-white flex items-center justify-center font-extrabold text-2xl shrink-0 shadow">
            {o.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-slate-900 truncate">{o.name}</h3>
          {o.qualification && <div className="text-xs font-bold text-pink-700 mt-0.5">{o.qualification}</div>}
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">#{o.employeeCode}</div>
          {o.registrationNumber && (
            <div className="text-[10px] font-bold text-slate-500 mt-0.5">Reg: {o.registrationNumber}</div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 font-bold">
          <Phone className="h-3 w-3 text-slate-400" /> {o.phone}
        </div>
        {o.email && (
          <div className="flex items-center gap-1.5 text-slate-700 font-bold truncate">
            <Mail className="h-3 w-3 text-slate-400" /> {o.email}
          </div>
        )}
        {o.yearsExperience != null && (
          <div className="flex items-center gap-1.5 text-slate-700 font-bold">
            <Award className="h-3 w-3 text-slate-400" /> {o.yearsExperience} years experience
          </div>
        )}
      </div>

      {o.specializations?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">Specializations</div>
          <div className="flex flex-wrap gap-1">
            {o.specializations.slice(0, 3).map((s: string) => (
              <span key={s} className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-800 text-[10px] font-extrabold">{s}</span>
            ))}
            {o.specializations.length > 3 && <span className="text-[10px] font-extrabold text-slate-500">+{o.specializations.length - 3}</span>}
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1 inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> Working Days ({o.workStartTime} - {o.workEndTime})
        </div>
        <div className="flex gap-1">
          {WEEK_DAYS.map((d, i) => (
            <div key={i} className={`h-6 w-6 rounded text-[9px] font-extrabold flex items-center justify-center ${
              o.workingDays?.includes(i) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {d[0]}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Fee</div>
          <div className="text-sm font-extrabold text-slate-900 tabular-nums">{formatPKR(o.consultationFee)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Tests</div>
          <div className="text-sm font-extrabold text-slate-900 tabular-nums">{o.totalTests}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Revenue</div>
          <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(o.totalRevenue)}</div>
        </div>
      </div>

      <div className="mt-3 flex gap-1.5">
        <button onClick={onEdit}
          className="flex-1 h-9 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
          <Edit3 className="h-3.5 w-3.5" /> Edit
        </button>
        {o.isActive && (
          <button onClick={onDelete}
            className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function OptometristFormModal({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    employeeCode: editing?.employeeCode ?? '',
    name: editing?.name ?? '',
    qualification: editing?.qualification ?? '',
    registrationNumber: editing?.registrationNumber ?? '',
    phone: editing?.phone ?? '',
    email: editing?.email ?? '',
    specializations: editing?.specializations ?? [],
    yearsExperience: editing?.yearsExperience ?? '',
    languages: editing?.languages ?? [],
    workingDays: editing?.workingDays ?? [1, 2, 3, 4, 5, 6],
    workStartTime: editing?.workStartTime ?? '10:00',
    workEndTime: editing?.workEndTime ?? '18:00',
    consultationFee: editing?.consultationFee ?? 500,
    followUpFee: editing?.followUpFee ?? '',
    photoUrl: editing?.photoUrl ?? '',
    bio: editing?.bio ?? '',
    isActive: editing?.isActive ?? true,
  });
  const [newSpec, setNewSpec] = useState('');
  const [newLang, setNewLang] = useState('');

  const save = useMutation({
    mutationFn: () => {
      const payload: any = { ...form };
      if (payload.yearsExperience === '') payload.yearsExperience = undefined;
      else payload.yearsExperience = Number(payload.yearsExperience);
      if (payload.followUpFee === '') payload.followUpFee = undefined;
      else payload.followUpFee = Number(payload.followUpFee);
      payload.consultationFee = Number(payload.consultationFee);
      return editing ? optometristsApi.update(editing.id, payload) : optometristsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Updated' : 'Optometrist created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const toggleDay = (d: number) => {
    const cur = form.workingDays ?? [];
    setForm({ ...form, workingDays: cur.includes(d) ? cur.filter((x: number) => x !== d) : [...cur, d].sort() });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-pink-600 to-rose-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">{editing ? '✏️ Edit Optometrist' : '👨‍⚕️ New Optometrist'}</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Employee Code *" value={form.employeeCode}
              onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} placeholder="OPT001" />
            <Input label="Full Name *" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Ahmed Khan" />
            <Input label="Qualification" value={form.qualification}
              onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="OD, MSc Optometry" />
            <Input label="Registration Number" value={form.registrationNumber}
              onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} placeholder="PMDC-12345" />
            <Input label="Phone *" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="03XX XXXXXXX" />
            <Input label="Email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="doctor@example.com" />
            <Input label="Years Experience" type="number" value={form.yearsExperience}
              onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })} placeholder="5" />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Consultation Fee *</label>
              <input type="number" value={form.consultationFee}
                onChange={(e) => setForm({ ...form, consultationFee: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-lg font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-500" />
            </div>
            <Input label="Follow-up Fee" type="number" value={form.followUpFee}
              onChange={(e) => setForm({ ...form, followUpFee: e.target.value })} />
            <Input label="Work Start" type="time" value={form.workStartTime}
              onChange={(e) => setForm({ ...form, workStartTime: e.target.value })} />
            <Input label="Work End" type="time" value={form.workEndTime}
              onChange={(e) => setForm({ ...form, workEndTime: e.target.value })} />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Working Days</label>
            <div className="flex gap-1.5">
              {WEEK_DAYS.map((d, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={`h-11 w-11 rounded-xl border-2 text-xs font-extrabold ${
                    form.workingDays?.includes(i) ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Specializations</label>
            <div className="flex gap-2 mb-2">
              <input value={newSpec} onChange={(e) => setNewSpec(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSpec.trim()) {
                    setForm({ ...form, specializations: [...form.specializations, newSpec.trim()] });
                    setNewSpec('');
                  }
                }}
                placeholder="Pediatric, Contact Lens Fitting, Low Vision..."
                className="h-10 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              <button type="button" onClick={() => {
                if (newSpec.trim()) {
                  setForm({ ...form, specializations: [...form.specializations, newSpec.trim()] });
                  setNewSpec('');
                }
              }} className="h-10 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-sm">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {form.specializations.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.specializations.map((s: string, i: number) => (
                  <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-100 text-pink-800 text-xs font-extrabold">
                    {s}
                    <button onClick={() => setForm({ ...form, specializations: form.specializations.filter((_: any, x: number) => x !== i) })}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Languages</label>
            <div className="flex gap-2 mb-2">
              <input value={newLang} onChange={(e) => setNewLang(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newLang.trim()) {
                    setForm({ ...form, languages: [...form.languages, newLang.trim()] });
                    setNewLang('');
                  }
                }}
                placeholder="Urdu, English, Punjabi..."
                className="h-10 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
              <button type="button" onClick={() => {
                if (newLang.trim()) {
                  setForm({ ...form, languages: [...form.languages, newLang.trim()] });
                  setNewLang('');
                }
              }} className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {form.languages.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.languages.map((l: string, i: number) => (
                  <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-extrabold">
                    {l}
                    <button onClick={() => setForm({ ...form, languages: form.languages.filter((_: any, x: number) => x !== i) })}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Photo</label>
            {form.photoUrl ? (
              <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={form.photoUrl} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setForm({ ...form, photoUrl: '' })}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-extrabold">×</button>
              </div>
            ) : (
              <UploadDropzone purpose="optometrist-photo" maxFiles={1}
                onUploaded={(recs: any[]) => {
                  const first = Array.isArray(recs) ? recs[0] : recs;
                  const url = typeof first === 'string' ? first : (first as any)?.url;
                  if (url) setForm({ ...form, photoUrl: url });
                }} />
            )}
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Bio</label>
            <textarea rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Short professional bio..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-pink-500" />
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-pink-600 to-rose-700"
            onClick={() => save.mutate()} loading={save.isPending}
            disabled={!form.name.trim() || !form.employeeCode.trim() || !form.phone.trim()}>
            <Save className="h-4 w-4" /> {editing ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
