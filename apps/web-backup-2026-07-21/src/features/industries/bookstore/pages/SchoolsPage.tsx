import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  School as SchoolIcon, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  MapPin, Phone, User, Newspaper, DollarSign,
} from 'lucide-react';
import { schoolsApi, type School } from '../api/schools.api';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const SCHOOL_TYPES = ['School', 'College', 'University', 'Academy', 'Madrassa', 'Coaching Center'];
const BOARDS = ['Punjab Board', 'Sindh Board', 'KPK Board', 'Balochistan Board', 'Federal Board', 'AKU-EB', 'Cambridge', 'Edexcel', 'IB', 'Matric', 'FBISE'];
const MEDIUMS = ['English', 'Urdu', 'Bilingual', 'Arabic'];

export default function SchoolsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);

  const { data: schools = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['schools', search],
    queryFn: () => schoolsApi.list({ search: search.trim() || undefined, active: true }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => schoolsApi.remove(id),
    onSuccess: () => { toast.success('School deactivated'); queryClient.invalidateQueries({ queryKey: ['schools'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Educational Institutions
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🏫 Schools</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Schools, colleges, academies — bulk business partners</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Add School
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search schools..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-violet-500" />
        </div>
      </section>

      {showForm && (
        <SchoolForm editing={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['schools'] }); }} />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-56 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : schools.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <SchoolIcon className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No schools yet</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map((s) => (
            <div key={s.id} className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow overflow-hidden shrink-0">
                    {s.logoUrl ? <img src={s.logoUrl} alt="" className="w-full h-full object-cover" /> : <SchoolIcon className="h-7 w-7" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-slate-900 dark:text-white truncate">{s.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {s.type && <span className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/40 text-violet-700 text-[9px] font-extrabold uppercase">{s.type}</span>}
                      {s.board && <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 text-[9px] font-extrabold uppercase">{s.board}</span>}
                      {s.medium && <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 text-[9px] font-extrabold uppercase">{s.medium}</span>}
                    </div>
                    {s.city && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 font-bold mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {s.city}
                      </div>
                    )}
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                  <button onClick={() => { setEditing(s); setShowForm(true); }} className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { if (confirm('Deactivate?')) removeMutation.mutate(s.id); }} className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                {s.contactPerson && <div className="flex items-center gap-1 text-slate-600 font-bold"><User className="h-3 w-3" />{s.contactPerson}</div>}
                {s.contactPhone && <div className="flex items-center gap-1 text-slate-600 font-bold"><Phone className="h-3 w-3" />{s.contactPhone}</div>}
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs">
                <div className="text-center">
                  <div className="text-[9px] uppercase font-extrabold text-slate-500">Lists</div>
                  <div className="font-extrabold text-violet-700 tabular-nums">{s._count?.bookLists || 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] uppercase font-extrabold text-emerald-700">Orders</div>
                  <div className="font-extrabold text-emerald-700 tabular-nums">{s.totalOrders}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] uppercase font-extrabold text-amber-700">Discount</div>
                  <div className="font-extrabold text-amber-700 tabular-nums">{s.discountPct}%</div>
                </div>
              </div>

              <Link to={'/bookstore/school-lists?schoolId=' + s.id} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-600 to-purple-700 text-white text-xs font-extrabold flex items-center justify-center gap-1 hover:shadow-lg transition">
                <Newspaper className="h-3 w-3" />
                View Book Lists
              </Link>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function SchoolForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    name: editing?.name ?? '',
    code: editing?.code ?? '',
    type: editing?.type ?? 'School',
    board: editing?.board ?? '',
    medium: editing?.medium ?? '',
    address: editing?.address ?? '',
    city: editing?.city ?? '',
    phone: editing?.phone ?? '',
    email: editing?.email ?? '',
    principalName: editing?.principalName ?? '',
    contactPerson: editing?.contactPerson ?? '',
    contactPhone: editing?.contactPhone ?? '',
    discountPct: editing?.discountPct ?? 0,
    creditDays: editing?.creditDays ?? 0,
    creditLimit: editing?.creditLimit ?? 0,
    logoUrl: editing?.logoUrl ?? '',
    notes: editing?.notes ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        discountPct: Number(form.discountPct) || 0,
        creditDays: Number(form.creditDays) || 0,
        creditLimit: Number(form.creditLimit) || 0,
      };
      return editing ? schoolsApi.update(editing.id, payload) : schoolsApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-violet-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-violet-50 dark:bg-violet-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit School' : 'New School'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5 space-y-3 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="School name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Code" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
            {SCHOOL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={form.board} onChange={(e) => setForm({ ...form, board: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
            <option value="">-- Board --</option>
            {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
            <option value="">-- Medium --</option>
            {MEDIUMS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />
        <div className="grid sm:grid-cols-3 gap-3">
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="School Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <input value={form.principalName} onChange={(e) => setForm({ ...form, principalName: e.target.value })} placeholder="Principal Name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          <input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Contact Person" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="Contact Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
        </div>

        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-emerald-900 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Business Terms
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Discount %</label>
              <input type="number" step="0.1" value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Credit Days</label>
              <input type="number" value={form.creditDays} onChange={(e) => setForm({ ...form, creditDays: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Credit Limit (Rs)</label>
              <input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Logo</label>
          {form.logoUrl ? (
            <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-200">
              <img src={form.logoUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setForm({ ...form, logoUrl: '' })} className="absolute top-1 right-1 h-6 w-6 rounded bg-rose-600 text-white flex items-center justify-center"><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <UploadDropzone onUploaded={(records) => {
              const first = Array.isArray(records) ? records[0] : records;
              const url = typeof first === 'string' ? first : (first as any)?.url;
              if (url) setForm({ ...form, logoUrl: url });
            }} />
          )}
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim()}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </section>
  );
}
