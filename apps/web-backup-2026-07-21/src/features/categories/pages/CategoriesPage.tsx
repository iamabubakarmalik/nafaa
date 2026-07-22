import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tag, Plus, Trash2, Package, Search, X, Edit3, Save, Sparkles,
  Download, RefreshCw, Star, Palette, Filter, Zap, CheckCircle2,
  ChevronRight, Grid3x3, List, Import,
} from 'lucide-react';
import { categoriesApi } from '@/api/categories.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { useIndustryPresets } from '@/features/industries/_shared/presets';

const COLOR_PRESETS = [
  '#2c9466', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#a855f7', '#f97316',
  '#10b981', '#6366f1', '#d946ef', '#eab308', '#14b8a6',
  '#dc2626', '#f97316', '#78350f', '#0ea5e9', '#16a34a',
];

type FilterMode = 'all' | 'used' | 'unused';
type ViewMode = 'grid' | 'list';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const industryPresets = useIndustryPresets();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());

  const { data: categories = [], refetch, isRefetching } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      toast.success(editing ? 'Category updated' : 'Category added');
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (presets: Array<{ name: string; color: string }>) => {
      const results = await Promise.allSettled(
        presets.map((p) => categoriesApi.create({ name: p.name, color: p.color }))
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      if (succeeded > 0) toast.success(`${succeeded} categories added`);
      if (failed > 0) toast.error(`${failed} failed (likely duplicates)`);
      setShowBulkImport(false);
      setSelectedPresets(new Set());
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.remove,
    onSuccess: () => {
      toast.success('Category deleted');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cannot delete'),
  });

  const filtered = useMemo(() => {
    let result = [...categories];
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((c: any) => c.name.toLowerCase().includes(q));
    if (filter === 'used') result = result.filter((c: any) => (c._count?.products ?? 0) > 0);
    else if (filter === 'unused') result = result.filter((c: any) => (c._count?.products ?? 0) === 0);
    return result.sort((a: any, b: any) => (b._count?.products ?? 0) - (a._count?.products ?? 0));
  }, [categories, search, filter]);

  const stats = useMemo(() => {
    const totalProducts = categories.reduce((s: number, c: any) => s + (c._count?.products ?? 0), 0);
    const used = categories.filter((c: any) => (c._count?.products ?? 0) > 0).length;
    return { total: categories.length, used, unused: categories.length - used, totalProducts };
  }, [categories]);

  const topCategories = useMemo(() => {
    return [...categories]
      .filter((c: any) => (c._count?.products ?? 0) > 0)
      .sort((a: any, b: any) => (b._count?.products ?? 0) - (a._count?.products ?? 0))
      .slice(0, 5);
  }, [categories]);

  const existingNames = new Set(categories.map((c: any) => c.name.toLowerCase()));
  const availablePresets = industryPresets.categories.filter(
    (s) => !existingNames.has(s.name.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setName('');
    setColor(COLOR_PRESETS[0]);
    setShowForm(true);
  };

  const openEdit = (cat: any) => {
    setEditing(cat);
    setName(cat.name);
    setColor(cat.color);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setName('');
    setColor(COLOR_PRESETS[0]);
  };

  const quickAdd = (preset: { name: string; color: string }) => {
    setEditing(null);
    setName(preset.name);
    setColor(preset.color);
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

  const selectAllPresets = () => setSelectedPresets(new Set(availablePresets.map((p) => p.name)));
  const deselectAllPresets = () => setSelectedPresets(new Set());

  const bulkAddSelected = () => {
    const toAdd = availablePresets.filter((p) => selectedPresets.has(p.name));
    if (toAdd.length === 0) return toast.error('Select at least one category');
    bulkCreateMutation.mutate(toAdd);
  };

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('No data');
    const headers = ['Name', 'Color', 'Products Count'];
    const rows = filtered.map((c: any) => [c.name, c.color, c._count?.products ?? 0]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categories-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-green-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-green-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <Tag className="h-3.5 w-3.5 text-amber-300" />
              Product Organization
              {industryPresets.industryId && (
                <>
                  <span className="text-white/40">•</span>
                  <span>{industryPresets.industryEmoji} {industryPresets.industryName}</span>
                </>
              )}
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Categories</h2>
            <p className="mt-2 text-sm text-white/80">
              {industryPresets.industryId
                ? `${industryPresets.industryName} industry ke liye ready-made suggestions available hain — click karke add karo`
                : 'Apne products ko groups mein organize karein for fast filtering'}
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
              <Plus className="h-4 w-4" /> New Category
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Categories" value={stats.total} sub="All groups" icon={Tag} color="emerald" />
        <StatCard label="In Use" value={stats.used} sub={`${stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0}% utilized`} icon={Sparkles} color="blue" />
        <StatCard label="Unused" value={stats.unused} sub="Ready to use" icon={Tag} color="slate" />
        <StatCard label="Total Products" value={stats.totalProducts} sub="Categorized items" icon={Package} color="violet" />
      </section>

      {/* ═══ INDUSTRY QUICK ADD ═══ */}
      {availablePresets.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-md">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-emerald-900">
                  {industryPresets.industryEmoji} {industryPresets.industryName} — Quick Add
                </h3>
                <p className="text-[11px] text-emerald-700 font-bold">
                  {availablePresets.length} suggested categories for your industry
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBulkImport(true)}
              className="text-xs font-extrabold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border-2 border-emerald-300 hover:border-emerald-400 transition"
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
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 transition-all group"
                style={{ borderColor: `${s.color}50` }}
              >
                <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-110 transition-transform" style={{ backgroundColor: s.color }}>
                  <Tag className="h-4 w-4" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-slate-900 truncate">{s.name}</div>
                  <div className="text-[9px] text-slate-500 font-bold inline-flex items-center gap-0.5">
                    <Plus className="h-2.5 w-2.5" />
                    Click to add
                  </div>
                </div>
              </button>
            ))}
          </div>
          {availablePresets.length > 12 && (
            <button
              onClick={() => setShowBulkImport(true)}
              className="mt-3 w-full py-2 rounded-xl bg-white/80 hover:bg-white border-2 border-emerald-200 hover:border-emerald-300 text-xs font-extrabold text-emerald-700 transition"
            >
              + {availablePresets.length - 12} more suggestions — Open Bulk Import
            </button>
          )}
        </section>
      )}

      {/* ═══ TOP CATEGORIES ═══ */}
      {topCategories.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-emerald-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b-2 border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="font-extrabold text-emerald-900">Top Categories by Products</h3>
                <p className="text-[11px] text-emerald-700 font-bold">Most populated groups</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-emerald-100">
            {topCategories.map((c: any, idx: number) => {
              const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-emerald-500', 'bg-green-500'];
              return (
                <div key={c.id} className="px-5 py-3 flex items-center gap-3 hover:bg-emerald-50/30 transition">
                  <div className={`h-8 w-8 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md`}>
                    {idx < 3 ? <Star className="h-4 w-4 fill-white" /> : idx + 1}
                  </div>
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0" style={{ backgroundColor: c.color }}>
                    <Tag className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-slate-900 truncate">{c.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">{c.color}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 text-lg tabular-nums">{c._count?.products ?? 0}</div>
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
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              placeholder="Search categories..."
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
              className={`px-3 py-2 text-xs font-bold transition ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-xs font-bold transition border-l ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          {filtered.length > 0 && (
            <button onClick={exportCSV} className="h-11 px-4 rounded-xl border-2 border-slate-200 hover:border-emerald-300 bg-white text-sm font-bold text-slate-700 inline-flex items-center gap-1.5 transition">
              <Download className="h-4 w-4" /> Export
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {[
            { v: 'all' as FilterMode, l: 'All', count: stats.total, c: 'bg-slate-900' },
            { v: 'used' as FilterMode, l: 'In Use', count: stats.used, c: 'bg-emerald-600' },
            { v: 'unused' as FilterMode, l: 'Unused', count: stats.unused, c: 'bg-rose-600' },
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

      {/* ═══ CATEGORIES GRID/LIST ═══ */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-green-200 flex items-center justify-center">
            <Tag className="h-9 w-9 text-emerald-600" />
          </div>
          <h3 className="mt-5 text-xl font-bold text-slate-900">
            {search || filter !== 'all' ? 'No matches' : 'No categories yet'}
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            {search || filter !== 'all' ? 'Try different search or filter' : 'Pehli category add karein'}
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
          {filtered.map((cat: any) => (
            <div
              key={cat.id}
              className="group rounded-2xl bg-white border-2 border-slate-200 p-5 hover:border-emerald-300 hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                  style={{ backgroundColor: cat.color, boxShadow: `0 10px 25px -5px ${cat.color}40` }}
                >
                  <Tag className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-slate-900 truncate">{cat.name}</h3>
                  <div className="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1 font-semibold">
                    <Package className="h-3 w-3" />
                    {cat._count?.products ?? 0} products
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1 uppercase">{cat.color}</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between opacity-0 group-hover:opacity-100 transition">
                <div className="text-[10px] text-slate-500 font-bold">Click to manage</div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(cat)}
                    className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 flex items-center justify-center transition"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete category "${cat.name}"? Products yeh category lose kar denge.`)) {
                        deleteMutation.mutate(cat.id);
                      }
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
            {filtered.map((cat: any) => (
              <div key={cat.id} className="px-5 py-3 hover:bg-slate-50 transition flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0" style={{ backgroundColor: cat.color }}>
                  <Tag className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 truncate">{cat.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase">{cat.color}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-emerald-700">{cat._count?.products ?? 0}</div>
                  <div className="text-[10px] text-slate-500 font-bold">products</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(cat)} className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 flex items-center justify-center transition">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteMutation.mutate(cat.id); }}
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
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="px-6 py-5 border-b-2 border-slate-100 bg-gradient-to-r from-emerald-50 to-green-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-lg">
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
                <button onClick={selectAllPresets} className="text-xs font-extrabold text-emerald-700 hover:underline">Select All</button>
                <span className="text-slate-300">•</span>
                <button onClick={deselectAllPresets} className="text-xs font-extrabold text-slate-600 hover:underline">Deselect All</button>
              </div>
              <div className="text-xs text-slate-500 font-semibold">
                Existing categories are auto-hidden
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                {availablePresets.map((p) => {
                  const selected = selectedPresets.has(p.name);
                  return (
                    <button
                      key={p.name}
                      onClick={() => togglePresetSelection(p.name)}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition text-left ${
                        selected
                          ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200'
                          : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm'
                      }`}
                      style={selected ? { borderColor: p.color, backgroundColor: `${p.color}15` } : {}}
                    >
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundColor: p.color }}>
                        <Tag className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-extrabold text-slate-900 truncate">{p.name}</div>
                        <div className="text-[9px] font-mono text-slate-500 uppercase">{p.color}</div>
                      </div>
                      {selected && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-4 border-t-2 border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
              <div className="text-sm">
                <div className="font-extrabold text-slate-900">{selectedPresets.size} categories selected</div>
                <div className="text-xs text-slate-500 font-semibold">Bulk add will skip duplicates</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setShowBulkImport(false); setSelectedPresets(new Set()); }}>
                  Cancel
                </Button>
                <Button
                  onClick={bulkAddSelected}
                  disabled={selectedPresets.size === 0}
                  loading={bulkCreateMutation.isPending}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                >
                  <Import className="h-4 w-4" />
                  Import {selectedPresets.size} Categories
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FORM MODAL ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  {editing ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-slate-900">{editing ? 'Edit Category' : 'New Category'}</h3>
                  <p className="text-xs text-slate-500">Product group</p>
                </div>
              </div>
              <button onClick={closeForm} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Input
                label="Category Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter category name..."
              />

              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-slate-500" />
                  Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-12 rounded-xl border-2 transition shadow-sm ${
                        color === c ? 'border-slate-900 scale-110 shadow-lg ring-2 ring-slate-300' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-16 rounded-xl border-2 border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500"
                    placeholder="#2c9466"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold mb-3 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Live Preview
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: color, boxShadow: `0 10px 25px -5px ${color}40` }}
                  >
                    <Tag className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900">{name || 'Category name'}</div>
                    <div className="text-xs text-slate-500 font-semibold">0 products</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={closeForm} className="flex-1">Cancel</Button>
                <Button
                  onClick={() => {
                    if (!name.trim()) return toast.error('Name required');
                    createMutation.mutate({ name: name.trim(), color });
                  }}
                  loading={createMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
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
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
    slate: 'from-slate-500 to-slate-700',
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
