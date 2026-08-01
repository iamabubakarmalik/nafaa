import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Award, Plus, Search, X, Edit3, Trash2, Star, StarOff,
  RefreshCw, Globe, Phone, Mail, CheckCircle2, Grid3x3, List,
  Save, Package, TrendingUp, Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { sportsBrandsApi, type SportsBrand, type SportsBrandTier } from '../api/brands.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { UploadDropzone } from '@core/components/uploads';

type ViewMode = 'grid' | 'table';

const TIER_META: Record<SportsBrandTier, { label: string; color: string; bg: string; emoji: string }> = {
  PREMIUM: { label: 'Premium', color: 'text-amber-800', bg: 'bg-amber-100 border-amber-300', emoji: '⭐' },
  MID_RANGE: { label: 'Mid Range', color: 'text-blue-800', bg: 'bg-blue-100 border-blue-300', emoji: '⚡' },
  ECONOMY: { label: 'Economy', color: 'text-emerald-800', bg: 'bg-emerald-100 border-emerald-300', emoji: '💰' },
  LOCAL: { label: 'Local', color: 'text-violet-800', bg: 'bg-violet-100 border-violet-300', emoji: '🏠' },
};

export default function SportsBrandsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [authorizedOnly, setAuthorizedOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [view, setView] = useState<ViewMode>('grid');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SportsBrand | null>(null);

  const { data: brands = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sports-brands', tierFilter, authorizedOnly, featuredOnly],
    queryFn: () => sportsBrandsApi.list({
      tier: tierFilter === 'all' ? undefined : tierFilter,
      authorized: authorizedOnly ? true : undefined,
      featured: featuredOnly ? true : undefined,
    }),
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
    featured: brands.filter((b) => b.isFeatured).length,
    premium: brands.filter((b) => b.brandTier === 'PREMIUM').length,
    totalRevenue: brands.reduce((s, b) => s + Number(b.totalRevenue || 0), 0),
  }), [brands]);

  const removeMutation = useMutation({
    mutationFn: (id: string) => sportsBrandsApi.remove(id),
    onSuccess: () => {
      toast.success('Brand deactivated');
      qc.invalidateQueries({ queryKey: ['sports-brands'] });
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: (id: string) => sportsBrandsApi.toggleFeatured(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sports-brands'] }),
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <BrandFormModal editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['sports-brands'] });
          }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Award className="h-3.5 w-3.5 text-amber-300" /> Sports Brands
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🎖️ Brands</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.total} brands • {stats.authorized} authorized • Revenue{' '}
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

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={Award} label="Total Brands" value={stats.total} tone="violet" />
        <Kpi icon={CheckCircle2} label="Authorized" value={stats.authorized} tone="emerald" onClick={() => setAuthorizedOnly(!authorizedOnly)} />
        <Kpi icon={Star} label="Featured" value={stats.featured} tone="amber" onClick={() => setFeaturedOnly(!featuredOnly)} />
        <Kpi icon={Trophy} label="Premium" value={stats.premium} tone="orange" onClick={() => setTierFilter('PREMIUM')} />
        <Kpi icon={TrendingUp} label="Revenue" value={formatPKR(stats.totalRevenue)} tone="blue" />
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Brand name, code, country..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="inline-flex rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
            <button onClick={() => setView('grid')} className={`px-4 h-12 ${view === 'grid' ? 'bg-violet-600 text-white' : 'text-slate-600'}`}>
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button onClick={() => setView('table')} className={`px-4 h-12 border-l-2 border-slate-200 ${view === 'table' ? 'bg-violet-600 text-white' : 'text-slate-600'}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={() => setTierFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${tierFilter === 'all' ? 'bg-violet-600 text-white' : 'text-slate-600'}`}>
              All Tiers
            </button>
            {(['PREMIUM', 'MID_RANGE', 'ECONOMY', 'LOCAL'] as SportsBrandTier[]).map((t) => (
              <button key={t} onClick={() => setTierFilter(tierFilter === t ? 'all' : t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 ${tierFilter === t ? 'bg-violet-600 text-white' : 'text-slate-600'}`}>
                {TIER_META[t].emoji} {TIER_META[t].label}
              </button>
            ))}
          </div>
          <button onClick={() => setAuthorizedOnly(!authorizedOnly)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${authorizedOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-700'}`}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Authorized
          </button>
          <button onClick={() => setFeaturedOnly(!featuredOnly)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${featuredOnly ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-700'}`}>
            <Star className={`h-3.5 w-3.5 ${featuredOnly ? 'fill-current' : ''}`} /> Featured
          </button>
          <div className="ml-auto text-xs font-extrabold text-slate-500">{filtered.length} brands</div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-200 flex items-center justify-center">
            <Award className="h-10 w-10 text-violet-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900">No brands yet</h3>
          <p className="text-sm text-slate-500 mt-2 font-semibold">Add SS, MRF, Adidas, Nike, Yonex...</p>
          <Button className="mt-4 bg-gradient-to-r from-violet-600 to-purple-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add First Brand
          </Button>
        </div>
      ) : view === 'grid' ? (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((b) => (
            <BrandCard key={b.id} brand={b}
              onEdit={() => { setEditing(b); setShowForm(true); }}
              onDelete={() => { if (confirm(`Deactivate "${b.name}"?`)) removeMutation.mutate(b.id); }}
              onToggleFeatured={() => toggleFeatured.mutate(b.id)} />
          ))}
        </section>
      ) : (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b-2 border-slate-200">
              <tr>
                <Th>Brand</Th><Th>Tier</Th><Th>Country</Th>
                <Th className="text-center">Status</Th>
                <Th className="text-right">Revenue</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((b) => {
                const tier = (TIER_META as any)[b.brandTier];
                return (
                  <tr key={b.id} className="hover:bg-violet-50/40">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        {b.logoUrl ? (
                          <img src={b.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-white p-1 border border-slate-200" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-extrabold">{b.name.charAt(0)}</div>
                        )}
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">{b.name}</div>
                          {b.code && <div className="text-[10px] font-mono text-slate-500">{b.code}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${tier.bg} ${tier.color}`}>
                        {tier.emoji} {tier.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold text-slate-700">{b.countryOfOrigin || '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        {b.authorizedDealer && <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">AUTH</span>}
                        {b.isFeatured && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-extrabold text-violet-700 tabular-nums">{formatPKR(b.totalRevenue || 0)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleFeatured.mutate(b.id)}
                          className={`h-8 w-8 rounded-lg flex items-center justify-center ${b.isFeatured ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                          <Star className={`h-3.5 w-3.5 ${b.isFeatured ? 'fill-current' : ''}`} />
                        </button>
                        <button onClick={() => { setEditing(b); setShowForm(true); }}
                          className="h-8 w-8 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 flex items-center justify-center">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => { if (confirm(`Deactivate "${b.name}"?`)) removeMutation.mutate(b.id); }}
                          className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function BrandCard({ brand: b, onEdit, onDelete, onToggleFeatured }: any) {
  const tier = (TIER_META as any)[b.brandTier];
  return (
    <div className={`group relative rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-xl hover:-translate-y-0.5 transition ${
      b.isFeatured ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}>
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
          {b.countryOfOrigin && (
            <div className="text-xs font-bold text-slate-500 mt-0.5">📍 {b.countryOfOrigin}</div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${tier.bg} ${tier.color}`}>
              {tier.emoji} {tier.label}
            </span>
            {b.authorizedDealer && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                <CheckCircle2 className="h-2.5 w-2.5" /> Auth
              </span>
            )}
          </div>
        </div>
        <button onClick={onToggleFeatured}
          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
            b.isFeatured ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
          {b.isFeatured ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
        </button>
      </div>

      {b.description && (
        <p className="mt-3 text-xs text-slate-600 font-semibold line-clamp-2">{b.description}</p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Products</div>
          <div className="text-lg font-extrabold text-slate-900 tabular-nums">{b.productCount || b.totalProducts || 0}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Revenue</div>
          <div className="text-sm font-extrabold text-violet-700 tabular-nums">{formatPKR(b.totalRevenue || 0)}</div>
        </div>
      </div>

      {(b.supportPhone || b.supportEmail || b.websiteUrl) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
          {b.websiteUrl && (
            <a href={b.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-extrabold">
              <Globe className="h-2.5 w-2.5" /> Web
            </a>
          )}
          {b.supportPhone && (
            <a href={`tel:${b.supportPhone}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
              <Phone className="h-2.5 w-2.5" /> Call
            </a>
          )}
          {b.supportEmail && (
            <a href={`mailto:${b.supportEmail}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-[10px] font-extrabold">
              <Mail className="h-2.5 w-2.5" /> Email
            </a>
          )}
        </div>
      )}

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
    websiteUrl: editing?.websiteUrl ?? '',
    brandTier: editing?.brandTier ?? 'MID_RANGE',
    authorizedDealer: editing?.authorizedDealer ?? false,
    dealerCode: editing?.dealerCode ?? '',
    supportPhone: editing?.supportPhone ?? '',
    supportEmail: editing?.supportEmail ?? '',
    warrantyPolicy: editing?.warrantyPolicy ?? '',
    isFeatured: editing?.isFeatured ?? false,
    isActive: editing?.isActive ?? true,
  });

  const save = useMutation({
    mutationFn: () => editing
      ? sportsBrandsApi.update(editing.id, form)
      : sportsBrandsApi.create(form),
    onSuccess: () => {
      toast.success(editing ? 'Brand updated' : 'Brand created');
      onSaved();
    },
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
              <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="SS, MRF, Adidas..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <Lbl>Brand Code</Lbl>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="SS, MRF, ADI"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500" />
            </div>
          </div>

          <div>
            <Lbl>Brand Tier *</Lbl>
            <div className="grid grid-cols-4 gap-2">
              {(['PREMIUM', 'MID_RANGE', 'ECONOMY', 'LOCAL'] as SportsBrandTier[]).map((t) => {
                const meta = TIER_META[t];
                const active = form.brandTier === t;
                return (
                  <button key={t} type="button" onClick={() => setForm({ ...form, brandTier: t })}
                    className={`p-3 rounded-xl border-2 transition flex flex-col items-center gap-1 ${
                      active ? 'border-violet-600 bg-violet-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-400'}`}>
                    <span className="text-lg">{meta.emoji}</span>
                    <span className="text-[10px] font-extrabold text-center">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Country of Origin</Lbl>
              <input value={form.countryOfOrigin} onChange={(e) => setForm({ ...form, countryOfOrigin: e.target.value })}
                placeholder="Pakistan, India, England..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <Lbl>Website</Lbl>
              <input type="url" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                placeholder="https://brand.com"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
          </div>

          <div>
            <Lbl>Description</Lbl>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="About the brand..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
          </div>

          <div>
            <Lbl>Logo</Lbl>
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
                <div className="text-xs text-emerald-700 font-semibold">Official brand partnership</div>
              </div>
            </label>
            {form.authorizedDealer && (
              <div>
                <Lbl>Dealer Code</Lbl>
                <input value={form.dealerCode} onChange={(e) => setForm({ ...form, dealerCode: e.target.value })}
                  placeholder="AUTH-2026-001"
                  className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-extrabold uppercase text-slate-600 mb-2">📞 Support Contact</div>
            <div className="grid sm:grid-cols-2 gap-2">
              <input value={form.supportPhone} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
                placeholder="Phone"
                className="h-11 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
              <input type="email" value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                placeholder="Email"
                className="h-11 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
          </div>

          <div>
            <Lbl>Warranty Policy</Lbl>
            <textarea rows={2} value={form.warrantyPolicy} onChange={(e) => setForm({ ...form, warrantyPolicy: e.target.value })}
              placeholder="Warranty terms..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-amber-200 bg-amber-50 cursor-pointer">
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

function Th({ children, className = '' }: any) {
  return <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 ${className}`}>{children}</th>;
}

function Kpi({ icon: Icon, label, value, tone, onClick }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-700', emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-orange-600', orange: 'from-orange-500 to-red-700',
    blue: 'from-blue-500 to-blue-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick} className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-violet-300 hover:shadow-md transition' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </C>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
