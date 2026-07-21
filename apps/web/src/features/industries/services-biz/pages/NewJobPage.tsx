import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Save, User, Phone, Search, Sparkles, MapPin, Calendar,
  Zap, X, Wrench, Briefcase, Package, Plus, Trash2, Home,
} from 'lucide-react';
import { jobsApi } from '../api/jobs.api';
import { catalogApi } from '../api/catalog.api';
import { techniciansApi } from '../api/technicians.api';
import { customersApi } from '@/api/customers.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: 'bg-slate-500', emoji: '🐢' },
  { value: 'NORMAL', label: 'Normal', color: 'bg-blue-500', emoji: '📌' },
  { value: 'HIGH', label: 'High', color: 'bg-amber-500', emoji: '⚡' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-500', emoji: '🔥' },
  { value: 'EMERGENCY', label: 'Emergency', color: 'bg-red-600', emoji: '🚨' },
];

const LOCATIONS = [
  { value: 'CUSTOMER_HOME', label: '🏠 Home', emoji: '🏠' },
  { value: 'CUSTOMER_OFFICE', label: '🏢 Office', emoji: '🏢' },
  { value: 'CUSTOMER_SHOP', label: '🏪 Shop', emoji: '🏪' },
  { value: 'IN_SHOP', label: '🔧 In Our Shop', emoji: '🔧' },
  { value: 'ONLINE_REMOTE', label: '💻 Remote', emoji: '💻' },
  { value: 'FIELD_SITE', label: '🚧 Field Site', emoji: '🚧' },
];

