import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  User, Phone, MapPin, DollarSign, TrendingUp, AlertCircle, Award,
  Tractor, Home, FileText, CheckCircle2, Ban, Play,
} from 'lucide-react';
import { farmersApi, type Farmer } from '../api/farmers.api';
import { customersApi } from '@/api/customers.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PROVINCES = ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'Gilgit-Baltistan', 'AJK', 'ICT'];
const FARMING_TYPES = ['Crop Farming', 'Livestock', 'Poultry', 'Dairy', 'Fishery', 'Horticulture', 'Mixed'];
const COMMON_CROPS = ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Potato', 'Tomato', 'Onion', 'Chilli', 'Pulses', 'Fodder'];
const SOIL_TYPES = ['Loamy', 'Clay', 'Sandy', 'Silty', 'Saline', 'Calcareous', 'Peaty'];
const WATER_SOURCES = ['Canal', 'Tube Well', 'Bore Well', 'Rain-fed', 'River', 'Drip', 'Sprinkler'];

export default function FarmersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Farmer | null>(null);

  const { data: farmers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['agri-farmers', statusFilter, districtFilter, search],
    queryFn: () => farmersApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      district: districtFilter || undefined,
      search: search.trim() || undefined,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['farmers-summary'],
    queryFn: () => farmersApi.summary(),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => farmersApi.suspend(id, reason),
    onSuccess: () => { toast.success('Farmer suspended'); queryClient.invalidateQueries({ queryKey: ['agri-farmers'] }); },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => farmersApi.reactivate(id),
    onSuccess: () => { toast.success('Farmer reactivated'); queryClient.invalidateQueries({ queryKey: ['agri-farmers'] }); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => farmersApi.remove(id),
    onSuccess: () => { toast.success('Farmer removed'); queryClient.invalidateQueries({ queryKey: ['agri-farmers'] }); },
  });

  const stats = {
    total: summary?.total ?? 0,
    active: summary?.active ?? 0,
    suspended: summary?.suspended ?? 0,
    outstanding: summary?.totals?.totalOutstanding ?? 0,
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Tractor className="h-3.5 w-3.5 text-amber-300" />
              Farmer Registry
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👨‍🌾 Farmers</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Registration, land details, credit accounts</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Register Farmer
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Farmers" value={stats.total} icon={Users} color="emerald" />
        <StatCard label="Active" value={stats.active} icon={CheckCircle2} color="green" />
        <StatCard label="Suspended" value={stats.suspended} icon={Ban} color="amber" />
        <StatCard label="Total Outstanding" value={formatPKR(stats.outstanding)} icon={DollarSign} color="rose" />
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, CNIC, village..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="flex gap-1.5">
          {['all', 'ACTIVE', 'SUSPENDED', 'DEFAULTED'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s === 'all' ? 'All' : s}</button>
          ))}
          <input value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} placeholder="Filter by district..." className="h-9 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-xs font-bold focus:outline-none focus:border-emerald-500 ml-auto" />
        </div>
      </section>

      {showForm && (
        <FarmerForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['agri-farmers'] }); queryClient.invalidateQueries({ queryKey: ['farmers-summary'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : farmers.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Users className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No farmers registered</p>
          <Button className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Register First Farmer
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {farmers.map((farmer) => (
            <FarmerCard
              key={farmer.id}
              farmer={farmer}
              onEdit={() => { setEditing(farmer); setShowForm(true); }}
              onSuspend={() => {
                const reason = prompt('Suspension reason?');
                if (reason !== null) suspendMutation.mutate({ id: farmer.id, reason });
              }}
              onReactivate={() => reactivateMutation.mutate(farmer.id)}
              onRemove={() => { if (confirm('Remove ' + farmer.fullName + '?')) removeMutation.mutate(farmer.id); }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600',
    green: 'from-green-500 to-lime-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-red-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function FarmerCard({ farmer, onEdit, onSuspend, onReactivate, onRemove }: any) {
  const creditUsedPct = farmer.creditLimit > 0 ? (farmer.currentBalance / farmer.creditLimit) * 100 : 0;
  const isOverdue = farmer.totalOutstanding > 0;

  return (
    <div className={
      'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-lg transition p-4 space-y-3 ' +
      (farmer.status === 'SUSPENDED' ? 'border-rose-300 opacity-80' :
       isOverdue ? 'border-amber-300' : 'border-emerald-200')
    }>
      <div className="flex items-start gap-3">
        {farmer.photoUrl ? (
          <img src={farmer.photoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-200 shrink-0" />
        ) : (
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xl font-extrabold shrink-0">
            {farmer.fullName?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-slate-900 dark:text-white truncate">{farmer.fullName}</span>
            {farmer.status === 'ACTIVE' && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase">ACTIVE</span>
            )}
            {farmer.status === 'SUSPENDED' && (
              <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-extrabold uppercase">SUSPENDED</span>
            )}
            {isOverdue && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                <AlertCircle className="h-2 w-2" />
                DUE
              </span>
            )}
          </div>
          <div className="text-[10px] font-mono font-bold text-slate-500">{farmer.farmerNumber}</div>
          {farmer.cnic && <div className="text-[10px] font-bold text-slate-500">CNIC: {farmer.cnic}</div>}
          {farmer.phone && (
            <div className="flex items-center gap-1 text-xs text-slate-600 font-bold mt-0.5">
              <Phone className="h-3 w-3" />{farmer.phone}
            </div>
          )}
        </div>
      </div>

      {(farmer.village || farmer.district) && (
        <div className="flex items-start gap-1 text-xs text-slate-600 font-bold">
          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="line-clamp-1">
            {[farmer.village, farmer.tehsil, farmer.district, farmer.province].filter(Boolean).join(', ')}
          </span>
        </div>
      )}

      {farmer.landAreaAcres && (
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="inline-flex items-center gap-1 text-green-700">
            <Tractor className="h-3 w-3" />
            {farmer.landAreaAcres} acres
          </span>
          {farmer.soilType && <span className="text-slate-500">Soil: {farmer.soilType}</span>}
        </div>
      )}

      {farmer.primaryCrops?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {farmer.primaryCrops.slice(0, 4).map((c: string, i: number) => (
            <span key={i} className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-950/40 text-green-700 text-[9px] font-extrabold uppercase">
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs">
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Orders</div>
          <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">{farmer.totalOrders}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-emerald-700">Purchases</div>
          <div className="font-extrabold text-emerald-700 tabular-nums text-[10px]">{formatPKR(farmer.totalPurchases).replace('Rs', '').trim()}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-amber-700">Outstanding</div>
          <div className="font-extrabold text-amber-700 tabular-nums text-[10px]">{formatPKR(farmer.totalOutstanding).replace('Rs', '').trim()}</div>
        </div>
      </div>

      {farmer.creditLimit > 0 && (
        <div>
          <div className="flex items-center justify-between text-[10px] font-extrabold mb-1">
            <span className="text-slate-600">Credit Used</span>
            <span className={creditUsedPct > 80 ? 'text-rose-700' : creditUsedPct > 50 ? 'text-amber-700' : 'text-emerald-700'}>
              {formatPKR(farmer.currentBalance)} / {formatPKR(farmer.creditLimit)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
            <div className={
              'h-full ' +
              (creditUsedPct > 80 ? 'bg-gradient-to-r from-rose-500 to-red-600' :
               creditUsedPct > 50 ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
               'bg-gradient-to-r from-emerald-500 to-green-600')
            } style={{ width: Math.min(creditUsedPct, 100) + '%' }} />
          </div>
        </div>
      )}

      <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
        <Link to={'/agri/farmers/' + farmer.id} className="flex-1 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 hover:bg-emerald-200 text-emerald-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
          <FileText className="h-3 w-3" />
          Ledger
        </Link>
        <button onClick={onEdit} className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        {farmer.status === 'ACTIVE' ? (
          <button onClick={onSuspend} className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-600 flex items-center justify-center">
            <Ban className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button onClick={onReactivate} className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Play className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={onRemove} className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function FarmerForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    fullName: editing?.fullName ?? '',
    fatherName: editing?.fatherName ?? '',
    cnic: editing?.cnic ?? '',
    phone: editing?.phone ?? '',
    altPhone: editing?.altPhone ?? '',
    village: editing?.village ?? '',
    tehsil: editing?.tehsil ?? '',
    district: editing?.district ?? '',
    province: editing?.province ?? 'Punjab',
    address: editing?.address ?? '',
    landmark: editing?.landmark ?? '',
    landAreaAcres: editing?.landAreaAcres ?? '',
    landAreaKanals: editing?.landAreaKanals ?? '',
    landOwnership: editing?.landOwnership ?? '',
    soilType: editing?.soilType ?? '',
    waterSource: editing?.waterSource ?? '',
    irrigationType: editing?.irrigationType ?? '',
    farmingType: editing?.farmingType ?? [],
    primaryCrops: editing?.primaryCrops ?? [],
    creditLimit: editing?.creditLimit ?? 0,
    creditDays: editing?.creditDays ?? 60,
    interestRate: editing?.interestRate ?? 0,
    notes: editing?.notes ?? '',
    photoUrl: editing?.photoUrl ?? '',
    cnicFrontUrl: editing?.cnicFrontUrl ?? '',
    cnicBackUrl: editing?.cnicBackUrl ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        creditLimit: Number(form.creditLimit) || 0,
        creditDays: Number(form.creditDays) || 60,
        interestRate: Number(form.interestRate) || 0,
        landAreaAcres: form.landAreaAcres ? Number(form.landAreaAcres) : null,
        landAreaKanals: form.landAreaKanals ? Number(form.landAreaKanals) : null,
      };
      return editing ? farmersApi.update(editing.id, payload) : farmersApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Farmer updated' : 'Farmer registered'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const toggleCrop = (crop: string) => {
    setForm({
      ...form,
      primaryCrops: form.primaryCrops.includes(crop) ? form.primaryCrops.filter((c: string) => c !== crop) : [...form.primaryCrops, crop],
    });
  };

  const toggleFarmingType = (ft: string) => {
    setForm({
      ...form,
      farmingType: form.farmingType.includes(ft) ? form.farmingType.filter((f: string) => f !== ft) : [...form.farmingType, ft],
    });
  };

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-300 dark:border-emerald-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">{editing ? 'Edit Farmer' : 'Register New Farmer'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Personal */}
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Full Name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} placeholder="Father's Name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="CNIC (XXXXX-XXXXXXX-X)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        </div>

        {/* Location */}
        <div className="rounded-xl border-2 border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-teal-900 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} placeholder="Village" className="h-10 rounded-lg border-2 border-teal-300 bg-white dark:bg-teal-950/40 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
            <input value={form.tehsil} onChange={(e) => setForm({ ...form, tehsil: e.target.value })} placeholder="Tehsil" className="h-10 rounded-lg border-2 border-teal-300 bg-white dark:bg-teal-950/40 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
            <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="District" className="h-10 rounded-lg border-2 border-teal-300 bg-white dark:bg-teal-950/40 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
            <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="h-10 rounded-lg border-2 border-teal-300 bg-white dark:bg-teal-950/40 px-3 text-sm font-bold focus:outline-none focus:border-teal-500">
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" className="w-full rounded-lg border-2 border-teal-300 bg-white dark:bg-teal-950/40 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-teal-500 resize-none" />
        </div>

        {/* Land */}
        <div className="rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-green-900 flex items-center gap-2">
            <Tractor className="h-4 w-4" />
            Farm Details
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="number" step="0.1" value={form.landAreaAcres} onChange={(e) => setForm({ ...form, landAreaAcres: e.target.value })} placeholder="Land (acres)" className="h-10 rounded-lg border-2 border-green-300 bg-white dark:bg-green-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-green-500" />
            <input type="number" value={form.landAreaKanals} onChange={(e) => setForm({ ...form, landAreaKanals: e.target.value })} placeholder="Land (kanals)" className="h-10 rounded-lg border-2 border-green-300 bg-white dark:bg-green-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-green-500" />
            <select value={form.soilType} onChange={(e) => setForm({ ...form, soilType: e.target.value })} className="h-10 rounded-lg border-2 border-green-300 bg-white dark:bg-green-950/40 px-3 text-sm font-bold focus:outline-none focus:border-green-500">
              <option value="">-- Soil Type --</option>
              {SOIL_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={form.waterSource} onChange={(e) => setForm({ ...form, waterSource: e.target.value })} className="h-10 rounded-lg border-2 border-green-300 bg-white dark:bg-green-950/40 px-3 text-sm font-bold focus:outline-none focus:border-green-500">
              <option value="">-- Water Source --</option>
              {WATER_SOURCES.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>

        {/* Crops */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-green-700 mb-2 block">Primary Crops</label>
          <div className="flex flex-wrap gap-1">
            {COMMON_CROPS.map((c) => (
              <button key={c} onClick={() => toggleCrop(c)} className={
                'px-2 py-1 rounded-lg text-xs font-extrabold border-2 ' +
                (form.primaryCrops.includes(c) ? 'border-green-500 bg-green-50 dark:bg-green-950/40 text-green-700' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 hover:border-green-300')
              }>{c}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Farming Types</label>
          <div className="flex flex-wrap gap-1">
            {FARMING_TYPES.map((ft) => (
              <button key={ft} onClick={() => toggleFarmingType(ft)} className={
                'px-2 py-1 rounded-lg text-xs font-extrabold border-2 ' +
                (form.farmingType.includes(ft) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 hover:border-emerald-300')
              }>{ft}</button>
            ))}
          </div>
        </div>

        {/* Credit */}
        <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Credit Terms
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Credit Limit (Rs)</label>
              <input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} className="h-10 w-full rounded-lg border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Credit Days</label>
              <input type="number" value={form.creditDays} onChange={(e) => setForm({ ...form, creditDays: e.target.value })} className="h-10 w-full rounded-lg border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Interest Rate %</label>
              <input type="number" step="0.1" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} className="h-10 w-full rounded-lg border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
          </div>
        </div>

        {/* Photo */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Photo</label>
          {form.photoUrl ? (
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-slate-200">
              <img src={form.photoUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setForm({ ...form, photoUrl: '' })} className="absolute top-1 right-1 h-6 w-6 rounded bg-rose-600 text-white flex items-center justify-center">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <UploadDropzone onUploaded={(records) => {
              const first = Array.isArray(records) ? records[0] : records;
              const url = typeof first === 'string' ? first : (first as any)?.url;
              if (url) setForm({ ...form, photoUrl: url });
            }} />
          )}
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.fullName || !form.phone}>
            <Save className="h-4 w-4" />
            {editing ? 'Update Farmer' : 'Register Farmer'}
          </Button>
        </div>
      </div>
    </section>
  );
}
