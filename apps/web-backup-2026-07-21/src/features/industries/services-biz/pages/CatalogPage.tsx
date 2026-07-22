import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  Clock, DollarSign, Star, Award, Zap, TrendingUp, Shield, Flame,
} from 'lucide-react';
import { catalogApi, type ServiceCategory, type BusinessType, type ChargeType, type ServiceCatalogItem } from '../api/catalog.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { toast } from 'sonner';

const CATEGORIES: { value: ServiceCategory; label: string; emoji: string }[] = [
  { value: 'INSTALLATION', label: 'Installation', emoji: '🔧' },
  { value: 'REPAIR', label: 'Repair', emoji: '🛠️' },
  { value: 'MAINTENANCE', label: 'Maintenance', emoji: '⚙️' },
  { value: 'INSPECTION', label: 'Inspection', emoji: '🔍' },
  { value: 'CLEANING_SERVICE', label: 'Cleaning', emoji: '🧹' },
  { value: 'UPGRADE', label: 'Upgrade', emoji: '⬆️' },
  { value: 'REPLACEMENT', label: 'Replacement', emoji: '🔄' },
  { value: 'DIAGNOSTIC', label: 'Diagnostic', emoji: '📊' },
  { value: 'EMERGENCY', label: 'Emergency', emoji: '🚨' },
  { value: 'CONSULTATION', label: 'Consultation', emoji: '💬' },
  { value: 'AMC_VISIT', label: 'AMC Visit', emoji: '🛡️' },
  { value: 'OTHER_SERVICE', label: 'Other', emoji: '⭐' },
];

const BUSINESS_TYPES: { value: BusinessType; label: string; emoji: string }[] = [
  { value: 'ELECTRICIAN', label: 'Electrician', emoji: '⚡' },
  { value: 'PLUMBER', label: 'Plumber', emoji: '🔧' },
  { value: 'AC_TECHNICIAN', label: 'AC Technician', emoji: '❄️' },
  { value: 'APPLIANCE_REPAIR', label: 'Appliance', emoji: '📺' },
  { value: 'MOBILE_REPAIR', label: 'Mobile', emoji: '📱' },
  { value: 'COMPUTER_REPAIR', label: 'Computer', emoji: '💻' },
  { value: 'IT_SERVICES', label: 'IT Services', emoji: '🖥️' },
  { value: 'CLEANING', label: 'Cleaning', emoji: '🧹' },
  { value: 'PEST_CONTROL', label: 'Pest Control', emoji: '🐜' },
  { value: 'CARPENTRY', label: 'Carpentry', emoji: '🪚' },
  { value: 'PAINTING', label: 'Painting', emoji: '🎨' },
  { value: 'MASONRY', label: 'Masonry', emoji: '🧱' },
  { value: 'WELDING', label: 'Welding', emoji: '🔩' },
  { value: 'CCTV_INSTALLATION', label: 'CCTV', emoji: '📹' },
  { value: 'SOLAR_INSTALLATION', label: 'Solar', emoji: '☀️' },
  { value: 'GENERATOR_SERVICE', label: 'Generator', emoji: '⚙️' },
  { value: 'UPS_SERVICE', label: 'UPS', emoji: '🔋' },
  { value: 'HVAC', label: 'HVAC', emoji: '🌬️' },
  { value: 'AUTOMOBILE_MECHANIC', label: 'Auto', emoji: '🚗' },
  { value: 'MOTORCYCLE_MECHANIC', label: 'Bike', emoji: '🏍️' },
  { value: 'OTHER', label: 'Other', emoji: '🛠️' },
];

const CHARGE_TYPES: { value: ChargeType; label: string; emoji: string }[] = [
  { value: 'FIXED', label: 'Fixed', emoji: '💵' },
  { value: 'HOURLY', label: 'Hourly', emoji: '⏱️' },
  { value: 'PER_VISIT', label: 'Per Visit', emoji: '🚗' },
  { value: 'DISTANCE_BASED', label: 'Distance', emoji: '📏' },
  { value: 'COMPLEXITY_BASED', label: 'Complexity', emoji: '🧩' },
  { value: 'QUOTE_BASED', label: 'Quote', emoji: '📝' },
];

