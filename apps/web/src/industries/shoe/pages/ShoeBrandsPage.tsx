import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Award, Plus, Search, X, Edit3, Trash2, Star, StarOff, RefreshCw,
  Globe, Save, Sparkles, Package, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { shoeBrandsApi, type ShoeBrand } from '../api/brands.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';

export default function ShoeBrandsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [sportsOnly, setSportsOnly] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ShoeBrand | null>(null);

  const { data: brands = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['shoe-brands-page', premiumOnly, sportsOnly, localOnly],
    queryFn: () => shoeBrandsApi.list({
      premium: premiumOnly ? true : undefined,
      sports: sportsOnly ? true : undefined,
      local: localOnly ? true : undefined,
    }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q) || (b.code || '').toLowerCase().includes(q));
  }, [brands, search]);

  const stats = useMemo(() => ({
    total: brands.length,
    premium: brands.filter((b) => b.isPremium).length,
    sports: brands.filter((b) => b.isSportsBrand).length,
    local: brands.filter((b) => b.isLocal).length,
    totalRevenue: brands.reduce((s, b) => s + Number(b.totalRevenue || 0), 0),
  }), [brands]);

  const remove = useMutation({
    mutationFn: (id: string) => shoeBrandsApi.remove(id),
    onSuccess: () => { toast.success('Brand deactivated'); qc.invalidateQueries({ queryKey: ['shoe-brands-page'] }); },
  });

  const toggle = useMutation({
    mutationFn: (id: string) => shoeBrandsApi.toggleFeatured(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shoe-brands-page'] }),
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <BrandFormModal editing={editing} onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); qc.invalidateQueries({ queryKey: ['shoe-brands-page'] }); }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Award className="h-3.5 w-3.5 text-amber-300" /> Shoe Brands
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold">🏆 Brands</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.total} brands • {stats.premium} premium • {stats.local} local • Revenue{' '}
              <strong className="text-emerald-300">{formatPKR(stats.totalRevenue)}</strong>
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

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Brand name / code..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setPremiumOnly((v) => !v)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${premiumOnly ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200'}`}>
            ⭐ Premium
          </button>
          <button onClick={() => setSportsOnly((v) => !v)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${sportsOnly ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}`}>
            🏃 Sports
          </button>
          <button onClick={() => setLocalOnly((v) => !v)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${localOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200'}`}>
            🇵🇰 Local
          </button>
          <div className="ml-auto text-xs font-extrabold text-slate-500">{filtered.length} brands</div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-52 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Award className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No brands yet</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Add Nike, Adidas, Servis, Bata...</p>
          <Button className="mt-4 bg-gradient-to-r from-violet-600 to-purple-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add First Brand
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((b) => (
            <div key={b.id} className={`rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-lg transition ${b.isFeatured ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}>
              <div className="flex items-start gap-3">
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt="" className="h-16 w-16 rounded-2xl object-contain bg-white p-2 border-2 border-slate-200 shrink-0" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center font-extrabold text-2xl shrink-0">
                    {b.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 truncate">{b.name}</div>
                  {b.code && <div className="text-[10px] font-mono text-slate-500">{b.code}</div>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {b.isPremium && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold">PREMIUM</span>}
                    {b.isSportsBrand && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold">SPORTS</span>}
                    {b.isLocal && <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">LOCAL</span>}
                  </div>
                </div>
                <button onClick={() => toggle.mutate(b.id)} className={b.isFeatured ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}>
                  {b.isFeatured ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                </button>
              </div>

              {b.countryOfOrigin && (
                <div className="mt-2 text-xs text-slate-600 font-semibold flex items-center gap-1">
                  <Globe className="h-3 w-3" /> {b.countryOfOrigin}
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                <div>
                  <div className="text-[9px] uppercase font-extrabold text-slate-500">Products</div>
                  <div className="text-lg font-extrabold text-slate-900 tabular-nums">{(b as any).productCount || 0}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-extrabold text-slate-500">Revenue</div>
                  <div className="text-sm font-extrabold text-violet-700 tabular-nums">{formatPKR(b.totalRevenue || 0)}</div>
                </div>
              </div>

              <div className="mt-3 flex gap-1.5">
                <button onClick={() => { setEditing(b); setShowForm(true); }}
                  className="flex-1 h-9 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => { if (confirm(`Delete "${b.name}"?`)) remove.mutate(b.id); }}
                  className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
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
    websiteUrl: editing?.websiteUrl ?? '',
    isPremium: editing?.isPremium ?? false,
    isSportsBrand: editing?.isSportsBrand ?? false,
    isLocal: editing?.isLocal ?? false,
    authorizedDealer: editing?.authorizedDealer ?? false,
    dealerCode: editing?.dealerCode ?? '',
    warrantyPolicy: editing?.warrantyPolicy ?? '',
    returnPolicy: editing?.returnPolicy ?? '',
    isFeatured: editing?.isFeatured ?? false,
    isActive: editing?.isActive ?? true,
  });

  const save = useMutation({
    mutationFn: () => editing ? shoeBrandsApi.update(editing.id, form) : shoeBrandsApi.create(form),
    onSuccess: () => { toast.success(editing ? 'Brand updated' : 'Brand created'); onSaved(); },
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
              <Lbl>Brand Name *</Lbl>
              <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nike, Bata..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <Lbl>Brand Code</Lbl>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="NKE, BAT"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Country</Lbl>
              <input value={form.countryOfOrigin} onChange={(e) => setForm({ ...form, countryOfOrigin: e.target.value })} placeholder="USA, Pakistan..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <Lbl>Website</Lbl>
              <input type="url" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
          </div>
          <div>
            <Lbl>Logo</Lbl>
            {form.logoUrl ? (
              <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={form.logoUrl} className="w-full h-full object-contain bg-white p-2" />
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
          <div className="grid grid-cols-3 gap-2">
            <TogChk checked={form.isPremium} onChange={(v: boolean) => setForm({ ...form, isPremium: v })} label="⭐ Premium" />
            <TogChk checked={form.isSportsBrand} onChange={(v: boolean) => setForm({ ...form, isSportsBrand: v })} label="🏃 Sports" />
            <TogChk checked={form.isLocal} onChange={(v: boolean) => setForm({ ...form, isLocal: v })} label="🇵🇰 Local" />
          </div>
          <div>
            <Lbl>Return Policy</Lbl>
            <textarea rows={2} value={form.returnPolicy} onChange={(e) => setForm({ ...form, returnPolicy: e.target.value })} placeholder="Return terms..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
          </div>
        </div>
        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700" onClick={() => save.mutate()} loading={save.isPending} disabled={!form.name.trim()}>
            <Save className="h-4 w-4" /> {editing ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}

function TogChk({ checked, onChange, label }: any) {
  return (
    <label className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-2 ${checked ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white'}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded" />
      <span className="text-xs font-extrabold">{label}</span>
    </label>
  );
}
