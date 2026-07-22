import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Scissors, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  Clock, DollarSign, Star, Award, Zap, TrendingUp,
} from 'lucide-react';
import { salonServicesApi, type ServiceCategory, type SalonService } from '../api/services.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';

const CATEGORIES: { value: ServiceCategory; label: string; emoji: string; color: string }[] = [
  { value: 'HAIR_CUT', label: 'Hair Cut', emoji: '✂️', color: 'pink' },
  { value: 'HAIR_COLOR', label: 'Hair Color', emoji: '🎨', color: 'fuchsia' },
  { value: 'HAIR_TREATMENT', label: 'Treatment', emoji: '💆', color: 'rose' },
  { value: 'HAIR_STYLING', label: 'Styling', emoji: '💇', color: 'purple' },
  { value: 'BEARD_SHAVE', label: 'Beard/Shave', emoji: '🪒', color: 'slate' },
  { value: 'FACIAL', label: 'Facial', emoji: '✨', color: 'amber' },
  { value: 'MAKEUP', label: 'Makeup', emoji: '💄', color: 'red' },
  { value: 'BRIDAL_MAKEUP', label: 'Bridal', emoji: '👰', color: 'rose' },
  { value: 'PARTY_MAKEUP', label: 'Party', emoji: '🎉', color: 'fuchsia' },
  { value: 'MANICURE', label: 'Manicure', emoji: '💅', color: 'pink' },
  { value: 'PEDICURE', label: 'Pedicure', emoji: '🦶', color: 'cyan' },
  { value: 'NAIL_ART', label: 'Nail Art', emoji: '💎', color: 'purple' },
  { value: 'WAXING', label: 'Waxing', emoji: '🧴', color: 'amber' },
  { value: 'THREADING', label: 'Threading', emoji: '🧵', color: 'blue' },
  { value: 'MASSAGE', label: 'Massage', emoji: '💆‍♀️', color: 'emerald' },
  { value: 'BODY_TREATMENT', label: 'Body Treatment', emoji: '🧖', color: 'teal' },
  { value: 'SPA_PACKAGE', label: 'Spa Package', emoji: '🌿', color: 'green' },
  { value: 'MEHNDI', label: 'Mehndi', emoji: '🎨', color: 'orange' },
  { value: 'HAIR_EXTENSION', label: 'Extensions', emoji: '💇‍♀️', color: 'purple' },
  { value: 'KERATIN', label: 'Keratin', emoji: '🔬', color: 'blue' },
  { value: 'BOTOX', label: 'Botox', emoji: '💉', color: 'slate' },
  { value: 'OTHER', label: 'Other', emoji: '⭐', color: 'gray' },
];

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SalonService | null>(null);

  const { data: services = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['salon-services', categoryFilter, genderFilter, tagFilter, search],
    queryFn: () => salonServicesApi.list({
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      forGender: genderFilter === 'all' ? undefined : genderFilter,
      search: search.trim() || undefined,
      featured: tagFilter === 'featured' ? true : undefined,
      popular: tagFilter === 'popular' ? true : undefined,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => salonServicesApi.remove(id),
    onSuccess: () => {
      toast.success('Service removed');
      queryClient.invalidateQueries({ queryKey: ['salon-services'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-fuchsia-900 to-pink-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Service Menu
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">✂️ Salon Services</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Complete service catalog with pricing & commissions</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              New Service
            </Button>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-fuchsia-500" />
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCategoryFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (categoryFilter === 'all' ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Categories</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (categoryFilter === c.value ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* Gender + Tag filters */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { v: 'all', label: 'Anyone', gender: true },
            { v: 'MEN', label: '👨 Men', gender: true },
            { v: 'WOMEN', label: '👩 Women', gender: true },
            { v: 'KIDS', label: '🧒 Kids', gender: true },
          ].map((g) => (
            <button key={g.v} onClick={() => setGenderFilter(g.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (genderFilter === g.v ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{g.label}</button>
          ))}
          <div className="w-px bg-slate-200 mx-1" />
          {[
            { v: 'all', label: 'All' },
            { v: 'featured', label: '⭐ Featured' },
            { v: 'popular', label: '🔥 Popular' },
          ].map((t) => (
            <button key={t.v} onClick={() => setTagFilter(t.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (tagFilter === t.v ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{t.label}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <ServiceForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['salon-services'] });
          }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Scissors className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No services yet</p>
          <Button className="mt-4 bg-gradient-to-r from-fuchsia-600 to-pink-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Create First Service
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={() => { setEditing(service); setShowForm(true); }}
              onDelete={() => { if (confirm('Remove "' + service.name + '"?')) removeMutation.mutate(service.id); }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function ServiceCard({ service, onEdit, onDelete }: any) {
  const category = CATEGORIES.find((c) => c.value === service.category);
  const hasDiscount = service.discountPrice && service.discountPrice < service.price;

  return (
    <div className={
      'group rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden ' +
      (service.isFeatured ? 'border-amber-400 ring-2 ring-amber-100 dark:ring-amber-950/40' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className="relative aspect-video bg-gradient-to-br from-fuchsia-500 via-pink-600 to-rose-600 overflow-hidden">
        {service.imageUrl ? (
          <img src={service.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">{category?.emoji || '💇'}</span>
          </div>
        )}

        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {service.isFeatured && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
              <Star className="h-2 w-2 fill-current" /> Featured
            </span>
          )}
          {service.isPopular && (
            <span className="px-2 py-0.5 rounded-md bg-red-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
              <TrendingUp className="h-2 w-2" /> Popular
            </span>
          )}
          {hasDiscount && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
              <Zap className="h-2 w-2" /> SALE
            </span>
          )}
        </div>

        <div className="absolute top-2 right-2 flex gap-1">
          {service.forMen && <span className="h-6 w-6 rounded-full bg-slate-900/70 backdrop-blur text-white flex items-center justify-center text-xs">👨</span>}
          {service.forWomen && <span className="h-6 w-6 rounded-full bg-slate-900/70 backdrop-blur text-white flex items-center justify-center text-xs">👩</span>}
          {service.forKids && <span className="h-6 w-6 rounded-full bg-slate-900/70 backdrop-blur text-white flex items-center justify-center text-xs">🧒</span>}
        </div>

        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button onClick={(e) => { e.preventDefault(); onEdit(); }} className="h-8 w-8 rounded-lg bg-slate-900/90 text-white flex items-center justify-center hover:bg-slate-900 shadow">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={(e) => { e.preventDefault(); onDelete(); }} className="h-8 w-8 rounded-lg bg-rose-600/90 text-white flex items-center justify-center hover:bg-rose-600 shadow">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight line-clamp-1">{service.name}</h3>
          {category && (
            <span className="text-[10px] font-extrabold uppercase text-fuchsia-600">{category.label}</span>
          )}
        </div>

        {service.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold line-clamp-2">{service.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-slate-500 font-bold">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {service.durationMinutes}min
          </span>
          {service.commissionPct > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <Award className="h-3 w-3" />
              {service.commissionPct}%
            </span>
          )}
          {service.totalBookings > 0 && (
            <span>{service.totalBookings} bookings</span>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-end justify-between">
          <div>
            {hasDiscount && <div className="text-xs text-slate-400 line-through">{formatPKR(service.price)}</div>}
            <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">
              {formatPKR(hasDiscount ? service.discountPrice : service.price)}
            </div>
          </div>
          {service.avgRating && (
            <div className="text-right">
              <div className="text-xs font-extrabold text-amber-700 inline-flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-current" />
                {service.avgRating.toFixed(1)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ServiceForm({ editing, onClose, onSaved }: { editing: SalonService | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    code: editing?.code ?? '',
    category: editing?.category ?? ('HAIR_CUT' as ServiceCategory),
    description: editing?.description ?? '',
    price: editing?.price ?? 0,
    discountPrice: editing?.discountPrice ?? '',
    costPrice: editing?.costPrice ?? '',
    durationMinutes: editing?.durationMinutes ?? 30,
    bufferBefore: editing?.bufferBefore ?? 0,
    bufferAfter: editing?.bufferAfter ?? 0,
    forMen: editing?.forMen ?? true,
    forWomen: editing?.forWomen ?? true,
    forKids: editing?.forKids ?? false,
    commissionPct: editing?.commissionPct ?? 0,
    commissionFixed: editing?.commissionFixed ?? 0,
    imageUrl: editing?.imageUrl ?? '',
    isPopular: editing?.isPopular ?? false,
    isFeatured: editing?.isFeatured ?? false,
    isActive: editing?.isActive ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
        price: Number(form.price),
        durationMinutes: Number(form.durationMinutes),
        bufferBefore: Number(form.bufferBefore) || 0,
        bufferAfter: Number(form.bufferAfter) || 0,
        commissionPct: Number(form.commissionPct) || 0,
        commissionFixed: Number(form.commissionFixed) || 0,
      };
      return editing ? salonServicesApi.update(editing.id, payload) : salonServicesApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Service updated' : 'Service created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-fuchsia-300 dark:border-fuchsia-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-fuchsia-50 dark:bg-fuchsia-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">{editing ? 'Edit Service' : 'New Service'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Service Name *</label>
            <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Deep Conditioning Treatment" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
          </div>

          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Code (optional)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-fuchsia-500" />

          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ServiceCategory })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
          </select>
        </div>

        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-fuchsia-500 resize-none" />

        {/* Pricing */}
        <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Regular Price *</label>
              <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-1 block">Discount Price</label>
              <input type="number" step="0.01" value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: e.target.value })} placeholder="Optional" className="h-14 w-full rounded-xl border-2 border-rose-200 bg-white dark:bg-rose-950/30 px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Cost Price</label>
              <input type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} placeholder="Materials/products" className="h-14 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-fuchsia-500" />
            </div>
          </div>
        </div>

        {/* Duration */}
        <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
          <div className="text-sm font-extrabold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Duration
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Duration (min) *</label>
              <input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} className="h-11 w-full rounded-xl border-2 border-blue-300 bg-white dark:bg-blue-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Buffer Before</label>
              <input type="number" value={form.bufferBefore} onChange={(e) => setForm({ ...form, bufferBefore: Number(e.target.value) })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Buffer After</label>
              <input type="number" value={form.bufferAfter} onChange={(e) => setForm({ ...form, bufferAfter: Number(e.target.value) })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Available For</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'forMen', label: 'Men', emoji: '👨' },
              { key: 'forWomen', label: 'Women', emoji: '👩' },
              { key: 'forKids', label: 'Kids', emoji: '🧒' },
            ].map((g) => (
              <label key={g.key} className={
                'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ' +
                ((form as any)[g.key] ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-fuchsia-300')
              }>
                <input type="checkbox" checked={(form as any)[g.key]} onChange={(e) => setForm({ ...form, [g.key]: e.target.checked })} className="h-4 w-4 rounded" />
                <span className="text-lg">{g.emoji}</span>
                <span className="text-sm font-extrabold">{g.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Commission */}
        <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="text-sm font-extrabold text-amber-900 dark:text-amber-300 mb-3 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Staff Commission
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Percentage (%)</label>
              <input type="number" step="0.1" value={form.commissionPct} onChange={(e) => setForm({ ...form, commissionPct: Number(e.target.value) })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Fixed (Rs)</label>
              <input type="number" step="0.01" value={form.commissionFixed} onChange={(e) => setForm({ ...form, commissionFixed: Number(e.target.value) })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
          </div>
        </div>

        {/* Image */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Service Image</label>
          {form.imageUrl ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-slate-200">
              <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setForm({ ...form, imageUrl: '' })} className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <UploadDropzone onUploaded={(records) => {
              const first = Array.isArray(records) ? records[0] : records;
              const url = typeof first === 'string' ? first : (first as any)?.url;
              if (url) setForm({ ...form, imageUrl: url });
            }} />
          )}
        </div>

        {/* Flags */}
        <div className="grid grid-cols-2 gap-2">
          <label className={
            'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ' +
            (form.isFeatured ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'border-slate-200 dark:border-neutral-700')
          }>
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="h-4 w-4 rounded" />
            <Star className={'h-4 w-4 ' + (form.isFeatured ? 'text-amber-500 fill-amber-500' : 'text-slate-400')} />
            <span className="text-sm font-extrabold">Featured</span>
          </label>
          <label className={
            'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ' +
            (form.isPopular ? 'border-red-500 bg-red-50 dark:bg-red-950/40' : 'border-slate-200 dark:border-neutral-700')
          }>
            <input type="checkbox" checked={form.isPopular} onChange={(e) => setForm({ ...form, isPopular: e.target.checked })} className="h-4 w-4 rounded" />
            <TrendingUp className={'h-4 w-4 ' + (form.isPopular ? 'text-red-600' : 'text-slate-400')} />
            <span className="text-sm font-extrabold">Popular</span>
          </label>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-fuchsia-600 to-pink-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim() || !form.price}>
            <Save className="h-4 w-4" />
            {editing ? 'Update Service' : 'Create Service'}
          </Button>
        </div>
      </div>
    </section>
  );
}
