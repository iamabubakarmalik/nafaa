import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Car, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  User, Phone, Calendar, AlertCircle, Wrench, Fuel, Settings,
  Shield, FileText, Eye,
} from 'lucide-react';
import { customerVehiclesApi, type CustomerVehicle, type FuelType, type TransmissionType } from '../api/customer-vehicles.api';
import { vehicleMakesApi } from '../api/vehicle-makes.api';
import { vehicleModelsApi } from '../api/vehicle-models.api';
import { customersApi } from '@/api/customers.api';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

const FUEL_TYPES: { value: FuelType; label: string; emoji: string }[] = [
  { value: 'PETROL', label: 'Petrol', emoji: '⛽' },
  { value: 'DIESEL', label: 'Diesel', emoji: '🛢️' },
  { value: 'CNG', label: 'CNG', emoji: '💨' },
  { value: 'LPG', label: 'LPG', emoji: '🔥' },
  { value: 'HYBRID', label: 'Hybrid', emoji: '⚡' },
  { value: 'ELECTRIC', label: 'Electric', emoji: '🔋' },
];

const TRANSMISSION_TYPES: TransmissionType[] = ['MANUAL', 'AUTOMATIC', 'CVT', 'DCT', 'SEMI_AUTO'];

export default function CustomerVehiclesPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CustomerVehicle | null>(null);

  const { data: vehicles = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customer-vehicles', search, filter],
    queryFn: () => customerVehiclesApi.list({
      search: search.trim() || undefined,
      active: true,
    }),
  });

  const { data: expiringData } = useQuery({
    queryKey: ['expiring-documents'],
    queryFn: () => customerVehiclesApi.expiringDocuments(30),
    enabled: !!filter,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => customerVehiclesApi.remove(id),
    onSuccess: () => { toast.success('Vehicle removed'); queryClient.invalidateQueries({ queryKey: ['customer-vehicles'] }); },
  });

  const filtered = filter === 'insurance-expiring' ? (expiringData?.insuranceExpiring || [])
    : filter === 'token-expiring' ? (expiringData?.tokenExpiring || [])
    : filter === 'fitness-expiring' ? (expiringData?.fitnessExpiring || [])
    : vehicles;

  const stats = {
    total: vehicles.length,
    insuranceExpiring: expiringData?.insuranceExpiring?.length || 0,
    tokenExpiring: expiringData?.tokenExpiring?.length || 0,
    fitnessExpiring: expiringData?.fitnessExpiring?.length || 0,
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Registered Vehicles
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🚗 Customer Vehicles</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Registration, chassis, insurance, service history</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Register Vehicle
            </Button>
          </div>
        </div>
      </section>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <Link to="/autoparts/vehicles" className={
          'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
          (!filter ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
        }>All Vehicles ({stats.total})</Link>
        <Link to="?filter=insurance-expiring" className={
          'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
          (filter === 'insurance-expiring' ? 'bg-amber-600 text-white shadow' : 'bg-amber-100 text-amber-700 hover:bg-amber-200')
        }>🛡️ Insurance Expiring ({stats.insuranceExpiring})</Link>
        <Link to="?filter=token-expiring" className={
          'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
          (filter === 'token-expiring' ? 'bg-orange-600 text-white shadow' : 'bg-orange-100 text-orange-700 hover:bg-orange-200')
        }>💰 Token Tax Due ({stats.tokenExpiring})</Link>
        <Link to="?filter=fitness-expiring" className={
          'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
          (filter === 'fitness-expiring' ? 'bg-rose-600 text-white shadow' : 'bg-rose-100 text-rose-700 hover:bg-rose-200')
        }>✅ Fitness Expiring ({stats.fitnessExpiring})</Link>
      </div>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by registration, name, phone, chassis..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500" />
        </div>
      </section>

      {showForm && (
        <VehicleForm editing={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['customer-vehicles'] }); }} />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Car className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No vehicles found</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v: any) => <VehicleCard key={v.id} vehicle={v} onEdit={() => { setEditing(v); setShowForm(true); }} onDelete={() => { if (confirm('Remove ' + v.registrationNumber + '?')) removeMutation.mutate(v.id); }} />)}
        </section>
      )}
    </div>
  );
}

