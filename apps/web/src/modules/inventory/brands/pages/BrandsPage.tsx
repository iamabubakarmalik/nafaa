import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Edit3, Trash2, Globe, Building2, X, Save,
  CheckCircle2, Sparkles, Package, Download, ExternalLink,
  RefreshCw, Star, Grid3x3, List, Import, Zap, ChevronRight, Award,
} from 'lucide-react';
import { brandsApi, type Brand, type UpsertBrandPayload } from '@modules/inventory/brands/api/brands.api';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { AvatarUpload } from '@core/components/uploads';
import { toast } from 'sonner';
import { useIndustryPresets } from '@industries/_shared/presets';

const empty: UpsertBrandPayload = {
  name: '', description: '', logoUrl: '', website: '', isActive: true,
};

type FilterMode = 'all' | 'active' | 'inactive';
type ViewMode = 'grid' | 'list';

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const industryPresets = useIndustryPresets();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<UpsertBrandPayload>(empty);

  const { data: brands = [], refetch, isRefetching } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list(),
  });

  const saveMutation = useMutation({
    mutationFn: () => editing ? brandsApi.update(editing.id, form) : brandsApi.create(form),
    onSuccess: () => {
      toast.success(editing ? 'Brand updated' : 'Brand created');
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      closeForm();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (presets: Array<{ name: string; description?: string; website?: string }>) => {
      const results = await Promise.allSettled(
        presets.map((p) => brandsApi.create({
          name: p.name,
          description: p.description,
          website: p.website,
          isActive: true,
        }))
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      if (succeeded > 0) toast.success(`${succeeded} brands added`);
      if (failed > 0) toast.error(`${failed} failed (likely duplicates)`);
      setShowBulkImport(false);
      setSelectedPresets(new Set());
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: brandsApi.remove,
    onSuccess: () => {
      toast.success('Brand deleted');
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cannot delete - has products'),
  });

  const filtered = useMemo(() => {
    let result = [...brands];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((b) =>
        b.name.toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q) ||
        (b.slug || '').toLowerCase().includes(q)
      );
    }
    if (filter === 'active') result = result.filter((b) => b.isActive);
    else if (filter === 'inactive') result = result.filter((b) => !b.isActive);
    return result.sort((a, b) => (b._count?.products ?? 0) - (a._count?.products ?? 0));
  }, [brands, search, filter]);

  const stats = useMemo(() => {
    const totalProducts = brands.reduce((s, b) => s + (b._count?.products ?? 0), 0);
    const withLogos = brands.filter((b) => b.logoUrl).length;
    const withWebsite = brands.filter((b) => b.website).length;
    return {
      total: brands.length,
      active: brands.filter((b) => b.isActive).length,
      inactive: brands.filter((b) => !b.isActive).length,
      totalProducts, withLogos, withWebsite,
    };
  }, [brands]);

  const topBrands = useMemo(() => {
    return [...brands]
      .filter((b) => (b._count?.products ?? 0) > 0)
      .sort((a, b) => (b._count?.products ?? 0) - (a._count?.products ?? 0))
      .slice(0, 5);
  }, [brands]);

  const existingNames = new Set(brands.map((b) => b.name.toLowerCase()));
  const availablePresets = industryPresets.brands.filter(
    (s) => !existingNames.has(s.name.toLowerCase())
  );

  const openCreate = () => { setEditing(null); setForm(empty); setShowForm(true); };
  const openEdit = (b: Brand) => {
    setEditing(b);
    setForm({
      name: b.name, description: b.description ?? '', logoUrl: b.logoUrl ?? '',
      website: b.website ?? '', isActive: b.isActive,
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(empty); };

  const quickAdd = (preset: { name: string; description?: string; website?: string }) => {
    setEditing(null);
    setForm({
      name: preset.name,
      description: preset.description || '',
      website: preset.website || '',
      logoUrl: '',
      isActive: true,
    });
    setShowForm(true);
  };

  const togglePresetSelection = (name: string) => {
    setSelectedPresets((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const bulkAddSelected = () => {
    const toAdd = availablePresets.filter((p) => selectedPresets.has(p.name));
    if (toAdd.length === 0) return toast.error('Select at least one brand');
    bulkCreateMutation.mutate(toAdd);
  };

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('No data');
    const headers = ['Name', 'Slug', 'Description', 'Website', 'Active', 'Products', 'Created'];
    const rows = filtered.map((b) => [
      b.name, b.slug || '', b.description || '', b.website || '',
      b.isActive ? 'Yes' : 'No',
      b._count?.products ?? 0,
      new Date(b.createdAt).toLocaleDateString('en-PK'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brands-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <Building2 className="h-3.5 w-3.5 text-amber-300" />
              Brand Management
              {industryPresets.industryId && (
                <>
                  <span className="text-white/40">•</span>
                  <span>{industryPresets.industryEmoji} {industryPresets.industryName}</span>
                </>
              )}
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Brands</h2>
            <p className="mt-2 text-sm text-white/80">
              {industryPresets.industryId
                ? `Popular ${industryPresets.industryName} brands ready to import — click aur ho gaya!`
                : 'Manufacturer brands manage karein — logos, websites, descriptions sab ek jagah'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {availablePresets.length > 0 && (
              <button
                onClick={() => setShowBulkImport(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 border-2 border-amber-300/40 px-4 py-2.5 text-sm font-bold transition backdrop-blur"
              >
                <Import className="h-4 w-4" />
                Bulk Import ({availablePresets.length})
              </button>
            )}
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 backdrop-blur"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Button onClick={openCreate} className="bg-white text-slate-900 hover:bg-slate-100 shadow-lg">
              <Plus className="h-4 w-4" /> New Brand
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Brands" value={stats.total} sub={`${stats.active} active`} icon={Building2} color="violet" />
        <StatCard label="Total Products" value={stats.totalProducts} sub="Across all brands" icon={Package} color="blue" />
        <StatCard label="With Logos" value={stats.withLogos} sub={`${stats.total > 0 ? Math.round((stats.withLogos / stats.total) * 100) : 0}% complete`} icon={Sparkles} color="emerald" />
        <StatCard label="With Website" value={stats.withWebsite} sub="Online presence" icon={Globe} color="amber" />
      </section>

      {/* ═══ INDUSTRY QUICK ADD ═══ */}
      {availablePresets.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 border-2 border-violet-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-violet-900">
                  {industryPresets.industryEmoji} {industryPresets.industryName} — Popular Brands
                </h3>
                <p className="text-[11px] text-violet-700 font-bold">
                  {availablePresets.length} suggested brands for your industry
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBulkImport(true)}
              className="text-xs font-extrabold text-violet-700 hover:text-violet-800 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border-2 border-violet-300 hover:border-violet-400 transition"
            >
              <Import className="h-3 w-3" />
              Bulk Import All
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {availablePresets.slice(0, 12).map((s) => (
              <button
                key={s.name}
                onClick={() => quickAdd(s)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-violet-200 hover:border-violet-400 hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md shrink-0 group-hover:scale-110 transition-transform font-extrabold">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-slate-900 truncate">{s.name}</div>
                  {s.description && (
                    <div className="text-[9px] text-slate-500 font-semibold truncate">{s.description}</div>
                  )}
                </div>
                <Plus className="h-3 w-3 text-violet-500 shrink-0" />
              </button>
            ))}
          </div>
          {availablePresets.length > 12 && (
            <button
              onClick={() => setShowBulkImport(true)}
              className="mt-3 w-full py-2 rounded-xl bg-white/80 hover:bg-white border-2 border-violet-200 hover:border-violet-300 text-xs font-extrabold text-violet-700 transition"
            >
              + {availablePresets.length - 12} more brands — Open Bulk Import
            </button>
          )}
        </section>
      )}

      {/* ═══ TOP BRANDS ═══ */}
      {topBrands.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-violet-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b-2 border-violet-200">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="font-extrabold text-violet-900">Top Brands by Products</h3>
                <p className="text-[11px] text-violet-700 font-bold">Most popular brands</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-violet-100">
            {topBrands.map((b, idx) => {
              const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
              return (
                <div key={b.id} className="px-5 py-3 flex items-center gap-3 hover:bg-violet-50/30 transition">
                  <div className={`h-9 w-9 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md`}>
                    {idx < 3 ? <Star className="h-4 w-4 fill-white" /> : idx + 1}
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border">
                    {b.logoUrl ? (
                      <img src={b.logoUrl} alt={b.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-violet-700 text-white font-extrabold">
                        {b.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-slate-900 truncate">{b.name}</div>
                    {b.website && (
                      <a href={b.website} target="_blank" rel="noreferrer" className="text-[11px] text-violet-700 font-semibold hover:underline inline-flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" />
                        {b.website.replace(/^https?:\/\//, '').slice(0, 30)}
                      </a>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-violet-700 text-lg tabular-nums">{b._count?.products ?? 0}</div>
                    <div className="text-[10px] text-slate-500 font-bold">products</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ SEARCH + FILTERS ═══ */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
              placeholder="Search brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-xs font-bold transition ${viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-xs font-bold transition border-l ${viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          {filtered.length > 0 && (
            <button onClick={exportCSV} className="h-11 px-4 rounded-xl border-2 border-slate-200 hover:border-violet-300 bg-white text-sm font-bold text-slate-700 inline-flex items-center gap-1.5 transition">
              <Download className="h-4 w-4" /> Export
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {[
            { v: 'all' as FilterMode, l: 'All', count: stats.total, c: 'bg-slate-900' },
            { v: 'active' as FilterMode, l: 'Active', count: stats.active, c: 'bg-emerald-600' },
            { v: 'inactive' as FilterMode, l: 'Inactive', count: stats.inactive, c: 'bg-rose-600' },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setFilter(opt.v)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-2 ${
                filter === opt.v ? `${opt.c} text-white shadow-sm` : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.l}
              <span className={`px-1.5 rounded-full text-[10px] font-extrabold ${filter === opt.v ? 'bg-white/20' : 'bg-slate-200'}`}>
                {opt.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ BRANDS ═══ */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-200 flex items-center justify-center">
            <Building2 className="h-9 w-9 text-violet-600" />
          </div>
          <h3 className="mt-5 text-xl font-bold text-slate-900">
            {search || filter !== 'all' ? 'No matches' : 'No brands yet'}
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            {search || filter !== 'all' ? 'Try different search or filter' : 'Pehla brand add karein'}
          </p>
          {!search && filter === 'all' && (
            <div className="mt-5 flex gap-2 justify-center flex-wrap">
              {availablePresets.length > 0 && (
                <Button onClick={() => setShowBulkImport(true)} variant="secondary">
                  <Import className="h-4 w-4" /> Import from {industryPresets.industryName}
                </Button>
              )}
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add Manually
              </Button>
            </div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((b) => (
            <div
              key={b.id}
              className={`group rounded-2xl bg-white border-2 p-5 hover:border-violet-300 hover:shadow-xl hover:-translate-y-1 transition-all ${
                !b.isActive ? 'opacity-60 border-slate-200' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200 shadow-sm">
                  {b.logoUrl ? (
                    <img src={b.logoUrl} alt={b.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-700 text-white font-extrabold text-xl">
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-slate-900 truncate">{b.name}</h3>
                    {!b.isActive && (
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold">OFF</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 font-mono truncate">/{b.slug}</div>
                  {b.website && (
                    <a
                      href={b.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 mt-1.5 text-xs text-violet-700 hover:underline font-semibold"
                    >
                      <Globe className="h-3 w-3" /> Website <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>

              {b.description && (
                <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">{b.description}</p>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-extrabold">
                  <Package className="h-2.5 w-2.5" />
                  {b._count?.products ?? 0} products
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => openEdit(b)} className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-violet-100 hover:text-violet-700 flex items-center justify-center transition">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete brand "${b.name}"?`)) removeMutation.mutate(b.id);
                    }}
                    className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map((b) => (
              <div key={b.id} className={`px-5 py-3 hover:bg-slate-50 transition flex items-center gap-3 ${!b.isActive ? 'opacity-60' : ''}`}>
                <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden border shrink-0">
                  {b.logoUrl ? (
                    <img src={b.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-700 text-white font-extrabold">
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 truncate">{b.name}</span>
                    {!b.isActive && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold">OFF</span>}
                  </div>
                  <div className="text-xs text-slate-500 font-mono truncate">/{b.slug}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-blue-700">{b._count?.products ?? 0}</div>
                  <div className="text-[10px] text-slate-500 font-bold">products</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(b)} className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-violet-100 hover:text-violet-700 flex items-center justify-center transition">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete "${b.name}"?`)) removeMutation.mutate(b.id); }}
                    className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ BULK IMPORT MODAL ═══ */}
      {showBulkImport && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b-2 border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-lg">
                  <Import className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-slate-900">
                    {industryPresets.industryEmoji} Bulk Import — {industryPresets.industryName}
                  </h3>
                  <p className="text-xs text-slate-600 font-semibold">
                    {selectedPresets.size} of {availablePresets.length} selected
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowBulkImport(false); setSelectedPresets(new Set()); }} className="h-9 w-9 rounded-lg hover:bg-white flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <button onClick={() => setSelectedPresets(new Set(availablePresets.map((p) => p.name)))} className="text-xs font-extrabold text-violet-700 hover:underline">Select All</button>
                <span className="text-slate-300">•</span>
                <button onClick={() => setSelectedPresets(new Set())} className="text-xs font-extrabold text-slate-600 hover:underline">Deselect All</button>
              </div>
              <div className="text-xs text-slate-500 font-semibold">Existing brands are auto-hidden</div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid sm:grid-cols-2 gap-2">
                {availablePresets.map((p) => {
                  const selected = selectedPresets.has(p.name);
                  return (
                    <button
                      key={p.name}
                      onClick={() => togglePresetSelection(p.name)}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 transition text-left ${
                        selected
                          ? 'border-violet-500 bg-violet-50 shadow-md ring-2 ring-violet-200'
                          : 'border-slate-200 bg-white hover:border-violet-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center font-extrabold shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-extrabold text-slate-900 truncate">{p.name}</div>
                        {p.description && (
                          <div className="text-[10px] text-slate-600 font-semibold line-clamp-2">{p.description}</div>
                        )}
                        {p.website && (
                          <div className="text-[9px] text-violet-700 font-mono truncate mt-0.5">
                            <Globe className="h-2 w-2 inline mr-0.5" />
                            {p.website.replace(/^https?:\/\//, '').slice(0, 30)}
                          </div>
                        )}
                      </div>
                      {selected && <CheckCircle2 className="h-4 w-4 text-violet-600 shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-4 border-t-2 border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
              <div className="text-sm">
                <div className="font-extrabold text-slate-900">{selectedPresets.size} brands selected</div>
                <div className="text-xs text-slate-500 font-semibold">Bulk add will skip duplicates</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setShowBulkImport(false); setSelectedPresets(new Set()); }}>Cancel</Button>
                <Button
                  onClick={bulkAddSelected}
                  disabled={selectedPresets.size === 0}
                  loading={bulkCreateMutation.isPending}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                >
                  <Import className="h-4 w-4" />
                  Import {selectedPresets.size} Brands
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FORM MODAL ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-lg">
                  {editing ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-slate-900">{editing ? 'Edit Brand' : 'New Brand'}</h3>
                  <p className="text-xs text-slate-500">Manufacturer / company brand</p>
                </div>
              </div>
              <button onClick={closeForm} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Brand Logo</label>
                <AvatarUpload
                  value={form.logoUrl}
                  onChange={(url) => setForm({ ...form, logoUrl: url || '' })}
                  purpose="brand-logo"
                  shape="square"
                  size="lg"
                  fallbackText={form.name || 'B'}
                />
              </div>
              <Input label="Brand Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter brand name..." />
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
                <textarea
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 resize-none"
                  rows={3}
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="About this brand..."
                />
              </div>
              <Input
                label="Website"
                value={form.website ?? ''}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://example.com"
              />
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border-2 border-slate-200 cursor-pointer hover:border-violet-300 transition">
                <div className="flex items-center gap-2.5">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${form.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {form.isActive ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-extrabold">{form.isActive ? 'Active' : 'Inactive'}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">Show in product forms</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-5 w-5 rounded"
                />
              </label>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={closeForm} className="flex-1">Cancel</Button>
                <Button
                  onClick={() => {
                    if (!form.name.trim()) return toast.error('Name required');
                    saveMutation.mutate();
                  }}
                  loading={saveMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                >
                  <Save className="h-4 w-4" /> {editing ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: any = {
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
          {sub && <div className="text-xs text-slate-600 font-semibold mt-1">{sub}</div>}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0 ml-2`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
