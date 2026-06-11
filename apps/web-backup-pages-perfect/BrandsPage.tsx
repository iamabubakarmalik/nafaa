import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tag as TagIcon, Plus, Search, Edit3, Trash2, Globe, Building2, X, Save,
} from 'lucide-react';
import { brandsApi, type Brand, type UpsertBrandPayload } from '@/api/brands.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AvatarUpload } from '@/components/uploads';
import { toast } from 'sonner';

const empty: UpsertBrandPayload = {
  name: '',
  description: '',
  logoUrl: '',
  website: '',
  isActive: true,
};

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<UpsertBrandPayload>(empty);

  const { data: brands = [] } = useQuery({
    queryKey: ['brands', search],
    queryFn: () => brandsApi.list(search || undefined),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? brandsApi.update(editing.id, form) : brandsApi.create(form),
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
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setShowForm(true);
  };

  const openEdit = (b: Brand) => {
    setEditing(b);
    setForm({
      name: b.name,
      description: b.description ?? '',
      logoUrl: b.logoUrl ?? '',
      website: b.website ?? '',
      isActive: b.isActive,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(empty);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-violet-900 to-violet-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Building2 className="h-3.5 w-3.5" /> Brand Management
            </div>
            <h2 className="mt-3 text-3xl font-bold">Brands</h2>
            <p className="mt-2 text-sm text-white/80">
              Apni products ke brands manage karein with logos
            </p>
          </div>
          <Button onClick={openCreate} className="bg-white text-slate-900 hover:bg-slate-100">
            <Plus className="h-4 w-4" /> New Brand
          </Button>
        </div>
      </section>

      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          placeholder="Search brands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {brands.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-12 text-center">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="mt-4 font-bold text-slate-900">No brands yet</h3>
          <p className="text-sm text-slate-500 mt-2">Click "New Brand" to add your first brand</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {brands.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl bg-white border border-slate-200 p-5 hover:border-violet-300 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                  {b.logoUrl ? (
                    <img src={b.logoUrl} alt={b.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-violet-100 to-violet-200 text-violet-700 font-bold text-xl">
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{b.name}</h3>
                  <div className="text-xs text-slate-500 mt-0.5 font-mono truncate">/{b.slug}</div>
                  {b.website && (
                    <a
                      href={b.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-xs text-violet-700 hover:underline"
                    >
                      <Globe className="h-3 w-3" /> Website
                    </a>
                  )}
                </div>
              </div>

              {b.description && (
                <p className="mt-3 text-xs text-slate-600 line-clamp-2">{b.description}</p>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {b._count?.products ?? 0} products
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(b)}
                    className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                  >
                    <Edit3 className="h-4 w-4 text-slate-700" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete brand "${b.name}"?`)) removeMutation.mutate(b.id);
                    }}
                    className="h-8 w-8 rounded-lg hover:bg-rose-50 flex items-center justify-center"
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-xl">{editing ? 'Edit Brand' : 'New Brand'}</h3>
              <button onClick={closeForm} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Logo</label>
                <AvatarUpload
                  value={form.logoUrl}
                  onChange={(url) => setForm({ ...form, logoUrl: url || '' })}
                  purpose="brand-logo"
                  shape="square"
                  size="lg"
                  fallbackText={form.name || 'B'}
                />
              </div>

              <Input
                label="Brand Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nestle, Unilever, etc."
              />

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  rows={3}
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description..."
                />
              </div>

              <Input
                label="Website (optional)"
                value={form.website ?? ''}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://example.com"
              />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                Active
              </label>

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={closeForm} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!form.name.trim()) return toast.error('Name is required');
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
