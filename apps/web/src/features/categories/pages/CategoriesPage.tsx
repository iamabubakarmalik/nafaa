import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tag, Plus, Trash2, Package, Search, X, Edit3, Save, Sparkles, Download,
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

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);

  const { data: categories = [] } = useQuery({
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
    const q = search.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter((c: any) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const stats = useMemo(() => {
    const totalProducts = categories.reduce((s: number, c: any) => s + (c._count?.products ?? 0), 0);
    const used = categories.filter((c: any) => (c._count?.products ?? 0) > 0).length;
    return { total: categories.length, used, unused: categories.length - used, totalProducts };
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

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('No data');
    const headers = ['Name', 'Color', 'Products'];
    const rows = filtered.map((c: any) => [c.name, c.color, c._count?.products ?? 0]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categories-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Exported');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Tag className="h-3.5 w-3.5 text-amber-300" /> Product Organization
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Categories</h2>
            <p className="mt-2 text-sm text-white/80">
              Apne products ko Bakery, Drinks, Spare Parts me organize karein for fast filtering.
            </p>
          </div>
          <Button onClick={openCreate} className="bg-white text-slate-900 hover:bg-slate-100">
            <Plus className="h-4 w-4" /> New Category
          </Button>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Categories" value={stats.total} icon={Tag} color="emerald" />
        <StatCard label="In Use" value={stats.used} icon={Sparkles} color="blue" />
        <StatCard label="Unused" value={stats.unused} icon={Tag} color="slate" />
        <StatCard label="Total Products" value={stats.totalProducts} icon={Package} color="violet" />
      </section>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
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
            <button onClick={exportCSV} className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5">
              <Download className="h-4 w-4" /> Export
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
            <Tag className="h-9 w-9 text-emerald-600" />
          </div>
          <h3 className="mt-5 text-xl font-bold text-slate-900">
            {search ? 'No matches' : 'No categories yet'}
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            {search ? 'Try different search' : 'Pehli category add karein'}
          </p>
          {!search && (
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
              className="group rounded-2xl bg-white border-2 border-slate-200 p-5 hover:border-emerald-300 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                  style={{ backgroundColor: cat.color }}
                >
                  <Tag className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-slate-900 truncate">{cat.name}</h3>
                  <div className="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1 font-semibold">
                    <Package className="h-3 w-3" />
                    {cat._count?.products ?? 0} products
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-1">
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
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-xl text-slate-900">{editing ? 'Edit Category' : 'New Category'}</h3>
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
                <label className="block text-sm font-bold text-slate-700 mb-2">Color</label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-12 rounded-xl border-2 transition shadow-sm ${
                        color === c ? 'border-slate-900 scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 cursor-pointer mt-2"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Live Preview</div>
                <div className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-white font-bold shadow-lg" style={{ backgroundColor: color }}>
                  <Tag className="h-4 w-4" />
                  {name || 'Category name'}
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
                  className="flex-1"
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

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-violet-700 shadow-violet-500/30',
    slate: 'from-slate-500 to-slate-700',
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{value}</div>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
