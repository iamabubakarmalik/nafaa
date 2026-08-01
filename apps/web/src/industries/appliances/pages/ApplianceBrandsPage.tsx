import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Award, Plus, Search, X, Edit3, Trash2, Star, RefreshCw,
  Globe, Phone, Mail, CheckCircle2, Save, HardHat,
} from 'lucide-react';
import { toast } from 'sonner';
import { applianceBrandsApi, type ApplianceBrand } from '../api/brands.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { UploadDropzone } from '@core/components/uploads';

export default function ApplianceBrandsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [authorizedOnly, setAuthorizedOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApplianceBrand | null>(null);

  const { data: brands = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['appliance-brands', authorizedOnly],
    queryFn: () => applianceBrandsApi.list({ authorized: authorizedOnly ? true : undefined }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return brands;
    return brands.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      (b.code || '').toLowerCase().includes(q) ||
      (b.countryOfOrigin || '').toLowerCase().includes(q)
    );
  }, [brands, search]);

  const stats = useMemo(() => ({
    total: brands.length,
    authorized: brands.filter((b) => b.authorizedDealer).length,
    installIncluded: brands.filter((b) => b.installationIncluded).length,
    totalRevenue: brands.reduce((s, b) => s + Number(b.totalRevenue || 0), 0),
  }), [brands]);

  const remove = useMutation({
    mutationFn: (id: string) => applianceBrandsApi.remove(id),
    onSuccess: () => {
      toast.success('Brand removed');
      qc.invalidateQueries({ queryKey: ['appliance-brands'] });
    },
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <BrandFormModal
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['appliance-brands'] });
          }}
        />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Award className="h-3.5 w-3.5 text-amber-300" /> Appliance Brands
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🎖️ Brands</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.total} brands • {stats.authorized} authorized dealers
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> New Brand
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Award} label="Total" value={stats.total} tone="violet" />
        <Kpi icon={CheckCircle2} label="Authorized" value={stats.authorized} tone="emerald" onClick={() => setAuthorizedOnly(!authorizedOnly)} />
        <Kpi icon={HardHat} label="Install Included" value={stats.installIncluded} tone="amber" />
        <Kpi icon={Star} label="Revenue" value={formatPKR(stats.totalRevenue)} tone="blue" />
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Brand name, code, country..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button onClick={() => setAuthorizedOnly(!authorizedOnly)}
            className={['h-12 px-3 rounded-2xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition',
              authorizedOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'].join(' ')}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Authorized Only
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-52 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Award className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No brands yet</h3>
          <Button className="mt-4 bg-gradient-to-r from-violet-600 to-purple-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add First Brand
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((b) => (
            <BrandCard key={b.id} brand={b}
              onEdit={() => { setEditing(b); setShowForm(true); }}
              onDelete={() => { if (confirm(`Remove "${b.name}"?`)) remove.mutate(b.id); }} />
          ))}
        </section>
      )}
    </div>
  );
}