export default function CatalogPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [businessFilter, setBusinessFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServiceCatalogItem | null>(null);

  const { data: services = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['catalog-services', categoryFilter, businessFilter, tagFilter, search],
    queryFn: () => catalogApi.list({
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      businessType: businessFilter === 'all' ? undefined : businessFilter,
      search: search.trim() || undefined,
      featured: tagFilter === 'featured' ? true : undefined,
      popular: tagFilter === 'popular' ? true : undefined,
      emergency: tagFilter === 'emergency' ? true : undefined,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => catalogApi.remove(id),
    onSuccess: () => { toast.success('Service removed'); queryClient.invalidateQueries({ queryKey: ['catalog-services'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Service Menu
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🔧 Service Catalog</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">All services with pricing, duration & warranty</p>
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

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-cyan-500" />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setBusinessFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (businessFilter === 'all' ? 'bg-cyan-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Business</button>
          {BUSINESS_TYPES.map((b) => (
            <button key={b.value} onClick={() => setBusinessFilter(b.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (businessFilter === b.value ? 'bg-cyan-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{b.emoji} {b.label}</button>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCategoryFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (categoryFilter === 'all' ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Categories</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (categoryFilter === c.value ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{c.emoji} {c.label}</button>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {[
            { v: 'all', label: 'All' },
            { v: 'featured', label: '⭐ Featured' },
            { v: 'popular', label: '🔥 Popular' },
            { v: 'emergency', label: '🚨 Emergency' },
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
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['catalog-services'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Wrench className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No services yet</p>
          <Button className="mt-4 bg-gradient-to-r from-cyan-600 to-blue-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Create First Service
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc) => (
            <ServiceCard
              key={svc.id}
              service={svc}
              onEdit={() => { setEditing(svc); setShowForm(true); }}
              onDelete={() => { if (confirm('Remove "' + svc.name + '"?')) removeMutation.mutate(svc.id); }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function ServiceCard({ service, onEdit, onDelete }: any) {
  const cat = CATEGORIES.find((c) => c.value === service.category);
  const biz = BUSINESS_TYPES.find((b) => b.value === service.businessType);

  return (
    <div className={
      'group rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden ' +
      (service.isFeatured ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className="relative aspect-video bg-gradient-to-br from-cyan-500 via-blue-600 to-cyan-700 overflow-hidden">
        {service.imageUrl ? (
          <img src={service.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">{biz?.emoji || cat?.emoji || '🔧'}</span>
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {service.isFeatured && (
            <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
              <Star className="h-2 w-2 fill-current" /> Featured
            </span>
          )}
          {service.isPopular && (
            <span className="px-2 py-0.5 rounded bg-red-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
              <Flame className="h-2 w-2" /> Popular
            </span>
          )}
          {service.isEmergency && (
            <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow animate-pulse">
              🚨 Emergency
            </span>
          )}
        </div>

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
          <h3 className="font-extrabold text-slate-900 dark:text-white line-clamp-1">{service.name}</h3>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {biz && <span className="text-[10px] font-extrabold uppercase text-cyan-600">{biz.emoji} {biz.label}</span>}
            {cat && <span className="text-[10px] font-bold text-slate-500">• {cat.label}</span>}
          </div>
        </div>

        {service.description && (
          <p className="text-xs text-slate-500 font-semibold line-clamp-2">{service.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-slate-500 font-bold">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {service.estimatedDurationMin}min
          </span>
          <span className="inline-flex items-center gap-1 text-violet-700">
            <Award className="h-3 w-3" />
            {service.requiredSkillLevel}
          </span>
          {service.warrantyDays > 0 && (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <Shield className="h-3 w-3" />
              {service.warrantyDays}d
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-slate-500">{service.chargeType.replace('_', ' ')}</div>
            <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">
              {formatPKR(service.baseCharge || service.visitCharge || service.hourlyRate)}
            </div>
          </div>
          {service.totalJobs > 0 && (
            <div className="text-right">
              <div className="text-[10px] font-extrabold text-slate-500">Total Jobs</div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">{service.totalJobs}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ServiceForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    name: editing?.name ?? '',
    code: editing?.code ?? '',
    description: editing?.description ?? '',
    category: editing?.category ?? 'REPAIR',
    businessType: editing?.businessType ?? '',
    chargeType: editing?.chargeType ?? 'FIXED',
    baseCharge: editing?.baseCharge ?? 0,
    hourlyRate: editing?.hourlyRate ?? 0,
    visitCharge: editing?.visitCharge ?? 0,
    minCharge: editing?.minCharge ?? 0,
    emergencyCharge: editing?.emergencyCharge ?? 0,
    weekendCharge: editing?.weekendCharge ?? 0,
    nightCharge: editing?.nightCharge ?? 0,
    outOfCityCharge: editing?.outOfCityCharge ?? 0,
    estimatedDurationMin: editing?.estimatedDurationMin ?? 60,
    requiredSkillLevel: editing?.requiredSkillLevel ?? 'JUNIOR',
    warrantyDays: editing?.warrantyDays ?? 30,
    warrantyType: editing?.warrantyType ?? 'SERVICE_PROVIDER',
    isEmergency: editing?.isEmergency ?? false,
    isRemoteAvailable: editing?.isRemoteAvailable ?? false,
    requiresQuote: editing?.requiresQuote ?? false,
    requiresAdvance: editing?.requiresAdvance ?? false,
    advancePct: editing?.advancePct ?? 0,
    imageUrl: editing?.imageUrl ?? '',
    isPopular: editing?.isPopular ?? false,
    isFeatured: editing?.isFeatured ?? false,
    isActive: editing?.isActive ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        baseCharge: Number(form.baseCharge) || 0,
        hourlyRate: Number(form.hourlyRate) || 0,
        visitCharge: Number(form.visitCharge) || 0,
        minCharge: Number(form.minCharge) || 0,
        emergencyCharge: Number(form.emergencyCharge) || 0,
        weekendCharge: Number(form.weekendCharge) || 0,
        nightCharge: Number(form.nightCharge) || 0,
        outOfCityCharge: Number(form.outOfCityCharge) || 0,
        estimatedDurationMin: Number(form.estimatedDurationMin) || 60,
        warrantyDays: Number(form.warrantyDays) || 0,
        advancePct: Number(form.advancePct) || 0,
        businessType: form.businessType || undefined,
      };
      return editing ? catalogApi.update(editing.id, payload) : catalogApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-cyan-300 dark:border-cyan-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Service' : 'New Service'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Service Name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Code (optional)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-cyan-500" />
        </div>

        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-cyan-500 resize-none" />

        <div className="grid sm:grid-cols-3 gap-3">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
          </select>
          <select value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
            <option value="">-- Business Type --</option>
            {BUSINESS_TYPES.map((b) => <option key={b.value} value={b.value}>{b.emoji} {b.label}</option>)}
          </select>
          <select value={form.requiredSkillLevel} onChange={(e) => setForm({ ...form, requiredSkillLevel: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
            <option value="APPRENTICE">Apprentice</option>
            <option value="JUNIOR">Junior</option>
            <option value="SENIOR">Senior</option>
            <option value="EXPERT">Expert</option>
            <option value="MASTER">Master</option>
          </select>
        </div>

        {/* Pricing */}
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-emerald-900 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-2 block">Charge Type</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CHARGE_TYPES.map((c) => (
                <button key={c.value} onClick={() => setForm({ ...form, chargeType: c.value })} className={
                  'p-2 rounded-lg border-2 text-center text-xs font-extrabold ' +
                  (form.chargeType === c.value ? 'border-emerald-500 bg-white dark:bg-emerald-950/40 text-emerald-800 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600')
                }>
                  <div className="text-lg">{c.emoji}</div>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Base Charge</label>
              <input type="number" step="0.01" value={form.baseCharge} onChange={(e) => setForm({ ...form, baseCharge: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Hourly Rate</label>
              <input type="number" step="0.01" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Visit Charge</label>
              <input type="number" step="0.01" value={form.visitCharge} onChange={(e) => setForm({ ...form, visitCharge: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
        </div>

        {/* Surcharges */}
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Surcharges
          </div>
          <div className="grid sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-red-700 mb-1 block">Emergency (Rs)</label>
              <input type="number" value={form.emergencyCharge} onChange={(e) => setForm({ ...form, emergencyCharge: e.target.value })} className="h-10 w-full rounded-lg border-2 border-red-300 bg-white px-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-red-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Weekend</label>
              <input type="number" value={form.weekendCharge} onChange={(e) => setForm({ ...form, weekendCharge: e.target.value })} className="h-10 w-full rounded-lg border-2 border-amber-300 bg-white px-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-violet-700 mb-1 block">Night Hours</label>
              <input type="number" value={form.nightCharge} onChange={(e) => setForm({ ...form, nightCharge: e.target.value })} className="h-10 w-full rounded-lg border-2 border-violet-300 bg-white px-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Out of City</label>
              <input type="number" value={form.outOfCityCharge} onChange={(e) => setForm({ ...form, outOfCityCharge: e.target.value })} className="h-10 w-full rounded-lg border-2 border-blue-300 bg-white px-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Duration + Warranty */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Duration (min)</label>
            <input type="number" value={form.estimatedDurationMin} onChange={(e) => setForm({ ...form, estimatedDurationMin: e.target.value })} className="h-11 w-full rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Warranty (days)</label>
            <input type="number" value={form.warrantyDays} onChange={(e) => setForm({ ...form, warrantyDays: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        {/* Image */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Image</label>
          {form.imageUrl ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-slate-200">
              <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setForm({ ...form, imageUrl: '' })} className="absolute top-2 right-2 h-8 w-8 rounded bg-rose-600 text-white flex items-center justify-center">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.isFeatured ? 'border-amber-500 bg-amber-50' : 'border-slate-200 dark:border-neutral-700')}>
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="h-4 w-4 rounded" />
            <Star className={'h-4 w-4 ' + (form.isFeatured ? 'text-amber-500 fill-amber-500' : 'text-slate-400')} />
            <span className="text-xs font-extrabold">Featured</span>
          </label>
          <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.isPopular ? 'border-red-500 bg-red-50' : 'border-slate-200 dark:border-neutral-700')}>
            <input type="checkbox" checked={form.isPopular} onChange={(e) => setForm({ ...form, isPopular: e.target.checked })} className="h-4 w-4 rounded" />
            <Flame className={'h-4 w-4 ' + (form.isPopular ? 'text-red-600' : 'text-slate-400')} />
            <span className="text-xs font-extrabold">Popular</span>
          </label>
          <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.isEmergency ? 'border-red-600 bg-red-50' : 'border-slate-200 dark:border-neutral-700')}>
            <input type="checkbox" checked={form.isEmergency} onChange={(e) => setForm({ ...form, isEmergency: e.target.checked })} className="h-4 w-4 rounded" />
            <Zap className={'h-4 w-4 ' + (form.isEmergency ? 'text-red-600' : 'text-slate-400')} />
            <span className="text-xs font-extrabold">Emergency</span>
          </label>
          <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.requiresQuote ? 'border-blue-500 bg-blue-50' : 'border-slate-200 dark:border-neutral-700')}>
            <input type="checkbox" checked={form.requiresQuote} onChange={(e) => setForm({ ...form, requiresQuote: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-xs font-extrabold">Quote Required</span>
          </label>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim()}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </section>
  );
}
