import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Award, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  Star, Globe, Phone, User, Package, TrendingUp, MapPin,
} from 'lucide-react';
import { hardwareBrandsApi, type BrandTier, type HardwareBrand } from '../api/brands.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { toast } from 'sonner';

const TIERS: { value: BrandTier; label: string; emoji: string; gradient: string }[] = [
  { value: 'PREMIUM', label: 'Premium', emoji: '💎', gradient: 'from-purple-500 to-fuchsia-600' },
  { value: 'STANDARD', label: 'Standard', emoji: '⭐', gradient: 'from-blue-500 to-cyan-600' },
  { value: 'ECONOMY', label: 'Economy', emoji: '💰', gradient: 'from-emerald-500 to-teal-600' },
  { value: 'IMPORTED', label: 'Imported', emoji: '🌐', gradient: 'from-amber-500 to-orange-600' },
  { value: 'LOCAL', label: 'Local', emoji: '🇵🇰', gradient: 'from-green-500 to-emerald-600' },
];

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HardwareBrand | null>(null);

  const { data: brands = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hardware-brands', tierFilter, search],
    queryFn: () => hardwareBrandsApi.list({
      tier: tierFilter === 'all' ? undefined : tierFilter,
      search: search.trim() || undefined,
      active: true,
    }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => hardwareBrandsApi.toggleFeatured(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hardware-brands'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => hardwareBrandsApi.remove(id),
    onSuccess: () => {
      toast.success('Brand removed');
      queryClient.invalidateQueries({ queryKey: ['hardware-brands'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Brand Master
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🏆 Hardware Brands</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Fauji, DG Khan, Lucky, Amreli — supplier catalog</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              New Brand
            </Button>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search brand name, code..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-orange-500" />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setTierFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (tierFilter === 'all' ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Tiers</button>
          {TIERS.map((t) => (
            <button key={t.value} onClick={() => setTierFilter(t.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (tierFilter === t.value ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </section>

      {showForm && (
        <BrandForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['hardware-brands'] });
          }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : brands.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Award className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No brands yet</p>
          <Button className="mt-4 bg-gradient-to-r from-orange-600 to-amber-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Add First Brand
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <BrandCard
              key={brand.id}
              brand={brand}
              onEdit={() => { setEditing(brand); setShowForm(true); }}
              onToggleFeatured={() => toggleMutation.mutate(brand.id)}
              onDelete={() => { if (confirm('Remove "' + brand.name + '"?')) removeMutation.mutate(brand.id); }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function BrandCard({ brand, onEdit, onToggleFeatured, onDelete }: any) {
  const tier = TIERS.find((t) => t.value === brand.tier);

  return (
    <div className={
      'group rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden ' +
      (brand.isFeatured ? 'border-amber-400 ring-2 ring-amber-100 dark:ring-amber-950/40' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className={'relative aspect-video overflow-hidden bg-gradient-to-br ' + (tier?.gradient ?? 'from-slate-500 to-slate-700')}>
        {brand.logoUrl ? (
          <img src={brand.logoUrl} alt="" className="w-full h-full object-contain bg-white/90 p-4" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">{tier?.emoji || '🏭'}</span>
          </div>
        )}

        <div className="absolute top-2 left-2 flex gap-1">
          {brand.isFeatured && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
              <Star className="h-2 w-2 fill-current" />
              Featured
            </span>
          )}
          <span className={'px-2 py-0.5 rounded-md text-white text-[9px] font-extrabold uppercase shadow bg-gradient-to-r ' + (tier?.gradient ?? 'from-slate-500 to-slate-700')}>
            {tier?.label}
          </span>
        </div>

        <button
          onClick={onToggleFeatured}
          className={
            'absolute top-2 right-2 h-8 w-8 rounded-lg backdrop-blur flex items-center justify-center transition shadow-lg ' +
            (brand.isFeatured ? 'bg-amber-500 text-white' : 'bg-slate-900/60 text-white hover:bg-amber-500')
          }
        >
          <Star className={'h-4 w-4 ' + (brand.isFeatured ? 'fill-current' : '')} />
        </button>

        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button onClick={onEdit} className="h-8 w-8 rounded-lg bg-slate-900/90 text-white flex items-center justify-center hover:bg-slate-900 shadow">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="h-8 w-8 rounded-lg bg-rose-600/90 text-white flex items-center justify-center hover:bg-rose-600 shadow">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">{brand.name}</h3>
          {brand.code && <div className="text-[10px] font-mono font-bold text-slate-500">{brand.code}</div>}
          {brand.countryOfOrigin && (
            <div className="text-xs font-bold text-slate-600 inline-flex items-center gap-1 mt-1">
              <Globe className="h-3 w-3" />
              {brand.countryOfOrigin}
            </div>
          )}
        </div>

        {brand.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold line-clamp-2">{brand.description}</p>
        )}

        {(brand.supplierContact || brand.supplierPhone) && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2 text-xs space-y-0.5">
            {brand.supplierContact && (
              <div className="inline-flex items-center gap-1 font-bold text-blue-800">
                <User className="h-3 w-3" />
                {brand.supplierContact}
              </div>
            )}
            {brand.supplierPhone && (
              <a href={'tel:' + brand.supplierPhone} className="flex items-center gap-1 font-extrabold text-blue-700 hover:underline">
                <Phone className="h-3 w-3" />
                {brand.supplierPhone}
              </a>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 grid grid-cols-2 gap-2">
          <div>
            <div className="text-[9px] uppercase font-extrabold text-slate-500 inline-flex items-center gap-0.5">
              <Package className="h-2.5 w-2.5" />
              Products
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{brand.productCount ?? brand.totalProducts}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase font-extrabold text-emerald-700 inline-flex items-center gap-0.5">
              <TrendingUp className="h-2.5 w-2.5" />
              Revenue
            </div>
            <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(brand.totalRevenue).replace('Rs', '').trim()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandForm({ editing, onClose, onSaved }: { editing: HardwareBrand | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({
    name: editing?.name ?? '',
    code: editing?.code ?? '',
    tier: editing?.tier ?? 'STANDARD',
    countryOfOrigin: editing?.countryOfOrigin ?? '',
    description: editing?.description ?? '',
    logoUrl: editing?.logoUrl ?? '',
    supplierContact: editing?.supplierContact ?? '',
    supplierPhone: editing?.supplierPhone ?? '',
    isFeatured: editing?.isFeatured ?? false,
    displayOrder: editing?.displayOrder ?? 0,
  });

  const saveMutation = useMutation({
    mutationFn: () => editing ? hardwareBrandsApi.update(editing.id, form) : hardwareBrandsApi.create(form),
    onSuccess: () => { toast.success(editing ? 'Brand updated' : 'Brand created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-orange-300 dark:border-orange-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-orange-50 dark:bg-orange-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">{editing ? 'Edit Brand' : 'New Brand'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Brand Name *</label>
            <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Fauji Cement, Amreli Steel" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          </div>
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Code (FAUJI)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-orange-500" />
          <input value={form.countryOfOrigin} onChange={(e) => setForm({ ...form, countryOfOrigin: e.target.value })} placeholder="Country of origin" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
        </div>

        {/* Tier picker */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Tier *</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {TIERS.map((t) => {
              const active = form.tier === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setForm({ ...form, tier: t.value })}
                  className={
                    'p-3 rounded-xl border-2 text-center transition ' +
                    (active
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 shadow'
                      : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-orange-300')
                  }
                >
                  <div className="text-2xl mb-1">{t.emoji}</div>
                  <div className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">{t.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brand description, quality notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-orange-500 resize-none" />

        {/* Logo */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Brand Logo</label>
          {form.logoUrl ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-slate-200 bg-white flex items-center justify-center p-4">
              <img src={form.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
              <button onClick={() => setForm({ ...form, logoUrl: '' })} className="absolute top-2 right-2 h-8 w-8 rounded bg-rose-600 text-white flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <UploadDropzone onUploaded={(records) => {
              const first = Array.isArray(records) ? records[0] : records;
              const url = typeof first === 'string' ? first : (first as any)?.url;
              if (url) setForm({ ...form, logoUrl: url });
            }} />
          )}
        </div>

        {/* Supplier contact */}
        <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-2">
            <User className="h-4 w-4" />
            Supplier Contact (for reordering)
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.supplierContact} onChange={(e) => setForm({ ...form, supplierContact: e.target.value })} placeholder="Contact person name" className="h-11 rounded-xl border-2 border-blue-300 bg-white dark:bg-blue-950/40 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
            <input value={form.supplierPhone} onChange={(e) => setForm({ ...form, supplierPhone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-blue-300 bg-white dark:bg-blue-950/40 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Display Order</label>
            <input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-orange-500" />
          </div>
          <label className={
            'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ' +
            (form.isFeatured ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800')
          }>
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="h-4 w-4 rounded" />
            <Star className={'h-4 w-4 ' + (form.isFeatured ? 'text-amber-500 fill-amber-500' : 'text-slate-400')} />
            <span className="text-sm font-extrabold">Featured brand</span>
          </label>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-orange-600 to-amber-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim()}>
            <Save className="h-4 w-4" />
            {editing ? 'Update Brand' : 'Create Brand'}
          </Button>
        </div>
      </div>
    </section>
  );
}
