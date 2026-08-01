import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Award, Plus, Search, X, Edit3, Trash2, Star, StarOff,
  RefreshCw, Globe, Phone, Mail, CheckCircle2, Crown,
  Grid3x3, List, Save, Package, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cosmeticsBrandsApi, type CosmeticsBrand } from '../api/brands.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { UploadDropzone } from '@core/components/uploads';

type ViewMode = 'grid' | 'table';

export default function CosmeticsBrandsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [halalOnly, setHalalOnly] = useState(false);
  const [crueltyFreeOnly, setCrueltyFreeOnly] = useState(false);
  const [view, setView] = useState<ViewMode>('grid');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CosmeticsBrand | null>(null);

  const { data: brands = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['cosmetics-brands-all', premiumOnly, halalOnly, crueltyFreeOnly],
    queryFn: () => cosmeticsBrandsApi.list({
      premium: premiumOnly ? true : undefined,
      halal: halalOnly ? true : undefined,
      crueltyFree: crueltyFreeOnly ? true : undefined,
    }),
  });

  const { data: certified } = useQuery({
    queryKey: ['cosmetics-brands-certified'],
    queryFn: () => cosmeticsBrandsApi.certified(),
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
    premium: brands.filter((b) => b.isPremium).length,
    featured: brands.filter((b) => b.isFeatured).length,
    totalRevenue: brands.reduce((s, b) => s + Number(b.totalRevenue || 0), 0),
  }), [brands]);

  const removeMutation = useMutation({
    mutationFn: (id: string) => cosmeticsBrandsApi.remove(id),
    onSuccess: () => {
      toast.success('Brand deleted');
      qc.invalidateQueries({ queryKey: ['cosmetics-brands-all'] });
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: (id: string) => cosmeticsBrandsApi.toggleFeatured(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cosmetics-brands-all'] }),
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <BrandFormModal editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false); setEditing(null);
            qc.invalidateQueries({ queryKey: ['cosmetics-brands-all'] });
          }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Award className="h-3.5 w-3.5 text-amber-300" /> Cosmetics Brands
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🎖️ Beauty Brands</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.total} brands • {stats.premium} premium • Revenue{' '}
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

      {certified && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi icon={Award} label="Halal Brands" value={certified.halal} tone="emerald" onClick={() => setHalalOnly((v) => !v)} />
          <Kpi icon={Star} label="Cruelty-Free" value={certified.crueltyFree} tone="pink" onClick={() => setCrueltyFreeOnly((v) => !v)} />
          <Kpi icon={Package} label="Vegan Brands" value={certified.vegan} tone="green" />
          <Kpi icon={Crown} label="Premium" value={stats.premium} tone="violet" onClick={() => setPremiumOnly((v) => !v)} />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Brand name, code, country..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="inline-flex rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
            <button onClick={() => setView('grid')} className={`px-4 h-12 ${view === 'grid' ? 'bg-pink-600 text-white' : 'text-slate-600'}`}>
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button onClick={() => setView('table')} className={`px-4 h-12 border-l-2 border-slate-200 ${view === 'table' ? 'bg-pink-600 text-white' : 'text-slate-600'}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => setPremiumOnly(!premiumOnly)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${premiumOnly ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-700'}`}>
            <Crown className="h-3.5 w-3.5" /> Premium
          </button>
          <button onClick={() => setHalalOnly(!halalOnly)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${halalOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-700'}`}>
            🕌 Halal
          </button>
          <button onClick={() => setCrueltyFreeOnly(!crueltyFreeOnly)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${crueltyFreeOnly ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-700'}`}>
            🐰 Cruelty-Free
          </button>
          <div className="ml-auto text-xs font-extrabold text-slate-500">{filtered.length} brands</div>
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
          <p className="text-sm text-slate-500 font-semibold mt-1">Add Maybelline, MAC, Fenty, Estée Lauder...</p>
          <Button className="mt-4 bg-gradient-to-r from-pink-600 to-rose-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add First Brand
          </Button>
        </div>
      ) : view === 'grid' ? (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((b) => (
            <BrandCard key={b.id} brand={b}
              onEdit={() => { setEditing(b); setShowForm(true); }}
              onDelete={() => { if (confirm(`Delete "${b.name}"?`)) removeMutation.mutate(b.id); }}
              onToggleFeatured={() => toggleFeatured.mutate(b.id)} />
          ))}
        </section>
      ) : (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <Th>Brand</Th><Th>Country</Th>
                  <Th className="text-center">Certifications</Th>
                  <Th className="text-right">Products</Th>
                  <Th className="text-right">Revenue</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-pink-50/40">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        {b.logoUrl ? (
                          <img src={b.logoUrl} className="h-10 w-10 rounded-lg object-contain bg-white p-1 border border-slate-200" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center font-extrabold">
                            {b.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm inline-flex items-center gap-1">
                            {b.name}
                            {b.isPremium && <Crown className="h-3 w-3 text-violet-600 fill-violet-100" />}
                          </div>
                          {b.code && <div className="text-[10px] font-mono text-slate-500">{b.code}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold text-slate-700">{b.countryOfOrigin || '—'}</td>
                    <td className="px-3 py-2.5 text-center text-sm">
                      {b.isHalalCertified && '🕌 '}
                      {b.isCrueltyFree && '🐰 '}
                      {b.isVegan && '🌱 '}
                      {b.isOrganic && '🌿'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-extrabold tabular-nums">{b.totalProducts || 0}</td>
                    <td className="px-3 py-2.5 text-right font-extrabold text-pink-700 tabular-nums">{formatPKR(b.totalRevenue || 0)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleFeatured.mutate(b.id)}
                          className={`h-8 w-8 rounded-lg flex items-center justify-center ${b.isFeatured ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                          <Star className={`h-3.5 w-3.5 ${b.isFeatured ? 'fill-current' : ''}`} />
                        </button>
                        <button onClick={() => { setEditing(b); setShowForm(true); }}
                          className="h-8 w-8 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 flex items-center justify-center">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => { if (confirm(`Delete "${b.name}"?`)) removeMutation.mutate(b.id); }}
                          className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function BrandCard({ brand: b, onEdit, onDelete, onToggleFeatured }: any) {
  return (
    <div className={`group relative rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-xl hover:-translate-y-0.5 transition ${
      b.isFeatured ? 'border-amber-400 ring-2 ring-amber-100' : b.isPremium ? 'border-violet-300' : 'border-slate-200'}`}>
      <div className="flex items-start gap-3">
        {b.logoUrl ? (
          <img src={b.logoUrl} className="h-14 w-14 rounded-xl object-contain bg-white p-1.5 border-2 border-slate-200 shrink-0" />
        ) : (
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-pink-500 to-rose-700 text-white flex items-center justify-center font-extrabold text-xl shrink-0 shadow">
            {b.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-slate-900 truncate inline-flex items-center gap-1">
            {b.name}
            {b.isPremium && <Crown className="h-3.5 w-3.5 text-violet-600 fill-violet-100" />}
          </h3>
          {b.countryOfOrigin && <div className="text-xs font-bold text-slate-500 mt-0.5">📍 {b.countryOfOrigin}</div>}
        </div>
        <button onClick={onToggleFeatured}
          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
            b.isFeatured ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
          {b.isFeatured ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {b.isHalalCertified && <Cert emoji="🕌" label="Halal" tone="emerald" />}
        {b.isCrueltyFree && <Cert emoji="🐰" label="CF" tone="pink" />}
        {b.isVegan && <Cert emoji="🌱" label="Vegan" tone="green" />}
        {b.isOrganic && <Cert emoji="🌿" label="Organic" tone="teal" />}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Products</div>
          <div className="text-lg font-extrabold text-slate-900 tabular-nums">{b.totalProducts || 0}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Revenue</div>
          <div className="text-sm font-extrabold text-pink-700 tabular-nums">{formatPKR(b.totalRevenue || 0)}</div>
        </div>
      </div>

      <div className="mt-3 flex gap-1.5">
        <button onClick={onEdit}
          className="flex-1 h-9 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
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
    isPremium: editing?.isPremium ?? false,
    isCrueltyFree: editing?.isCrueltyFree ?? false,
    isVegan: editing?.isVegan ?? false,
    isOrganic: editing?.isOrganic ?? false,
    isHalalCertified: editing?.isHalalCertified ?? false,
    isDermatologistTested: editing?.isDermatologistTested ?? false,
    authorizedDealer: editing?.authorizedDealer ?? false,
    dealerCode: editing?.dealerCode ?? '',
    isFeatured: editing?.isFeatured ?? false,
    isActive: editing?.isActive ?? true,
  });

  const save = useMutation({
    mutationFn: () => editing
      ? cosmeticsBrandsApi.update(editing.id, form)
      : cosmeticsBrandsApi.create(form),
    onSuccess: () => {
      toast.success(editing ? 'Brand updated' : 'Brand created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-pink-600 to-rose-700 text-white flex items-center justify-between">
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
                placeholder="Maybelline, MAC, Fenty..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <Lbl>Brand Code</Lbl>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="MYB, MAC"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-pink-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Country of Origin</Lbl>
              <input value={form.countryOfOrigin} onChange={(e) => setForm({ ...form, countryOfOrigin: e.target.value })}
                placeholder="USA, France, Korea..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <Lbl>Website URL</Lbl>
              <input type="url" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                placeholder="https://..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
            </div>
          </div>

          <div>
            <Lbl>Description</Lbl>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brand story, positioning..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-pink-500" />
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

          <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4">
            <div className="text-xs font-extrabold uppercase text-emerald-800 mb-3">Certifications & Claims</div>
            <div className="grid sm:grid-cols-2 gap-2">
              <ChkBox checked={form.isHalalCertified} onChange={(v: boolean) => setForm({ ...form, isHalalCertified: v })} emoji="🕌" label="Halal Certified" />
              <ChkBox checked={form.isCrueltyFree} onChange={(v: boolean) => setForm({ ...form, isCrueltyFree: v })} emoji="🐰" label="Cruelty-Free" />
              <ChkBox checked={form.isVegan} onChange={(v: boolean) => setForm({ ...form, isVegan: v })} emoji="🌱" label="Vegan" />
              <ChkBox checked={form.isOrganic} onChange={(v: boolean) => setForm({ ...form, isOrganic: v })} emoji="🌿" label="Organic" />
              <ChkBox checked={form.isDermatologistTested} onChange={(v: boolean) => setForm({ ...form, isDermatologistTested: v })} emoji="👨‍⚕️" label="Derm Tested" />
              <ChkBox checked={form.isPremium} onChange={(v: boolean) => setForm({ ...form, isPremium: v })} emoji="👑" label="Premium Brand" />
            </div>
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
          <Button className="flex-1 bg-gradient-to-r from-pink-600 to-rose-700"
            onClick={() => save.mutate()} loading={save.isPending} disabled={!form.name.trim()}>
            <Save className="h-4 w-4" /> {editing ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChkBox({ checked, onChange, emoji, label }: any) {
  return (
    <label className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition ${
      checked ? 'border-emerald-500 bg-white' : 'border-slate-200 bg-white opacity-60'}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded" />
      <span className="text-lg">{emoji}</span>
      <span className="text-xs font-extrabold text-slate-800 flex-1">{label}</span>
      {checked && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
    </label>
  );
}

function Cert({ emoji, label, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-800',
    pink: 'bg-pink-100 text-pink-800',
    green: 'bg-green-100 text-green-800',
    teal: 'bg-teal-100 text-teal-800',
  };
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${tones[tone]}`}>
      {emoji} {label}
    </span>
  );
}

function Th({ children, className = '' }: any) {
  return <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 ${className}`}>{children}</th>;
}

function Kpi({ icon: Icon, label, value, tone, onClick }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-700',
    pink: 'from-pink-500 to-rose-700',
    green: 'from-green-500 to-emerald-700',
    violet: 'from-violet-500 to-purple-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick}
      className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-pink-300 hover:shadow-md transition' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
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