function VehicleCard({ vehicle, onEdit, onDelete }: any) {
  const now = new Date();
  const insDaysLeft = vehicle.insuranceExpiry ? differenceInDays(new Date(vehicle.insuranceExpiry), now) : null;
  const tokenDaysLeft = vehicle.tokenTaxExpiry ? differenceInDays(new Date(vehicle.tokenTaxExpiry), now) : null;
  const fitDaysLeft = vehicle.fitnessExpiry ? differenceInDays(new Date(vehicle.fitnessExpiry), now) : null;
  const hasAlerts = (insDaysLeft !== null && insDaysLeft <= 30) || (tokenDaysLeft !== null && tokenDaysLeft <= 30) || (fitDaysLeft !== null && fitDaysLeft <= 30);
  const fuel = FUEL_TYPES.find((f) => f.value === vehicle.fuelType);

  return (
    <div className={
      'group rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl transition p-4 space-y-3 ' +
      (hasAlerts ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow shrink-0 overflow-hidden">
            {vehicle.photoUrls?.[0] ? <img src={vehicle.photoUrls[0]} alt="" className="w-full h-full object-cover" /> : <Car className="h-7 w-7" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white text-lg">{vehicle.registrationNumber}</span>
              {hasAlerts && <AlertCircle className="h-4 w-4 text-amber-600" />}
            </div>
            <div className="text-xs font-extrabold text-blue-600">{vehicle.makeName} {vehicle.modelName}</div>
            {vehicle.year && <div className="text-[10px] font-bold text-slate-500">{vehicle.year} • {vehicle.color}</div>}
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition flex gap-1 shrink-0">
          <Link to={'/autoparts/vehicles/' + vehicle.id} className="h-8 w-8 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center">
            <Eye className="h-3.5 w-3.5" />
          </Link>
          <button onClick={onEdit} className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-xs">
        <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-2 text-center">
          <Fuel className="h-3 w-3 mx-auto text-slate-500" />
          <div className="text-[9px] font-bold text-slate-500 mt-0.5">{fuel?.emoji} {vehicle.fuelType}</div>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-2 text-center">
          <Settings className="h-3 w-3 mx-auto text-slate-500" />
          <div className="text-[9px] font-bold text-slate-500 mt-0.5">{vehicle.transmission}</div>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-2 text-center">
          <div className="text-[9px] font-bold text-slate-500">{vehicle.odometerKm || 0} km</div>
        </div>
      </div>

      {vehicle.ownerName && (
        <div className="flex items-center gap-1 text-xs text-slate-700 font-bold">
          <User className="h-3 w-3" />
          {vehicle.ownerName}
          {vehicle.ownerPhone && (
            <>
              <Phone className="h-3 w-3 ml-2" />
              {vehicle.ownerPhone}
            </>
          )}
        </div>
      )}

      {/* Document alerts */}
      {(insDaysLeft !== null || tokenDaysLeft !== null || fitDaysLeft !== null) && (
        <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
          {insDaysLeft !== null && (
            <DocAlert icon={Shield} label="Insurance" days={insDaysLeft} date={vehicle.insuranceExpiry} />
          )}
          {tokenDaysLeft !== null && (
            <DocAlert icon={FileText} label="Token" days={tokenDaysLeft} date={vehicle.tokenTaxExpiry} />
          )}
          {fitDaysLeft !== null && (
            <DocAlert icon={FileText} label="Fitness" days={fitDaysLeft} date={vehicle.fitnessExpiry} />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs">
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Services</div>
          <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">{vehicle.totalServices}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-extrabold text-emerald-700">Total Spent</div>
          <div className="font-extrabold text-emerald-700 tabular-nums text-[11px]">{formatPKR(vehicle.totalSpent).replace('Rs', '').trim()}</div>
        </div>
      </div>

      <Link to={'/autoparts/jobs/new?vehicleId=' + vehicle.id} className="w-full h-9 rounded-lg bg-gradient-to-r from-orange-600 to-red-700 text-white text-xs font-extrabold flex items-center justify-center gap-1 hover:shadow-lg transition">
        <Wrench className="h-3 w-3" />
        New Service Job
      </Link>
    </div>
  );
}

function DocAlert({ icon: Icon, label, days, date }: any) {
  const color = days < 0 ? 'text-rose-700 bg-rose-50' : days <= 15 ? 'text-amber-700 bg-amber-50' : days <= 30 ? 'text-orange-700 bg-orange-50' : 'text-slate-600';
  return (
    <div className={'flex items-center justify-between px-2 py-1 rounded text-[10px] font-extrabold ' + color}>
      <span className="flex items-center gap-1">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </span>
      <span>
        {days < 0 ? 'Expired' : days <= 30 ? days + 'd left' : format(new Date(date), 'dd MMM yy')}
      </span>
    </div>
  );
}

function VehicleForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    customerId: editing?.customerId ?? '',
    registrationNumber: editing?.registrationNumber ?? '',
    chassisNumber: editing?.chassisNumber ?? '',
    engineNumber: editing?.engineNumber ?? '',
    makeId: editing?.makeId ?? '',
    modelId: editing?.modelId ?? '',
    vehicleType: editing?.vehicleType ?? 'CAR',
    year: editing?.year ?? '',
    color: editing?.color ?? '',
    fuelType: editing?.fuelType ?? 'PETROL',
    transmission: editing?.transmission ?? 'MANUAL',
    engineCC: editing?.engineCC ?? '',
    odometerKm: editing?.odometerKm ?? '',
    ownerName: editing?.ownerName ?? '',
    ownerPhone: editing?.ownerPhone ?? '',
    ownerCnic: editing?.ownerCnic ?? '',
    insuranceProvider: editing?.insuranceProvider ?? '',
    insurancePolicyNumber: editing?.insurancePolicyNumber ?? '',
    insuranceExpiry: editing?.insuranceExpiry ? editing.insuranceExpiry.slice(0, 10) : '',
    tokenTaxExpiry: editing?.tokenTaxExpiry ? editing.tokenTaxExpiry.slice(0, 10) : '',
    fitnessExpiry: editing?.fitnessExpiry ? editing.fitnessExpiry.slice(0, 10) : '',
    photoUrls: editing?.photoUrls ?? [],
    documentUrls: editing?.documentUrls ?? [],
    notes: editing?.notes ?? '',
  });

  const { data: makes = [] } = useQuery({ queryKey: ['makes-for-vehicle-form'], queryFn: () => vehicleMakesApi.list({ active: true }) });
  const { data: models = [] } = useQuery({ queryKey: ['models-for-vehicle-form', form.makeId], queryFn: () => vehicleModelsApi.list({ makeId: form.makeId, active: true }), enabled: !!form.makeId });
  const { data: customersData } = useQuery({ queryKey: ['customers-for-vehicle-form'], queryFn: () => customersApi.list({ limit: 500 }) });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        year: form.year ? Number(form.year) : undefined,
        engineCC: form.engineCC ? Number(form.engineCC) : undefined,
        odometerKm: form.odometerKm ? Number(form.odometerKm) : undefined,
        insuranceExpiry: form.insuranceExpiry || undefined,
        tokenTaxExpiry: form.tokenTaxExpiry || undefined,
        fitnessExpiry: form.fitnessExpiry || undefined,
      };
      return editing ? customerVehiclesApi.update(editing.id, payload) : customerVehiclesApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Registered'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-blue-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">{editing ? 'Edit Vehicle' : 'Register New Vehicle'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Registration */}
        <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-blue-900 dark:text-blue-300">🚗 Vehicle Registration</div>
          <input autoFocus value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value.toUpperCase() })} placeholder="Registration # * (e.g. LEA-1234)" className="h-11 w-full rounded-xl border-2 border-blue-300 bg-white dark:bg-blue-950/40 px-3 text-sm font-extrabold uppercase focus:outline-none focus:border-blue-500" />
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={form.chassisNumber} onChange={(e) => setForm({ ...form, chassisNumber: e.target.value })} placeholder="Chassis Number" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-blue-500" />
            <input value={form.engineNumber} onChange={(e) => setForm({ ...form, engineNumber: e.target.value })} placeholder="Engine Number" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        {/* Make/Model */}
        <div className="grid sm:grid-cols-2 gap-3">
          <select value={form.makeId} onChange={(e) => setForm({ ...form, makeId: e.target.value, modelId: '' })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
            <option value="">Select Make</option>
            {makes.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={form.modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })} disabled={!form.makeId} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500 disabled:opacity-50">
            <option value="">Select Model</option>
            {models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="Year" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500" />
          <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Color" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <input type="number" value={form.engineCC} onChange={(e) => setForm({ ...form, engineCC: e.target.value })} placeholder="Engine CC" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500" />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <select value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
            {FUEL_TYPES.map((f) => <option key={f.value} value={f.value}>{f.emoji} {f.label}</option>)}
          </select>
          <select value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
            {TRANSMISSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="number" value={form.odometerKm} onChange={(e) => setForm({ ...form, odometerKm: e.target.value })} placeholder="Odometer (km)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500" />
        </div>

        {/* Owner */}
        <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300">👤 Owner Details</div>
          <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
            <option value="">-- Link to Customer (optional) --</option>
            {(customersData?.items ?? []).map((c) => <option key={c.id} value={c.id}>{c.name} • {c.phone}</option>)}
          </select>
          <div className="grid sm:grid-cols-3 gap-2">
            <input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} placeholder="Owner Name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            <input value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            <input value={form.ownerCnic} onChange={(e) => setForm({ ...form, ownerCnic: e.target.value })} placeholder="CNIC" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-amber-900 dark:text-amber-300">📋 Documents & Insurance</div>
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={form.insuranceProvider} onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })} placeholder="Insurance Provider (e.g. EFU, Jubilee)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            <input value={form.insurancePolicyNumber} onChange={(e) => setForm({ ...form, insurancePolicyNumber: e.target.value })} placeholder="Policy Number" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-amber-500" />
          </div>
          <div className="grid sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Insurance Expiry</label>
              <input type="date" value={form.insuranceExpiry} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Token Tax Expiry</label>
              <input type="date" value={form.tokenTaxExpiry} onChange={(e) => setForm({ ...form, tokenTaxExpiry: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Fitness Expiry</label>
              <input type="date" value={form.fitnessExpiry} onChange={(e) => setForm({ ...form, fitnessExpiry: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            </div>
          </div>
        </div>

        {/* Photos */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Vehicle Photos</label>
          {form.photoUrls.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 mb-2">
              {form.photoUrls.map((url: string, i: number) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({ ...form, photoUrls: form.photoUrls.filter((_: any, idx: number) => idx !== i) })} className="absolute top-0 right-0 h-5 w-5 rounded-bl bg-rose-600 text-white flex items-center justify-center">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <UploadDropzone onUploaded={(records) => {
            const urls = Array.isArray(records) ? records.map((r: any) => r.url || r).filter(Boolean) : [(records as any)?.url || records];
            setForm({ ...form, photoUrls: [...form.photoUrls, ...urls] });
          }} />
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.registrationNumber.trim()}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Register'}
          </Button>
        </div>
      </div>
    </section>
  );
}
