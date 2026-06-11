import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Hash, Plus, Edit3, Trash2, X, Save, Search, Package, Sparkles, Download,
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

const empty: UpsertTagPayload = { name: '', color: '#16a34a' };

export default function TagsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [form, setForm] = useState<UpsertTagPayload>(empty);

  const { data: tags = [] } = useQuery({
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
    const q = search.toLowerCase().trim();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, search]);

  const stats = useMemo(() => {
    const totalProducts = tags.reduce((s, t) => s + (t._count?.products ?? 0), 0);
    const used = tags.filter((t) => (t._count?.products ?? 0) > 0).length;
    return { total: tags.length, used, unused: tags.length - used, totalProducts };
  }, [tags]);

  const close = () => { setShowForm(false); setEditing(null); setForm(empty); };

  const openEdit = (t: Tag) => {
    setEditing(t);
    setForm({ name: t.name, color: t.color });
    setShowForm(true);
  };

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('No data');
    const headers = ['Name', 'Color', 'Products'];
    const rows = filtered.map((t) => [t.name, t.color, t._count?.products ?? 0]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tags-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Exported');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-pink-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Hash className="h-3.5 w-3.5 text-amber-300" /> Searchable Tags
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Tags</h2>
            <p className="mt-2 text-sm text-white/80">
              Organic, halal, imported, premium — labels for fast filtering aur grouping.
            </p>
          </div>
          <Button
            onClick={() => { setEditing(null); setForm(empty); setShowForm(true); }}
            className="bg-white text-slate-900 hover:bg-slate-100"
          >
            <Plus className="h-4 w-4" /> New Tag
          </Button>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Tags" value={stats.total} icon={Hash} color="pink" />
        <StatCard label="In Use" value={stats.used} icon={Sparkles} color="emerald" />
        <StatCard label="Unused" value={stats.unused} icon={Hash} color="slate" />
        <StatCard label="Tagged Products" value={stats.totalProducts} icon={Package} color="blue" />
      </section>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
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
            <button onClick={exportCSV} className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5">
              <Download className="h-4 w-4" /> Export
            </button>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
              <Hash className="h-7 w-7 text-pink-600" />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">
              {search ? 'No matches' : 'No tags yet'}
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              {search ? 'Try different search' : 'Add tags to label your products'}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="group inline-flex items-center gap-2 rounded-full pl-3 pr-1 py-1.5 border-2 hover:shadow-md transition"
                style={{
                  backgroundColor: `${t.color}15`,
                  borderColor: `${t.color}40`,
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-sm font-extrabold" style={{ color: t.color }}>
                  {t.name}
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-white/60 rounded-full px-1.5 py-0.5">
                  {t._count?.products ?? 0}
                </span>
                <div className="flex">
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

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-xl text-slate-900">{editing ? 'Edit Tag' : 'New Tag'}</h3>
              <button onClick={close} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Input label="Tag Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="organic, halal, imported..." />
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Color</label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className={`h-12 rounded-xl border-2 transition shadow-sm ${
                        form.color === c ? 'border-slate-900 scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="mt-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 cursor-pointer"
                  />
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Live Preview</div>
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border-2"
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
    pink: 'from-pink-500 to-pink-700 shadow-pink-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
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
