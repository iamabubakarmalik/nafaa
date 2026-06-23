import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tag, Plus, Trash2, Package, Search, X, Edit3, Save, Sparkles,
  Download, RefreshCw, Star, Palette, TrendingUp, Filter,
} from 'lucide-react';
import { categoriesApi } from '@/api/categories.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

const COLOR_PRESETS = [
  '#2c9466', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#a855f7', '#f97316',
  '#10b981', '#6366f1', '#d946ef', '#eab308', '#14b8a6',
];

const SUGGESTED_CATEGORIES = [
  { name: 'Bakery Items', color: '#f59e0b' },
  { name: 'Drinks & Beverages', color: '#3b82f6' },
  { name: 'Snacks', color: '#ef4444' },
  { name: 'Dairy Products', color: '#06b6d4' },
  { name: 'Grocery', color: '#10b981' },
  { name: 'Spare Parts', color: '#6366f1' },
  { name: 'Stationery', color: '#8b5cf6' },
  { name: 'Electronics', color: '#0ea5e9' },
];

type Filter = 'all' | 'used' | 'unused';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);

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

  const existingNames = new Set(categories.map((c: any) => c.name.toLowerCase()));
  const availableSuggestions = SUGGESTED_CATEGORIES.filter((s) => !existingNames.has(s.name.toLowerCase()));

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
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Categories</h2>
            <p className="mt-2 text-sm text-white/80">
              Apne products ko Bakery, Drinks, Spare Parts mein organize karein for fast filtering
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

      {/* ═══ SUGGESTIONS ═══ */}
      {availableSuggestions.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <h3 className="font-extrabold text-emerald-900">Quick Add Suggestions</h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Popular categories</span>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2">
            {availableSuggestions.slice(0, 8).map((s) => (
              <button
                key={s.name}
                onClick={() => quickAdd(s)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 hover:shadow-md hover:scale-105 transition"
                style={{ borderColor: `${s.color}50` }}
              >
                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundColor: s.color }}>
                  <Tag className="h-4 w-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="text-xs font-extrabold text-slate-900 truncate">{s.name}</div>
                  <div className="text-[9px] text-slate-500 font-bold">+ Click to add</div>
                </div>
              </button>
            ))}
          </div>
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
          {filtered.length > 0 && (
            <button onClick={exportCSV} className="h-11 px-4 rounded-xl border-2 border-slate-200 hover:border-emerald-300 bg-white text-sm font-bold text-slate-700 inline-flex items-center gap-1.5 transition">
              <Download className="h-4 w-4" /> Export
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {[
            { v: 'all' as Filter, l: 'All', count: stats.total, c: 'bg-slate-900' },
            { v: 'used' as Filter, l: 'In Use', count: stats.used, c: 'bg-emerald-600' },
            { v: 'unused' as Filter, l: 'Unused', count: stats.unused, c: 'bg-rose-600' },
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

      {/* ═══ CATEGORIES GRID ═══ */}
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
            <Button onClick={openCreate} className="mt-5">
              <Plus className="h-4 w-4" /> Add Category
            </Button>
          )}
        </div>
      ) : (
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
                <div className="text-[10px] text-slate-500 font-bold">
                  Click to manage
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(cat)}
                    className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 flex items-center justify-center transition"
                    title="Edit"
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
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
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
                placeholder="Bakery Items, Drinks, Spare Parts..."
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