export default function NewJobPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<any>({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerAltPhone: '',
    customerEmail: '',
    serviceId: '',
    serviceName: '',
    priority: 'NORMAL',
    problemDescription: '',
    customerReportedIssue: '',
    urgencyReason: '',
    brand: '',
    modelNumber: '',
    serialNumber: '',
    yearPurchased: '',
    underWarranty: false,
    warrantyExpiryDate: '',
    locationType: 'CUSTOMER_HOME',
    serviceAddress: '',
    city: '',
    area: '',
    landmark: '',
    entryInstructions: '',
    scheduledStart: '',
    scheduledEnd: '',
    preferredTimeSlot: '',
    primaryTechnicianId: '',
    visitCharge: 0,
    labourCharge: 0,
    transportCharge: 0,
    emergencyCharge: 0,
    discountAmount: 0,
    taxAmount: 0,
    advanceRequired: false,
    advancePct: 0,
    jobWarrantyDays: 30,
    jobWarrantyTerms: '',
    beforePhotoUrls: [] as string[],
    technicianNotes: '',
    internalNotes: '',
  });

  const [parts, setParts] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-service-job', customerSearch],
    queryFn: () => customersApi.list({ limit: 50, search: customerSearch || undefined }),
    enabled: showCustomerPicker,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['catalog-for-job'],
    queryFn: () => catalogApi.list({ active: true }),
    enabled: showServicePicker,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians-for-job'],
    queryFn: () => techniciansApi.list({}),
  });

  const partsCharge = parts.filter((p) => !p.isUnderWarranty).reduce((s, p) => s + (p.quantity * p.unitPrice), 0);
  const subtotal = Number(form.visitCharge) + Number(form.labourCharge) + partsCharge + Number(form.transportCharge) + Number(form.emergencyCharge);
  const total = Math.max(subtotal + Number(form.taxAmount) - Number(form.discountAmount), 0);

  const createMutation = useMutation({
    mutationFn: () => jobsApi.create({
      ...form,
      visitCharge: Number(form.visitCharge) || 0,
      labourCharge: Number(form.labourCharge) || 0,
      transportCharge: Number(form.transportCharge) || 0,
      emergencyCharge: Number(form.emergencyCharge) || 0,
      discountAmount: Number(form.discountAmount) || 0,
      taxAmount: Number(form.taxAmount) || 0,
      yearPurchased: form.yearPurchased ? Number(form.yearPurchased) : undefined,
      advancePct: Number(form.advancePct) || 0,
      jobWarrantyDays: Number(form.jobWarrantyDays) || 0,
      parts: parts.map((p) => ({
        productId: p.productId,
        partName: p.partName,
        partNumber: p.partNumber,
        brand: p.brand,
        quantity: Number(p.quantity) || 1,
        unitPrice: Number(p.unitPrice) || 0,
        costPrice: Number(p.costPrice) || 0,
        isCustomerSupplied: p.isCustomerSupplied ?? false,
        isUnderWarranty: p.isUnderWarranty ?? false,
        warrantyDays: Number(p.warrantyDays) || 0,
        serialNumber: p.serialNumber,
        notes: p.notes,
      })),
    }),
    onSuccess: (job) => {
      toast.success('Job ' + job.jobNumber + ' created!');
      navigate('/services-biz/jobs/' + job.id);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const selectService = (svc: any) => {
    setForm({
      ...form,
      serviceId: svc.id,
      serviceName: svc.name,
      businessType: svc.businessType,
      category: svc.category,
      visitCharge: svc.visitCharge || 0,
      labourCharge: svc.baseCharge || 0,
      jobWarrantyDays: svc.warrantyDays || 0,
    });
    setShowServicePicker(false);
  };

  const addPart = () => setParts([...parts, {
    partName: '', quantity: 1, unitPrice: 0, isUnderWarranty: false, warrantyDays: 0,
  }]);
  const removePart = (i: number) => setParts(parts.filter((_, idx) => idx !== i));
  const updatePart = (i: number, patch: any) => setParts(parts.map((p, idx) => idx === i ? { ...p, ...patch } : p));

  const canSubmit = form.serviceName && form.problemDescription && (form.customerName || form.customerId);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-800 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/services-biz/jobs')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                New Service Job
              </div>
              <h1 className="mt-1 text-2xl font-extrabold">🛠️ Create Job</h1>
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
          {/* Customer */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              Customer
            </h3>

            {form.customerId ? (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 p-3 flex items-center gap-3">
                <User className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <div className="font-extrabold">{form.customerName}</div>
                  {form.customerPhone && <div className="text-xs text-slate-600 font-bold">{form.customerPhone}</div>}
                </div>
                <button onClick={() => setForm({ ...form, customerId: '', customerName: '', customerPhone: '', customerEmail: '' })} className="text-xs font-extrabold text-blue-600 hover:underline">Change</button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowCustomerPicker(!showCustomerPicker)} className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-extrabold text-slate-600 hover:border-blue-400">
                  <Search className="h-4 w-4 inline mr-1" />
                  Search Existing Customer
                </button>
                {showCustomerPicker && (
                  <div className="rounded-xl border-2 border-blue-300 bg-blue-50/50 p-3 space-y-2">
                    <input autoFocus value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search..." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                    <div className="max-h-52 overflow-y-auto space-y-1">
                      {(customersData?.items ?? []).map((c) => (
                        <button key={c.id} onClick={() => { setForm({ ...form, customerId: c.id, customerName: c.name, customerPhone: c.phone || '', customerEmail: (c as any).email || '' }); setShowCustomerPicker(false); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white text-left">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm font-extrabold flex-1 truncate">{c.name}</span>
                          <span className="text-[10px] text-slate-500 font-bold">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                  <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                  <input value={form.customerAltPhone} onChange={(e) => setForm({ ...form, customerAltPhone: e.target.value })} placeholder="Alternate phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                  <input value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} placeholder="Email" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                </div>
              </>
            )}
          </section>

          {/* Service */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Wrench className="h-4 w-4 text-cyan-600" />
              Service Details
            </h3>

            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Service *</label>
              <div className="flex gap-2">
                <input value={form.serviceName} onChange={(e) => setForm({ ...form, serviceName: e.target.value })} placeholder="Service name" className="h-11 flex-1 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
                <Button variant="secondary" onClick={() => setShowServicePicker(true)}>
                  <Search className="h-4 w-4" />
                  Pick
                </Button>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Priority *</label>
              <div className="grid grid-cols-5 gap-2">
                {PRIORITIES.map((p) => (
                  <button key={p.value} onClick={() => setForm({ ...form, priority: p.value })} className={
                    'p-2 rounded-xl border-2 text-center transition ' +
                    (form.priority === p.value ? p.color + ' border-transparent text-white shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 hover:border-blue-300')
                  }>
                    <div className="text-xl">{p.emoji}</div>
                    <div className="text-[9px] font-extrabold mt-0.5">{p.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <textarea rows={3} value={form.problemDescription} onChange={(e) => setForm({ ...form, problemDescription: e.target.value })} placeholder="Problem description * (what's the issue?)" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-cyan-500 resize-none" />

            {['URGENT', 'EMERGENCY'].includes(form.priority) && (
              <input value={form.urgencyReason} onChange={(e) => setForm({ ...form, urgencyReason: e.target.value })} placeholder="Why is this urgent?" className="h-11 w-full rounded-xl border-2 border-red-300 bg-red-50 dark:bg-red-950/30 px-3 text-sm font-bold focus:outline-none focus:border-red-500" />
            )}

            <div className="grid sm:grid-cols-4 gap-2">
              <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Brand" className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
              <input value={form.modelNumber} onChange={(e) => setForm({ ...form, modelNumber: e.target.value })} placeholder="Model" className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-cyan-500" />
              <input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="Serial #" className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-cyan-500" />
              <input type="number" value={form.yearPurchased} onChange={(e) => setForm({ ...form, yearPurchased: e.target.value })} placeholder="Year" className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-cyan-500" />
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 cursor-pointer">
              <input type="checkbox" checked={form.underWarranty} onChange={(e) => setForm({ ...form, underWarranty: e.target.checked })} className="h-5 w-5 rounded" />
              <div className="flex-1">
                <div className="text-sm font-extrabold text-emerald-900">🛡️ Item under warranty?</div>
                <div className="text-xs text-emerald-700 font-semibold">Manufacturer/dealer warranty active</div>
              </div>
            </label>
            {form.underWarranty && (
              <input type="date" value={form.warrantyExpiryDate} onChange={(e) => setForm({ ...form, warrantyExpiryDate: e.target.value })} placeholder="Warranty expires" className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            )}
          </section>

          {/* Location */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="h-4 w-4 text-rose-600" />
              Service Location
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {LOCATIONS.map((l) => (
                <button key={l.value} onClick={() => setForm({ ...form, locationType: l.value })} className={
                  'p-3 rounded-xl border-2 text-center transition ' +
                  (form.locationType === l.value ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-rose-300')
                }>
                  <div className="text-2xl mb-1">{l.emoji}</div>
                  <div className="text-[10px] font-extrabold">{l.label.replace(/^[\S]+ /, '')}</div>
                </button>
              ))}
            </div>

            <textarea rows={2} value={form.serviceAddress} onChange={(e) => setForm({ ...form, serviceAddress: e.target.value })} placeholder="Service address..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500 resize-none" />

            <div className="grid sm:grid-cols-3 gap-3">
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
              <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Area / Sector" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
              <input value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} placeholder="Landmark" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
            </div>

            <textarea rows={2} value={form.entryInstructions} onChange={(e) => setForm({ ...form, entryInstructions: e.target.value })} placeholder="Entry instructions (gate code, floor, security, pets...)" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500 resize-none" />
          </section>

          {/* Schedule + Technician */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-violet-600" />
              Schedule & Assignment
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-extrabold text-violet-700 mb-1 block">Scheduled Start</label>
                <input type="datetime-local" value={form.scheduledStart} onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })} className="h-11 w-full rounded-xl border-2 border-violet-300 bg-violet-50 dark:bg-violet-950/30 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-violet-700 mb-1 block">Scheduled End</label>
                <input type="datetime-local" value={form.scheduledEnd} onChange={(e) => setForm({ ...form, scheduledEnd: e.target.value })} className="h-11 w-full rounded-xl border-2 border-violet-300 bg-violet-50 dark:bg-violet-950/30 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Preferred Time Slot</label>
                <input value={form.preferredTimeSlot} onChange={(e) => setForm({ ...form, preferredTimeSlot: e.target.value })} placeholder="e.g. Morning 9-12" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Assign Technician</label>
                <select value={form.primaryTechnicianId} onChange={(e) => setForm({ ...form, primaryTechnicianId: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
                  <option value="">-- Assign later --</option>
                  {technicians.map((t) => {
                    const nm = t.staff ? ((t.staff.firstName || '') + ' ' + (t.staff.lastName || '')).trim() : '';
                    return <option key={t.id} value={t.staffId}>{nm} ({t.level}) - {t.status}</option>;
                  })}
                </select>
              </div>
            </div>
          </section>

          {/* Parts */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-600" />
                Parts / Materials ({parts.length})
              </h3>
              <Button size="sm" onClick={addPart} className="bg-gradient-to-r from-orange-500 to-red-600">
                <Plus className="h-3.5 w-3.5" />
                Add Part
              </Button>
            </div>
            {parts.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
                <Package className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-extrabold text-slate-700">No parts added</p>
              </div>
            ) : (
              <div className="space-y-2">
                {parts.map((p, i) => (
                  <div key={i} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-extrabold text-slate-600">Part #{i + 1}</span>
                      <button onClick={() => removePart(i)} className="h-6 w-6 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-2">
                      <input value={p.partName} onChange={(e) => updatePart(i, { partName: e.target.value })} placeholder="Part name *" className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold focus:outline-none focus:border-orange-500" />
                      <input value={p.partNumber || ''} onChange={(e) => updatePart(i, { partNumber: e.target.value })} placeholder="Part number" className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-mono font-bold focus:outline-none focus:border-orange-500" />
                      <input value={p.brand || ''} onChange={(e) => updatePart(i, { brand: e.target.value })} placeholder="Brand" className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold focus:outline-none focus:border-orange-500" />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[9px] uppercase font-extrabold text-blue-700 mb-0.5 block">Qty</label>
                        <input type="number" min="1" step="0.1" value={p.quantity} onChange={(e) => updatePart(i, { quantity: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-extrabold text-emerald-700 mb-0.5 block">Unit Price</label>
                        <input type="number" step="0.01" value={p.unitPrice} onChange={(e) => updatePart(i, { unitPrice: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-extrabold text-slate-600 mb-0.5 block">Total</label>
                        <div className="h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-sm font-extrabold text-emerald-800 tabular-nums">
                          {formatPKR(p.quantity * p.unitPrice)}
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-extrabold text-slate-600 mb-0.5 block">Warranty (d)</label>
                        <input type="number" value={p.warrantyDays} onChange={(e) => updatePart(i, { warrantyDays: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold tabular-nums text-center focus:outline-none focus:border-orange-500" />
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <label className="inline-flex items-center gap-1 font-bold cursor-pointer">
                        <input type="checkbox" checked={p.isCustomerSupplied ?? false} onChange={(e) => updatePart(i, { isCustomerSupplied: e.target.checked })} className="h-3 w-3 rounded" />
                        Customer supplied
                      </label>
                      <label className="inline-flex items-center gap-1 font-bold cursor-pointer">
                        <input type="checkbox" checked={p.isUnderWarranty ?? false} onChange={(e) => updatePart(i, { isUnderWarranty: e.target.checked })} className="h-3 w-3 rounded" />
                        Under warranty (free)
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Notes */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Technician Notes</label>
                <textarea rows={2} value={form.technicianNotes} onChange={(e) => setForm({ ...form, technicianNotes: e.target.value })} placeholder="Notes for technician..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Internal Notes</label>
                <textarea rows={2} value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} placeholder="Internal only..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Job Warranty Days</label>
                <input type="number" value={form.jobWarrantyDays} onChange={(e) => setForm({ ...form, jobWarrantyDays: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Warranty Terms</label>
                <input value={form.jobWarrantyTerms} onChange={(e) => setForm({ ...form, jobWarrantyTerms: e.target.value })} placeholder="e.g. Parts + Labour" className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          </section>
        </div>

        {/* Sticky sidebar */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-blue-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">💰 Charges</div>

              <div className="space-y-2">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Visit Charge</label>
                  <input type="number" value={form.visitCharge} onChange={(e) => setForm({ ...form, visitCharge: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Labour Charge</label>
                  <input type="number" value={form.labourCharge} onChange={(e) => setForm({ ...form, labourCharge: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Transport</label>
                  <input type="number" value={form.transportCharge} onChange={(e) => setForm({ ...form, transportCharge: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                {['URGENT', 'EMERGENCY'].includes(form.priority) && (
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-red-300 mb-0.5 block">Emergency Charge</label>
                    <input type="number" value={form.emergencyCharge} onChange={(e) => setForm({ ...form, emergencyCharge: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-red-500/20 border border-red-400/40 px-2 text-sm font-extrabold tabular-nums text-white focus:outline-none focus:border-red-300" />
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-white/20 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Parts</span><span className="font-bold tabular-nums">{formatPKR(partsCharge)}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
              </div>

              <div className="mt-3 space-y-2">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Tax</label>
                  <input type="number" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Discount</label>
                  <input type="number" value={form.discountAmount} onChange={(e) => setForm({ ...form, discountAmount: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
              </div>

              {/* Advance */}
              <label className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-white/10 cursor-pointer">
                <input type="checkbox" checked={form.advanceRequired} onChange={(e) => setForm({ ...form, advanceRequired: e.target.checked })} className="h-4 w-4 rounded" />
                <span className="text-xs font-extrabold">Advance required</span>
              </label>
              {form.advanceRequired && (
                <div className="mt-1">
                  <input type="number" value={form.advancePct} onChange={(e) => setForm({ ...form, advancePct: e.target.value })} placeholder="Advance %" className="h-9 w-full rounded-lg bg-amber-500/20 border border-amber-400/40 px-2 text-sm font-extrabold tabular-nums text-white focus:outline-none focus:border-amber-300" />
                  <div className="text-[10px] text-amber-300 font-extrabold mt-1 text-center">
                    Advance: {formatPKR((total * Number(form.advancePct)) / 100)}
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!canSubmit}
              size="lg"
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-700"
            >
              <Save className="h-5 w-5" />
              Create Job
            </Button>
          </div>
        </aside>
      </div>

      {/* Service picker modal */}
      {showServicePicker && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-3 border-b bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-between">
              <h3 className="font-extrabold">Pick a Service</h3>
              <button onClick={() => setShowServicePicker(false)} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid sm:grid-cols-2 gap-2">
              {services.map((svc) => (
                <button key={svc.id} onClick={() => selectService(svc)} className="p-3 rounded-xl border-2 border-slate-200 dark:border-neutral-700 hover:border-cyan-500 hover:shadow-lg text-left">
                  <div className="font-extrabold text-sm truncate">{svc.name}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">{svc.category.replace('_', ' ')}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(svc.baseCharge)}</div>
                    <div className="text-[10px] font-bold text-slate-500">{svc.estimatedDurationMin}min</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
