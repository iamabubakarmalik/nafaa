import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Plus, Trash2, Sparkles, Wrench, X, Car, User,
  Package, DollarSign, AlertCircle, Search,
} from 'lucide-react';
import { workshopJobsApi } from '../api/workshop-jobs.api';
import { customerVehiclesApi } from '../api/customer-vehicles.api';
import { mechanicsApi } from '../api/mechanics.api';
import { productsApi } from '@/api/products.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const JOB_TYPES = [
  { value: 'GENERAL_SERVICE', label: 'General Service', emoji: '🔧' },
  { value: 'OIL_CHANGE', label: 'Oil Change', emoji: '🛢️' },
  { value: 'TUNE_UP', label: 'Tune-up', emoji: '⚙️' },
  { value: 'REPAIR', label: 'Repair', emoji: '🔨' },
  { value: 'BRAKE_SERVICE', label: 'Brake Service', emoji: '🛑' },
  { value: 'BATTERY_CHANGE', label: 'Battery', emoji: '🔋' },
  { value: 'AC_SERVICE', label: 'A/C Service', emoji: '❄️' },
  { value: 'TIRE_CHANGE', label: 'Tire Change', emoji: '🛞' },
  { value: 'DIAGNOSTIC', label: 'Diagnostic', emoji: '💻' },
  { value: 'DENTING_PAINTING', label: 'Denting/Paint', emoji: '🎨' },
  { value: 'WHEEL_ALIGNMENT', label: 'Wheel Alignment', emoji: '📐' },
  { value: 'ACCIDENT_REPAIR', label: 'Accident Repair', emoji: '💥' },
  { value: 'OTHER', label: 'Other', emoji: '🔧' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: 'bg-slate-500' },
  { value: 'NORMAL', label: 'Normal', color: 'bg-blue-500' },
  { value: 'HIGH', label: 'High', color: 'bg-amber-500' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-600' },
  { value: 'EMERGENCY', label: 'Emergency', color: 'bg-red-700' },
];

