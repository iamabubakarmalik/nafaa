import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Edit3, Trash2, Globe, Building2, X, Save,
  CheckCircle2, Sparkles, Package, ToggleLeft, ToggleRight, Download,
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

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<UpsertBrandPayload>(empty);

  const { data: brands = [] } = useQuery({
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
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cannot delete - may have products'),
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
    return result;
  }, [brands, search, filter]);

  const stats = useMemo(() => {
    const totalProducts = brands.reduce((s, b) => s + (b._count?.products ?? 0), 0);
    return {
      total: brands.length,
      active: brands.filter((b) => b.isActive).length,
      inactive: brands.filter((b) => !b.isActive).length,
      totalProducts,
    };
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
    const headers = ['Name', 'Slug', 'Website', 'Active', 'Products', 'Created'];
    const rows = filtered.map((b) => [
      b.name, b.slug || '', b.website || '',
      b.isActive ? 'Yes' : 'No',
      b._count?.products ?? 0,
      new Date(b.createdAt).toLocaleDateString('en-PK'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brands-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Exported');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-violet-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Building2 className="h-3.5 w-3.5 text-amber-300" /> Brand Management
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Brands</h2>
            <p className="mt-2 text-sm text-white/80">
              Apni products ke brands manage karein with logos aur websites.
            </p>
          </div>
          <Button onClick={openCreate} className="bg-white text-slate-900 hover:bg-slate-100">
            <Plus className="h-4 w-4" /> New Brand
          </Button>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Brands" value={stats.total} icon={Building2} color="violet" />
        <StatCard label="Active" value={stats.active} icon={CheckCircle2} color="emerald" />
        <StatCard label="Inactive" value={stats.inactive} icon={ToggleLeft} color="slate" />
        <StatCard label="Total Products" value={stats.totalProducts} icon={Package} color="blue" />
      </section>

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
          {filtered.length > 0 && (
            <button onClick={exportCSV} className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5">
              <Download className="h-4 w-4" /> Export
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {[
            { v: 'all' as Filter, l: 'All', c: 'bg-slate-900' },
            { v: 'active' as Filter, l: 'Active', c: 'bg-emerald-600' },
            { v: 'inactive' as Filter, l: 'Inactive', c: 'bg-rose-600' },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setFilter(opt.v)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === opt.v ? `${opt.c} text-white shadow-sm` : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center">
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
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((b) => (
            <div
              key={b.id}
              className={`group rounded-2xl bg-white border-2 p-5 hover:border-violet-300 hover:shadow-xl hover:-translate-y-0.5 transition-all ${
                !b.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200 shadow-sm">
                  {b.logoUrl ? (
                    <img src={b.logoUrl} alt={b.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-violet-700 text-white font-extrabold text-xl">
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
                      <Globe className="h-3 w-3" /> Website
                    </a>
                  )}
                </div>
              </div>

              {b.description && (
                <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">{b.description}</p>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">
                  <Package className="h-2.5 w-2.5" />
                  {b._count?.products ?? 0} products
                </span>
                <div className="flex gap-1">
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
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-xl text-slate-900">{editing ? 'Edit Brand' : 'New Brand'}</h3>
              <button onClick={closeForm} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Logo</label>
                <AvatarUpload
                  value={form.logoUrl}
                  onChange={(url) => setForm({ ...form, logoUrl: url || '' })}
                  purpose="brand-logo"
                  shape="square"
                  size="lg"
                  fallbackText={form.name || 'B'}
                />
              </div>
              <Input label="Brand Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sun Fibre, Nestle, etc." />
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  rows={3}
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description..."
                />
              </div>
              <Input label="Website" value={form.website ?? ''} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" />
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <div className="text-sm font-bold">Active</div>
                  <div className="text-[10px] text-slate-500">Show in product forms</div>
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
    violet: 'from-violet-500 to-violet-700 shadow-violet-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    slate: 'from-slate-500 to-slate-700',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/30',
    amber: 'from-amber-500 to-amber-700 shadow-amber-500/30',
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