function BrandCard({ brand: b, onEdit, onDelete }: any) {
  return (
    <div className="group relative rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 hover:shadow-xl hover:-translate-y-0.5 transition">
      <div className="flex items-start gap-3">
        {b.logoUrl ? (
          <img src={b.logoUrl} alt="" className="h-14 w-14 rounded-xl object-contain bg-white p-1.5 border-2 border-slate-200 shrink-0" />
        ) : (
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center font-extrabold text-xl shrink-0 shadow">
            {b.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-slate-900 truncate">{b.name}</h3>
          {b.countryOfOrigin && <div className="text-xs font-bold text-slate-500 mt-0.5">📍 {b.countryOfOrigin}</div>}
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            {b.authorizedDealer && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                <CheckCircle2 className="h-2.5 w-2.5" /> Authorized
              </span>
            )}
            {b.installationIncluded && (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase">
                🎁 Install
              </span>
            )}
          </div>
        </div>
      </div>

      {(b.serviceCenter || b.serviceContact || b.serviceEmail) && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs">
          {b.serviceCenter && (
            <div className="text-slate-700 font-bold truncate">🏢 {b.serviceCenter}</div>
          )}
          {b.serviceContact && (
            <a href={`tel:${b.serviceContact}`} className="text-emerald-700 font-bold inline-flex items-center gap-1 hover:underline">
              <Phone className="h-3 w-3" /> {b.serviceContact}
            </a>
          )}
          {b.serviceEmail && (
            <a href={`mailto:${b.serviceEmail}`} className="text-blue-700 font-bold inline-flex items-center gap-1 hover:underline truncate">
              <Mail className="h-3 w-3" /> {b.serviceEmail}
            </a>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Products</div>
          <div className="text-lg font-extrabold text-slate-900 tabular-nums">{b.productCount || 0}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Revenue</div>
          <div className="text-sm font-extrabold text-violet-700 tabular-nums">{formatPKR(b.totalRevenue || 0)}</div>
        </div>
      </div>

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

function BrandFormModal({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    code: editing?.code ?? '',
    countryOfOrigin: editing?.countryOfOrigin ?? '',
    description: editing?.description ?? '',
    logoUrl: editing?.logoUrl ?? '',
    authorizedDealer: editing?.authorizedDealer ?? false,
    dealerCode: editing?.dealerCode ?? '',
    serviceCenter: editing?.serviceCenter ?? '',
    serviceContact: editing?.serviceContact ?? '',
    serviceEmail: editing?.serviceEmail ?? '',
    warrantyPolicy: editing?.warrantyPolicy ?? '',
    installationIncluded: editing?.installationIncluded ?? false,
    demoIncluded: editing?.demoIncluded ?? false,
    isFeatured: editing?.isFeatured ?? false,
    isActive: editing?.isActive ?? true,
  });

  const save = useMutation({
    mutationFn: () => editing ? applianceBrandsApi.update(editing.id, form) : applianceBrandsApi.create(form),
    onSuccess: () => {
      toast.success(editing ? 'Brand updated' : 'Brand created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">{editing ? '✏️ Edit Brand' : '➕ New Brand'}</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Brand Name *</label>
              <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Haier, Dawlance, PEL..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Brand Code</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="HAI, DWL"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Country of Origin</label>
            <input value={form.countryOfOrigin} onChange={(e) => setForm({ ...form, countryOfOrigin: e.target.value })}
              placeholder="China, South Korea, Pakistan..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Logo</label>
            {form.logoUrl ? (
              <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={form.logoUrl} alt="" className="w-full h-full object-contain bg-white p-2" />
                <button onClick={() => setForm({ ...form, logoUrl: '' })}
                  className="absolute top-1 right-1 h-7 w-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <UploadDropzone purpose="brand-logo" maxFiles={1}
                onUploaded={(recs: any[]) => {
                  const first = Array.isArray(recs) ? recs[0] : recs;
                  const url = typeof first === 'string' ? first : (first as any)?.url;
                  if (url) setForm({ ...form, logoUrl: url });
                }} />
            )}
          </div>

          <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.authorizedDealer}
                onChange={(e) => setForm({ ...form, authorizedDealer: e.target.checked })}
                className="h-5 w-5 rounded" />
              <div>
                <div className="font-extrabold text-emerald-900 text-sm">Authorized Dealer</div>
                <div className="text-xs text-emerald-700 font-semibold">Official brand dealer status</div>
              </div>
            </label>
            {form.authorizedDealer && (
              <input value={form.dealerCode} onChange={(e) => setForm({ ...form, dealerCode: e.target.value })}
                placeholder="Dealer Code (e.g. HAIER-2026-KHI-001)"
                className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
            )}
          </div>

          <div>
            <div className="text-xs font-extrabold uppercase text-slate-600 mb-2">🏢 Service Center Details</div>
            <div className="space-y-2">
              <input value={form.serviceCenter} onChange={(e) => setForm({ ...form, serviceCenter: e.target.value })}
                placeholder="Service center location/address"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
              <div className="grid sm:grid-cols-2 gap-2">
                <input value={form.serviceContact} onChange={(e) => setForm({ ...form, serviceContact: e.target.value })}
                  placeholder="Support Phone"
                  className="h-11 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
                <input type="email" value={form.serviceEmail} onChange={(e) => setForm({ ...form, serviceEmail: e.target.value })}
                  placeholder="Support Email"
                  className="h-11 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Warranty Policy</label>
            <textarea rows={2} value={form.warrantyPolicy} onChange={(e) => setForm({ ...form, warrantyPolicy: e.target.value })}
              placeholder="Brand warranty terms..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-amber-200 bg-amber-50 cursor-pointer">
              <input type="checkbox" checked={form.installationIncluded}
                onChange={(e) => setForm({ ...form, installationIncluded: e.target.checked })}
                className="h-4 w-4 rounded" />
              <span className="text-xs font-extrabold text-amber-900">🎁 Install Included</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-blue-200 bg-blue-50 cursor-pointer">
              <input type="checkbox" checked={form.demoIncluded}
                onChange={(e) => setForm({ ...form, demoIncluded: e.target.checked })}
                className="h-4 w-4 rounded" />
              <span className="text-xs font-extrabold text-blue-900">📚 Demo Included</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-yellow-200 bg-yellow-50 cursor-pointer">
              <input type="checkbox" checked={form.isFeatured}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                className="h-4 w-4 rounded" />
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span className="text-xs font-extrabold text-amber-900">Featured</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-slate-200 cursor-pointer">
              <input type="checkbox" checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded" />
              <span className="text-xs font-extrabold text-slate-700">Active</span>
            </label>
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700"
            onClick={() => save.mutate()} loading={save.isPending} disabled={!form.name.trim()}>
            <Save className="h-4 w-4" /> {editing ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone, onClick }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-700',
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-blue-700',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={['rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full',
        onClick ? 'hover:border-violet-300 hover:shadow-md transition' : ''].join(' ')}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}
