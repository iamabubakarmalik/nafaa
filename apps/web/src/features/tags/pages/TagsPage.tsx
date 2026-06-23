import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Hash, Plus, Edit3, Trash2, X, Save, Search, Package, Sparkles,
  Download, RefreshCw, Filter, Star, TrendingUp, Palette,
} from 'lucide-react';
import { tagsApi, type Tag, type UpsertTagPayload } from '@/api/tags.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

const COLOR_PRESETS = [
  '#16a34a', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6', '#84cc16', '#a855f7', '#f97316',
  '#06b6d4', '#10b981', '#6366f1', '#d946ef', '#eab308',
];

const SUGGESTED_TAGS = [
  { name: 'New Arrival', color: '#10b981' },
  { name: 'Best Seller', color: '#f59e0b' },
  { name: 'Sale', color: '#ef4444' },
  { name: 'Premium', color: '#8b5cf6' },
  { name: 'Organic', color: '#16a34a' },
  { name: 'Halal', color: '#0ea5e9' },
  { name: 'Imported', color: '#ec4899' },
  { name: 'Limited Edition', color: '#a855f7' },
];

const empty: UpsertTagPayload = { name: '', color: '#16a34a' };

type Filter = 'all' | 'used' | 'unused';

export default function TagsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [form, setForm] = useState<UpsertTagPayload>(empty);

  const { data: tags = [], refetch, isRefetching } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  });

  const saveMutation = useMutation({
    mutationFn: () => editing ? tagsApi.update(editing.id, form) : tagsApi.create(form),
    onSuccess: () => {
      toast.success(editing ? 'Tag updated' : 'Tag created');
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      close();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const removeMutation = useMutation({
    mutationFn: tagsApi.remove,
    onSuccess: () => {
      toast.success('Tag deleted');
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const filtered = useMemo(() => {
    let result = [...tags];
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((t) => t.name.toLowerCase().includes(q));
    if (filter === 'used') result = result.filter((t) => (t._count?.products ?? 0) > 0);
    else if (filter === 'unused') result = result.filter((t) => (t._count?.products ?? 0) === 0);
    return result.sort((a, b) => (b._count?.products ?? 0) - (a._count?.products ?? 0));
  }, [tags, search, filter]);

  const stats = useMemo(() => {
    const totalProducts = tags.reduce((s, t) => s + (t._count?.products ?? 0), 0);
    const used = tags.filter((t) => (t._count?.products ?? 0) > 0).length;
    return { total: tags.length, used, unused: tags.length - used, totalProducts };
  }, [tags]);

  const topTags = useMemo(() => {
    return [...tags]
      .filter((t) => (t._count?.products ?? 0) > 0)
      .sort((a, b) => (b._count?.products ?? 0) - (a._count?.products ?? 0))
      .slice(0, 5);
  }, [tags]);

  const close = () => { setShowForm(false); setEditing(null); setForm(empty); };

  const openEdit = (t: Tag) => {
    setEditing(t);
    setForm({ name: t.name, color: t.color });
    setShowForm(true);
  };

  const quickAdd = (preset: { name: string; color: string }) => {
    setForm(preset);
    setEditing(null);
    setShowForm(true);
  };

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('No data');
    const headers = ['Name', 'Color', 'Products Count'];
    const rows = filtered.map((t) => [t.name, t.color, t._count?.products ?? 0]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tags-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  const existingNames = new Set(tags.map((t) => t.name.toLowerCase()));
  const availableSuggestions = SUGGESTED_TAGS.filter((s) => !existingNames.has(s.name.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-rose-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <Hash className="h-3.5 w-3.5 text-amber-300" />
              Smart Labels
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Tags</h2>
            <p className="mt-2 text-sm text-white/80">
              Organic, halal, imported, premium — colorful labels for fast filtering aur grouping
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
            <Button
              onClick={() => { setEditing(null); setForm(empty); setShowForm(true); }}
              className="bg-white text-slate-900 hover:bg-slate-100 shadow-lg"
            >
              <Plus className="h-4 w-4" /> New Tag
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tags" value={stats.total} sub="All labels" icon={Hash} color="pink" />
        <StatCard label="In Use" value={stats.used} sub={`${stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0}% utilized`} icon={Sparkles} color="emerald" />
        <StatCard label="Unused" value={stats.unused} sub="Ready to apply" icon={Hash} color="slate" />
        <StatCard label="Tagged Products" value={stats.totalProducts} sub="Across all tags" icon={Package} color="blue" />
      </section>

      {/* ═══ SUGGESTIONS ═══ */}
      {availableSuggestions.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-pink-600" />
            <h3 className="font-extrabold text-pink-900">Quick Add Suggestions</h3>
            <span className="text-[10px] font-bold text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full">Click to add</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.slice(0, 8).map((s) => (
              <button
                key={s.name}
                onClick={() => quickAdd(s)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 hover:shadow-md hover:scale-105 transition"
                style={{ backgroundColor: `${s.color}15`, borderColor: `${s.color}50` }}
              >
                <Plus className="h-3 w-3" style={{ color: s.color }} />
                <span className="text-xs font-extrabold" style={{ color: s.color }}>{s.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ═══ TOP TAGS LEADERBOARD ═══ */}
      {topTags.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-pink-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-pink-50 to-rose-50 border-b-2 border-pink-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="font-extrabold text-pink-900">Top Tags by Usage</h3>
                <p className="text-[11px] text-pink-700 font-bold">Most applied labels</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-pink-100">
            {topTags.map((t, idx) => {
              const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-pink-500', 'bg-rose-500'];
              return (
                <div key={t.id} className="px-5 py-3 flex items-center gap-3 hover:bg-pink-50/30 transition">
                  <div className={`h-8 w-8 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md`}>
                    {idx < 3 ? <Star className="h-4 w-4 fill-white" /> : idx + 1}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border-2" style={{ backgroundColor: `${t.color}15`, borderColor: `${t.color}40` }}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="text-sm font-extrabold" style={{ color: t.color }}>{t.name}</span>
                  </div>
                  <div className="flex-1" />
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-pink-700 text-lg tabular-nums">{t._count?.products ?? 0}</div>
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
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500"
              placeholder="Search tags..."
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
            <button onClick={exportCSV} className="h-11 px-4 rounded-xl border-2 border-slate-200 hover:border-pink-300 bg-white text-sm font-bold text-slate-700 inline-flex items-center gap-1.5 transition">
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

      {/* ═══ TAGS CLOUD ═══ */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center">
              <Hash className="h-9 w-9 text-pink-600" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-slate-900">
              {search || filter !== 'all' ? 'No matches' : 'No tags yet'}
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              {search || filter !== 'all' ? 'Try different search or filter' : 'Add tags to label your products'}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="group inline-flex items-center gap-2 rounded-full pl-3 pr-1 py-1.5 border-2 hover:shadow-md hover:scale-105 transition-all"
                style={{
                  backgroundColor: `${t.color}15`,
                  borderColor: `${t.color}40`,
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-sm font-extrabold" style={{ color: t.color }}>
                  {t.name}
                </span>
                <span className="text-[10px] font-extrabold text-slate-500 bg-white/70 rounded-full px-1.5 py-0.5 tabular-nums">
                  {t._count?.products ?? 0}
                </span>
                <div className="flex opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => openEdit(t)}
                    className="h-7 w-7 rounded-full hover:bg-white/60 flex items-center justify-center"
                    title="Edit"
                  >
                    <Edit3 className="h-3 w-3" style={{ color: t.color }} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete tag "${t.name}"?`)) removeMutation.mutate(t.id);
                    }}
                    className="h-7 w-7 rounded-full hover:bg-rose-100 flex items-center justify-center"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3 text-rose-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ FORM MODAL ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/30">
                  {editing ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-slate-900">{editing ? 'Edit Tag' : 'New Tag'}</h3>
                  <p className="text-xs text-slate-500">Searchable label</p>
                </div>
              </div>
              <button onClick={close} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Input label="Tag Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="organic, halal, imported..." />

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-slate-500" />
                  Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className={`h-12 rounded-xl border-2 transition shadow-sm ${
                        form.color === c ? 'border-slate-900 scale-110 shadow-lg ring-2 ring-slate-300' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-10 w-16 rounded-xl border-2 border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-10 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-pink-500"
                    placeholder="#16a34a"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold mb-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Live Preview
                </div>
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border-2 shadow-sm"
                  style={{
                    backgroundColor: `${form.color}15`,
                    borderColor: `${form.color}40`,
                  }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: form.color }} />
                  <span className="text-sm font-extrabold" style={{ color: form.color }}>
                    {form.name || 'Tag preview'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={close} className="flex-1">Cancel</Button>
                <Button
                  onClick={() => {
                    if (!form.name.trim()) return toast.error('Name required');
                    saveMutation.mutate();
                  }}
                  loading={saveMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
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
    pink: 'from-pink-500 to-rose-600 shadow-pink-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
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
