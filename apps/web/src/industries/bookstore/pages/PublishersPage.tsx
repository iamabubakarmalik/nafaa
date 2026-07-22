import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  Globe, Phone, Mail, User, Zap, BookOpen, MapPin,
} from 'lucide-react';
import { publishersApi, type Publisher } from '../api/publishers.api';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';

export default function PublishersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Publisher | null>(null);

  const { data: publishers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['publishers', search],
    queryFn: () => publishersApi.list({ search: search.trim() || undefined, active: true }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => publishersApi.remove(id),
    onSuccess: () => { toast.success('Publisher deactivated'); queryClient.invalidateQueries({ queryKey: ['publishers'] }); },
  });

  const seedMutation = useMutation({
    mutationFn: () => publishersApi.seedPakistani(),
    onSuccess: (data) => { toast.success('Added ' + data.created + ' publishers'); queryClient.invalidateQueries({ queryKey: ['publishers'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Publishing Houses
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🏢 Publishers</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Oxford, Ferozsons, Sang-e-Meel, Dar-us-Salam</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <Zap className="h-4 w-4" />
              Seed Pakistani Publishers
            </button>
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              New Publisher
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search publishers..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
        </div>
      </section>

      {showForm && (
        <PublisherForm editing={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['publishers'] }); }} />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-48 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : publishers.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Building2 className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No publishers yet</p>
          <div className="mt-4 flex gap-2 justify-center flex-wrap">
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-700" onClick={() => seedMutation.mutate()} loading={seedMutation.isPending}>
              <Zap className="h-4 w-4" />
              Auto-Add 24 Publishers
            </Button>
            <Button variant="secondary" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Add Manually
            </Button>
          </div>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {publishers.map((p) => (
            <div key={p.id} className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow overflow-hidden shrink-0">
                    {p.logoUrl ? <img src={p.logoUrl} alt="" className="w-full h-full object-cover" /> : <Building2 className="h-7 w-7" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-slate-900 dark:text-white truncate">{p.name}</h3>
                    {p.code && <div className="text-[10px] font-mono font-bold text-slate-500">{p.code}</div>}
                    {(p.country || p.city) && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                        <MapPin className="h-3 w-3" />
                        {[p.city, p.country].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                  <button onClick={() => { setEditing(p); setShowForm(true); }} className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { if (confirm('Deactivate "' + p.name + '"?')) removeMutation.mutate(p.id); }} className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                {p.contactPerson && <div className="flex items-center gap-1 text-slate-600 font-bold"><User className="h-3 w-3" />{p.contactPerson}</div>}
                {p.phone && <div className="flex items-center gap-1 text-slate-600 font-bold"><Phone className="h-3 w-3" />{p.phone}</div>}
                {p.email && <div className="flex items-center gap-1 text-slate-600 font-bold truncate"><Mail className="h-3 w-3" />{p.email}</div>}
                {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 font-bold hover:underline truncate"><Globe className="h-3 w-3" />{p.website}</a>}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-slate-600 font-bold">
                  <BookOpen className="h-3 w-3" />
                  {p._count?.books || 0} books
                </span>
                {p.defaultDiscountPct > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase">
                    {p.defaultDiscountPct}% discount
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function PublisherForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    name: editing?.name ?? '',
    code: editing?.code ?? '',
    country: editing?.country ?? '',
    city: editing?.city ?? '',
    website: editing?.website ?? '',
    phone: editing?.phone ?? '',
    email: editing?.email ?? '',
    contactPerson: editing?.contactPerson ?? '',
    logoUrl: editing?.logoUrl ?? '',
    description: editing?.description ?? '',
    defaultDiscountPct: editing?.defaultDiscountPct ?? 0,
    paymentTerms: editing?.paymentTerms ?? '',
    creditDays: editing?.creditDays ?? 0,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, defaultDiscountPct: Number(form.defaultDiscountPct) || 0, creditDays: Number(form.creditDays) || 0 };
      return editing ? publishersApi.update(editing.id, payload) : publishersApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Publisher' : 'New Publisher'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5 space-y-3 max-h-[80vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Publisher name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Code" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Contact person" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        </div>
        <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />

        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-amber-900">💼 Business Terms</div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Default Discount %</label>
              <input type="number" value={form.defaultDiscountPct} onChange={(e) => setForm({ ...form, defaultDiscountPct: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Credit Days</label>
              <input type="number" value={form.creditDays} onChange={(e) => setForm({ ...form, creditDays: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Payment Terms</label>
              <input value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="Net 30" className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
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

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim()}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </section>
  );
}
