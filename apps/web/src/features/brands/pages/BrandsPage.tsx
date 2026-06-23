import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Edit3, Trash2, Globe, Building2, X, Save,
  CheckCircle2, Sparkles, Package, ToggleLeft, Download, Eye,
  ExternalLink, RefreshCw, Filter, TrendingUp, Star, ArrowRight,
} from 'lucide-react';
import { brandsApi, type Brand, type UpsertBrandPayload } from '@/api/brands.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AvatarUpload } from '@/components/uploads';
import { toast } from 'sonner';

const empty: UpsertBrandPayload = {
  name: '', description: '', logoUrl: '', website: '', isActive: true,
};

type Filter = 'all' | 'active' | 'inactive';
type ViewMode = 'grid' | 'list';

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showForm, setShowForm] = useState(false);
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
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Brands</h2>
            <p className="mt-2 text-sm text-white/80">
              Manufacturer brands manage karein — logos, websites, descriptions sab ek jagah
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
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

      {/* ═══ TOP BRANDS LEADERBOARD ═══ */}
      {topBrands.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-violet-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b-2 border-violet-200 flex items-center justify-between">
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
              placeholder="Search brands by name, description, slug..."
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
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-xs font-bold transition border-l border-slate-200 ${viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              List
            </button>
          </div>
          {filtered.length > 0 && (
            <button onClick={exportCSV} className="h-11 px-4 rounded-xl border-2 border-slate-200 hover:border-violet-300 bg-white text-sm font-bold text-slate-700 inline-flex items-center gap-1.5 transition">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {[
            { v: 'all' as Filter, l: 'All', count: stats.total, c: 'bg-slate-900' },
            { v: 'active' as Filter, l: 'Active', count: stats.active, c: 'bg-emerald-600' },
            { v: 'inactive' as Filter, l: 'Inactive', count: stats.inactive, c: 'bg-rose-600' },
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

      {/* ═══ BRANDS GRID/LIST ═══ */}
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
            <Button onClick={openCreate} className="mt-5">
              <Plus className="h-4 w-4" /> Add Brand
            </Button>
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
                  <button
                    onClick={() => openEdit(b)}
                    className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-violet-100 hover:text-violet-700 flex items-center justify-center transition"
                    title="Edit"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete brand "${b.name}"? Yeh action undo nahi ho sakta.`)) {
                        removeMutation.mutate(b.id);
                      }
                    }}
                    className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition"
                    title="Delete"
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

      {/* ═══ FORM MODAL ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 my-8 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
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
              <Input label="Brand Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sun Fibre, Nestle, Samsung..." />
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
                <textarea
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 resize-none"
                  rows={3}
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Premium quality carpets manufacturer..."
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
                  className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500"
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