export default function NewWorkshopJobPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedVehicleId = searchParams.get('vehicleId');

  const [form, setForm] = useState<any>({
    vehicleId: preselectedVehicleId || '',
    customerId: '',
    customerName: '',
    customerPhone: '',
    priority: 'NORMAL',
    jobType: 'GENERAL_SERVICE',
    customerComplaint: '',
    diagnosis: '',
    workDescription: '',
    primaryMechanicId: '',
    bayNumber: '',
    promisedAt: '',
    odometerKm: '',
    fuelLevel: '',
    hasSpareTire: false,
    hasToolkit: false,
    externalDamages: '',
    discount: 0,
    taxAmount: 0,
    internalNotes: '',
  });

  const [laborItems, setLaborItems] = useState<any[]>([]);
  const [partsUsed, setPartsUsed] = useState<any[]>([]);
  const [externalWork, setExternalWork] = useState<any[]>([]);

  const [vehicleSearch, setVehicleSearch] = useState('');
  const [showVehiclePicker, setShowVehiclePicker] = useState(!preselectedVehicleId);

  const { data: vehiclesData = [] } = useQuery({
    queryKey: ['vehicles-for-job', vehicleSearch],
    queryFn: () => customerVehiclesApi.list({ search: vehicleSearch || undefined, active: true }),
    enabled: showVehiclePicker,
  });

  const { data: preselectedVehicle } = useQuery({
    queryKey: ['vehicle-preselected', preselectedVehicleId],
    queryFn: () => customerVehiclesApi.getOne(preselectedVehicleId!),
    enabled: !!preselectedVehicleId,
  });

  const { data: mechanics = [] } = useQuery({
    queryKey: ['mechanics-for-job'],
    queryFn: () => mechanicsApi.list({ available: true }),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-for-job'],
    queryFn: () => productsApi.list({ limit: 500 }),
  });

  const selectedVehicle = preselectedVehicle || vehiclesData.find((v) => v.id === form.vehicleId);

  // Totals
  const laborTotal = laborItems.reduce((s, l) => s + (l.hours || 1) * (l.ratePerHour || 0), 0);
  const partsTotal = partsUsed.reduce((s, p) => s + ((p.unitPrice || 0) * (p.quantity || 1) - (p.discount || 0)), 0);
  const externalTotal = externalWork.reduce((s, e) => s + (e.cost || 0) + (e.markup || 0), 0);
  const subtotal = laborTotal + partsTotal + externalTotal;
  const total = Math.max(subtotal + Number(form.taxAmount) - Number(form.discount), 0);

  const createMutation = useMutation({
    mutationFn: () => workshopJobsApi.create({
      ...form,
      odometerKm: form.odometerKm ? Number(form.odometerKm) : undefined,
      discount: Number(form.discount) || 0,
      taxAmount: Number(form.taxAmount) || 0,
      customerId: form.customerId || selectedVehicle?.customerId,
      customerName: form.customerName || selectedVehicle?.ownerName,
      customerPhone: form.customerPhone || selectedVehicle?.ownerPhone,
      laborItems: laborItems.map((l) => ({ ...l, hours: Number(l.hours) || 1, ratePerHour: Number(l.ratePerHour) || 0 })),
      partsUsed: partsUsed.map((p) => ({ ...p, quantity: Number(p.quantity) || 1, unitPrice: Number(p.unitPrice) || 0, discount: Number(p.discount) || 0 })),
      externalWork: externalWork.map((e) => ({ ...e, cost: Number(e.cost) || 0, markup: Number(e.markup) || 0 })),
    }),
    onSuccess: (job) => {
      toast.success('Job ' + job.jobNumber + ' created');
      navigate('/autoparts/jobs/' + job.id);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const canSubmit = form.vehicleId || (form.customerName && form.customerPhone);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/autoparts/jobs')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                New Job
              </div>
              <h1 className="mt-1 text-2xl font-extrabold">🔧 New Workshop Job</h1>
            </div>
          </div>
          <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} className="bg-white text-slate-900 hover:bg-slate-100">
            <Save className="h-4 w-4" />
            Create Job
          </Button>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* Vehicle */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Car className="h-4 w-4 text-blue-600" />
              Vehicle
            </h3>

            {selectedVehicle ? (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 p-3 flex items-center gap-3">
                <Car className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <div className="font-extrabold text-slate-900 dark:text-white">{selectedVehicle.registrationNumber}</div>
                  <div className="text-xs font-bold text-slate-600">{selectedVehicle.makeName} {selectedVehicle.modelName} {selectedVehicle.year}</div>
                  {selectedVehicle.ownerName && <div className="text-xs font-bold text-slate-500">{selectedVehicle.ownerName} • {selectedVehicle.ownerPhone}</div>}
                </div>
                <button onClick={() => { setForm({ ...form, vehicleId: '' }); setShowVehiclePicker(true); }} className="text-xs font-extrabold text-blue-600 hover:underline">Change</button>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 space-y-2">
                <input autoFocus value={vehicleSearch} onChange={(e) => setVehicleSearch(e.target.value)} placeholder="Search vehicle by registration, name, phone..." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {vehiclesData.map((v) => (
                    <button key={v.id} onClick={() => { setForm({ ...form, vehicleId: v.id }); setShowVehiclePicker(false); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white text-left">
                      <Car className="h-3.5 w-3.5 text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-extrabold truncate">{v.registrationNumber}</div>
                        <div className="text-[10px] font-bold text-slate-500">{v.makeName} {v.modelName} • {v.ownerName}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-2">
              <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name (or walk-in)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
              <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
            </div>
            <input type="number" value={form.odometerKm} onChange={(e) => setForm({ ...form, odometerKm: e.target.value })} placeholder="Current Odometer (km)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500" />
          </section>

          {/* Job Details */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Wrench className="h-4 w-4 text-orange-600" />
              Job Details
            </h3>

            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Job Type</label>
              <div className="flex flex-wrap gap-1">
                {JOB_TYPES.map((t) => (
                  <button key={t.value} onClick={() => setForm({ ...form, jobType: t.value })} className={
                    'px-2 py-1 rounded-lg text-xs font-extrabold border-2 ' +
                    (form.jobType === t.value ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 hover:border-orange-300')
                  }>{t.emoji} {t.label}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Priority</label>
              <div className="grid grid-cols-5 gap-2">
                {PRIORITIES.map((p) => (
                  <button key={p.value} onClick={() => setForm({ ...form, priority: p.value })} className={
                    'p-2 rounded-xl border-2 text-xs font-extrabold ' +
                    (form.priority === p.value ? p.color + ' border-transparent text-white' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 hover:border-orange-300')
                  }>{p.label}</button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <select value={form.primaryMechanicId} onChange={(e) => setForm({ ...form, primaryMechanicId: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500">
                <option value="">Assign Mechanic</option>
                {mechanics.map((m) => {
                  const nm = m.staff ? ((m.staff as any).firstName || '') + ' ' + ((m.staff as any).lastName || '') : '';
                  return <option key={m.id} value={m.id}>{nm.trim() || 'Mechanic'} • Rs {m.hourlyRate}/hr</option>;
                })}
              </select>
              <input value={form.bayNumber} onChange={(e) => setForm({ ...form, bayNumber: e.target.value })} placeholder="Bay # (optional)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
            </div>

            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Promised Delivery</label>
              <input type="datetime-local" value={form.promisedAt} onChange={(e) => setForm({ ...form, promisedAt: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
            </div>

            <textarea rows={2} value={form.customerComplaint} onChange={(e) => setForm({ ...form, customerComplaint: e.target.value })} placeholder="Customer complaint / problem description..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-orange-500 resize-none" />
            <textarea rows={2} value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} placeholder="Diagnosis / findings..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-orange-500 resize-none" />
            <textarea rows={2} value={form.workDescription} onChange={(e) => setForm({ ...form, workDescription: e.target.value })} placeholder="Work to be done..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-orange-500 resize-none" />
          </section>

          {/* Labor Items */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="h-4 w-4 text-orange-600" />
                Labor ({laborItems.length})
              </h3>
              <Button size="sm" onClick={() => setLaborItems([...laborItems, { description: '', hours: 1, ratePerHour: 500 }])} className="bg-gradient-to-r from-orange-600 to-red-700">
                <Plus className="h-3.5 w-3.5" />
                Add Labor
              </Button>
            </div>
            {laborItems.map((item, i) => (
              <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold text-slate-600">Labor #{i + 1}</span>
                  <button onClick={() => setLaborItems(laborItems.filter((_, idx) => idx !== i))} className="h-6 w-6 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <input value={item.description} onChange={(e) => { const c = [...laborItems]; c[i].description = e.target.value; setLaborItems(c); }} placeholder="Description *" className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-2 text-sm font-bold focus:outline-none focus:border-orange-500" />
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" step="0.1" value={item.hours} onChange={(e) => { const c = [...laborItems]; c[i].hours = Number(e.target.value); setLaborItems(c); }} placeholder="Hours" className="h-10 rounded-lg border-2 border-slate-200 bg-white px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-orange-500" />
                  <input type="number" value={item.ratePerHour} onChange={(e) => { const c = [...laborItems]; c[i].ratePerHour = Number(e.target.value); setLaborItems(c); }} placeholder="Rate/hr" className="h-10 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-emerald-500" />
                  <div className="h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-sm font-extrabold text-emerald-800 tabular-nums">
                    {formatPKR((item.hours || 1) * (item.ratePerHour || 0))}
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Parts */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-600" />
                Parts Used ({partsUsed.length})
              </h3>
              <Button size="sm" onClick={() => setPartsUsed([...partsUsed, { partName: '', quantity: 1, unitPrice: 0, discount: 0 }])} className="bg-gradient-to-r from-amber-600 to-orange-700">
                <Plus className="h-3.5 w-3.5" />
                Add Part
              </Button>
            </div>
            {partsUsed.map((item, i) => (
              <div key={i} className="rounded-xl border-2 border-slate-200 bg-amber-50/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold text-slate-600">Part #{i + 1}</span>
                  <button onClick={() => setPartsUsed(partsUsed.filter((_, idx) => idx !== i))} className="h-6 w-6 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <select value={item.productId || ''} onChange={(e) => {
                  const c = [...partsUsed];
                  const prod = productsData?.items?.find((p) => p.id === e.target.value);
                  if (prod) {
                    c[i].productId = prod.id;
                    c[i].partName = prod.name;
                    c[i].unitPrice = prod.price;
                  }
                  setPartsUsed(c);
                }} className="h-10 w-full rounded-lg border-2 border-amber-200 bg-white px-2 text-sm font-bold focus:outline-none focus:border-amber-500">
                  <option value="">-- Or select from inventory --</option>
                  {(productsData?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} • {formatPKR(p.price)}</option>)}
                </select>
                <input value={item.partName} onChange={(e) => { const c = [...partsUsed]; c[i].partName = e.target.value; setPartsUsed(c); }} placeholder="Part name *" className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-2 text-sm font-bold focus:outline-none focus:border-amber-500" />
                <div className="grid grid-cols-4 gap-2">
                  <input type="number" value={item.quantity} onChange={(e) => { const c = [...partsUsed]; c[i].quantity = Number(e.target.value); setPartsUsed(c); }} placeholder="Qty" className="h-10 rounded-lg border-2 border-slate-200 bg-white px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-amber-500" />
                  <input type="number" value={item.unitPrice} onChange={(e) => { const c = [...partsUsed]; c[i].unitPrice = Number(e.target.value); setPartsUsed(c); }} placeholder="Price" className="h-10 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-emerald-500" />
                  <input type="number" value={item.discount} onChange={(e) => { const c = [...partsUsed]; c[i].discount = Number(e.target.value); setPartsUsed(c); }} placeholder="Disc" className="h-10 rounded-lg border-2 border-rose-200 bg-rose-50 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-rose-500" />
                  <div className="h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-sm font-extrabold text-emerald-800 tabular-nums">
                    {formatPKR((item.quantity || 1) * (item.unitPrice || 0) - (item.discount || 0))}
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* External Work */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white">🏢 External Work ({externalWork.length})</h3>
              <Button size="sm" onClick={() => setExternalWork([...externalWork, { description: '', vendorName: '', cost: 0, markup: 0 }])} className="bg-gradient-to-r from-violet-600 to-purple-700">
                <Plus className="h-3.5 w-3.5" />
                Add External
              </Button>
            </div>
            {externalWork.map((item, i) => (
              <div key={i} className="rounded-xl border-2 border-slate-200 bg-violet-50/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold text-slate-600">External #{i + 1}</span>
                  <button onClick={() => setExternalWork(externalWork.filter((_, idx) => idx !== i))} className="h-6 w-6 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <input value={item.description} onChange={(e) => { const c = [...externalWork]; c[i].description = e.target.value; setExternalWork(c); }} placeholder="Description (e.g. Painting)" className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-2 text-sm font-bold focus:outline-none focus:border-violet-500" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={item.vendorName} onChange={(e) => { const c = [...externalWork]; c[i].vendorName = e.target.value; setExternalWork(c); }} placeholder="Vendor name" className="h-10 rounded-lg border-2 border-slate-200 bg-white px-2 text-sm font-bold focus:outline-none focus:border-violet-500" />
                  <input value={item.vendorPhone} onChange={(e) => { const c = [...externalWork]; c[i].vendorPhone = e.target.value; setExternalWork(c); }} placeholder="Phone" className="h-10 rounded-lg border-2 border-slate-200 bg-white px-2 text-sm font-bold focus:outline-none focus:border-violet-500" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" value={item.cost} onChange={(e) => { const c = [...externalWork]; c[i].cost = Number(e.target.value); setExternalWork(c); }} placeholder="Cost" className="h-10 rounded-lg border-2 border-slate-200 bg-white px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-violet-500" />
                  <input type="number" value={item.markup} onChange={(e) => { const c = [...externalWork]; c[i].markup = Number(e.target.value); setExternalWork(c); }} placeholder="Markup" className="h-10 rounded-lg border-2 border-amber-200 bg-amber-50 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-amber-500" />
                  <div className="h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-sm font-extrabold text-emerald-800 tabular-nums">
                    {formatPKR((item.cost || 0) + (item.markup || 0))}
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-orange-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">💰 Summary</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Labor</span><span className="font-bold tabular-nums">{formatPKR(laborTotal)}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Parts</span><span className="font-bold tabular-nums">{formatPKR(partsTotal)}</span></div>
                <div className="flex justify-between"><span className="text-white/70">External</span><span className="font-bold tabular-nums">{formatPKR(externalTotal)}</span></div>
                <div className="pt-2 border-t border-white/20 flex justify-between">
                  <span className="text-white/70 font-bold">Subtotal</span>
                  <span className="font-extrabold tabular-nums text-cyan-300">{formatPKR(subtotal)}</span>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Discount</label>
                  <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Tax</label>
                  <input type="number" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
              </div>
            </div>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} size="lg" className="w-full bg-gradient-to-r from-orange-600 to-red-700">
              <Save className="h-5 w-5" />
              Create Job
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
