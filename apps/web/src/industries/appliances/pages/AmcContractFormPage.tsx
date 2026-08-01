import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, FileSignature, User, Phone, MapPin,
  Package, Calendar, DollarSign, CheckCircle2, Wrench, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { amcContractsApi } from '../api/amc-contracts.api';
import { Button } from '@core/ui/Button';
import { formatPKRFull } from '@core/lib/format';

const AMC_TYPES = [
  { v: 'BASIC', l: 'Basic', desc: '2 visits/year, labor only', color: 'slate' },
  { v: 'STANDARD', l: 'Standard', desc: '4 visits/year, labor + parts discount', color: 'blue' },
  { v: 'PREMIUM', l: 'Premium', desc: '6 visits/year, full labor + parts', color: 'violet' },
  { v: 'COMPREHENSIVE', l: 'Comprehensive', desc: '12 visits/year, everything covered', color: 'amber' },
];

const DURATION_PRESETS = [
  { l: '6 Months', m: 6 },
  { l: '1 Year', m: 12 },
  { l: '2 Years', m: 24 },
  { l: '3 Years', m: 36 },
];

const COMMON_SERVICES = [
  'General Cleaning', 'Deep Cleaning', 'Filter Replacement',
  'Gas Refill', 'Compressor Service', 'Motor Service',
  'Electrical Check', 'Preventive Maintenance', 'Emergency Repairs',
];

export default function AmcContractFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    amcType: 'STANDARD' as any,
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    productName: '',
    serialNumber: '',
    startDate: new Date().toISOString().split('T')[0],
    durationMonths: 12,
    contractValue: 15000,
    paidAmount: 0,
    freeVisitsAllowed: 4,
    freePartsAllowed: false,
    laborCovered: true,
    gasRefillCovered: false,
    emergencyCallsAllowed: 2,
    servicesIncluded: [] as string[],
    servicesExcluded: [] as string[],
    exclusions: '',
    autoRenew: false,
    notes: '',
  });

  const { data: existing, isLoading } = useQuery({
    queryKey: ['amc-contract', id],
    queryFn: () => amcContractsApi.getOne(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        amcType: existing.amcType,
        customerName: existing.customerName,
        customerPhone: existing.customerPhone,
        customerAddress: existing.customerAddress || '',
        productName: existing.productName || '',
        serialNumber: existing.serialNumber || '',
        startDate: existing.startDate.slice(0, 10),
        durationMonths: existing.durationMonths,
        contractValue: existing.contractValue,
        paidAmount: existing.paidAmount,
        freeVisitsAllowed: existing.freeVisitsAllowed,
        freePartsAllowed: existing.freePartsAllowed,
        laborCovered: existing.laborCovered,
        gasRefillCovered: existing.gasRefillCovered,
        emergencyCallsAllowed: existing.emergencyCallsAllowed || 2,
        servicesIncluded: existing.servicesIncluded || [],
        servicesExcluded: existing.servicesExcluded || [],
        exclusions: existing.exclusions || '',
        autoRenew: existing.autoRenew,
        notes: existing.notes || '',
      });
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: () => isEdit ? amcContractsApi.update(id!, form as any) : amcContractsApi.create(form as any),
    onSuccess: () => {
      toast.success(isEdit ? 'Contract updated' : 'Contract created');
      qc.invalidateQueries({ queryKey: ['amc-contracts-list'] });
      navigate('/appliances/amc-contracts');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const toggleService = (list: string[], key: 'servicesIncluded' | 'servicesExcluded', item: string) => {
    const cur = list ?? [];
    const next = cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item];
    setForm({ ...form, [key]: next });
  };

  const expiryDate = new Date(form.startDate);
  expiryDate.setMonth(expiryDate.getMonth() + form.durationMonths);
  const remaining = Math.max(form.contractValue - form.paidAmount, 0);

  const canSave = form.customerName.trim() && form.customerPhone.trim() && form.contractValue > 0;

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex items-start gap-4 flex-wrap">
          <button onClick={() => navigate('/appliances/amc-contracts')}
            className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center border border-white/20">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <FileSignature className="h-3.5 w-3.5 text-amber-300" />
              {isEdit ? 'Edit Contract' : 'New AMC Contract'}
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight">
              📄 {isEdit ? 'Edit AMC Contract' : 'Create AMC Contract'}
            </h1>
            <p className="mt-1 text-sm text-white/80 font-semibold">
              Annual Maintenance Contract for regular service coverage
            </p>
          </div>
        </div>
      </section>

      <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {/* AMC TYPE */}
          <section className="rounded-3xl bg-white border-2 border-pink-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-pink-700" />
              <h3 className="font-extrabold text-slate-900">AMC Plan Type</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {AMC_TYPES.map((t) => {
                const a = form.amcType === t.v;
                return (
                  <button key={t.v} onClick={() => setForm({ ...form, amcType: t.v as any })}
                    className={['p-3 rounded-xl border-2 text-left transition',
                      a ? 'border-pink-600 bg-pink-50 shadow-md' : 'border-slate-200 hover:border-pink-300'].join(' ')}>
                    <div className={['font-extrabold text-sm', a ? 'text-pink-900' : 'text-slate-900'].join(' ')}>{t.l}</div>
                    <div className="text-[10px] font-bold text-slate-600 mt-0.5">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* CUSTOMER */}
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-violet-700" />
              <h3 className="font-extrabold text-slate-900">Customer Info</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Name *</label>
                <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="Customer full name"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Phone *</label>
                <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  placeholder="03XX XXXXXXX"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-pink-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Address</label>
              <textarea rows={2} value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
                placeholder="Complete service address..."
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-pink-500" />
            </div>
          </section>

          {/* PRODUCT */}
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-700" />
              <h3 className="font-extrabold text-slate-900">Product Coverage</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Product Name</label>
                <input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })}
                  placeholder="e.g. Haier 1.5 Ton Inverter AC"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Serial Number</label>
                <input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                  placeholder="Optional"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-pink-500" />
              </div>
            </div>
          </section>

          {/* DURATION */}
          <section className="rounded-3xl bg-white border-2 border-amber-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-700" />
              <h3 className="font-extrabold text-slate-900">Duration & Dates</h3>
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Duration</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {DURATION_PRESETS.map((p) => (
                  <button key={p.m} onClick={() => setForm({ ...form, durationMonths: p.m })}
                    className={['px-3 py-2 rounded-xl border-2 text-xs font-extrabold transition',
                      form.durationMonths === p.m ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300'].join(' ')}>
                    {p.l}
                  </button>
                ))}
              </div>
              <input type="number" min="1" value={form.durationMonths}
                onChange={(e) => setForm({ ...form, durationMonths: Number(e.target.value) })}
                placeholder="Custom months"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-amber-700">Expires On</div>
              <div className="text-lg font-extrabold text-amber-900">
                {expiryDate.toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </section>

          {/* PRICING */}
          <section className="rounded-3xl bg-white border-2 border-emerald-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-700" />
              <h3 className="font-extrabold text-slate-900">Pricing</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold uppercase text-emerald-700 mb-1.5">Contract Value *</label>
                <input type="number" value={form.contractValue}
                  onChange={(e) => setForm({ ...form, contractValue: Number(e.target.value) })}
                  className="h-14 w-full rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-4 text-2xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600" />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Paid Amount</label>
                <input type="number" value={form.paidAmount}
                  onChange={(e) => setForm({ ...form, paidAmount: Number(e.target.value) })}
                  className="h-14 w-full rounded-2xl border-2 border-slate-200 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
            {remaining > 0 && (
              <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-3">
                <div className="text-xs font-extrabold text-rose-700 uppercase">Balance Due</div>
                <div className="text-xl font-extrabold text-rose-900 tabular-nums">{formatPKRFull(remaining)}</div>
              </div>
            )}
          </section>

          {/* COVERAGE */}
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-700" />
              <h3 className="font-extrabold text-slate-900">Coverage Details</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Free Visits Allowed</label>
                <input type="number" value={form.freeVisitsAllowed}
                  onChange={(e) => setForm({ ...form, freeVisitsAllowed: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Emergency Calls</label>
                <input type="number" value={form.emergencyCallsAllowed}
                  onChange={(e) => setForm({ ...form, emergencyCallsAllowed: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 cursor-pointer">
                <input type="checkbox" checked={form.laborCovered}
                  onChange={(e) => setForm({ ...form, laborCovered: e.target.checked })}
                  className="h-4 w-4 rounded" />
                <span className="text-xs font-extrabold text-emerald-900">🔧 Labor Covered</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-blue-200 bg-blue-50 cursor-pointer">
                <input type="checkbox" checked={form.freePartsAllowed}
                  onChange={(e) => setForm({ ...form, freePartsAllowed: e.target.checked })}
                  className="h-4 w-4 rounded" />
                <span className="text-xs font-extrabold text-blue-900">🎁 Free Parts</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-amber-200 bg-amber-50 cursor-pointer">
                <input type="checkbox" checked={form.gasRefillCovered}
                  onChange={(e) => setForm({ ...form, gasRefillCovered: e.target.checked })}
                  className="h-4 w-4 rounded" />
                <span className="text-xs font-extrabold text-amber-900">🌬️ Gas Refill</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-violet-200 bg-violet-50 cursor-pointer">
                <input type="checkbox" checked={form.autoRenew}
                  onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })}
                  className="h-4 w-4 rounded" />
                <span className="text-xs font-extrabold text-violet-900">🔄 Auto Renew</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-emerald-700 mb-2">Services Included</label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SERVICES.map((s) => {
                  const a = form.servicesIncluded?.includes(s);
                  return (
                    <button key={s} onClick={() => toggleService(form.servicesIncluded, 'servicesIncluded', s)}
                      className={['px-2.5 py-1 rounded-lg border-2 text-[11px] font-extrabold transition',
                        a ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'].join(' ')}>
                      {a ? '✓ ' : '+ '}{s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Exclusions</label>
              <textarea rows={2} value={form.exclusions}
                onChange={(e) => setForm({ ...form, exclusions: e.target.value })}
                placeholder="What's NOT covered..."
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-pink-500" />
            </div>
          </section>

          {/* NOTES */}
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Internal Notes</label>
            <textarea rows={3} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional notes..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-pink-500" />
          </section>
        </div>

        {/* SIDEBAR */}
        <aside className="xl:sticky xl:top-4 xl:self-start space-y-3">
          <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-5 shadow-xl">
            <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Summary</div>
            <div className="mt-2 text-2xl font-extrabold">
              {form.amcType} PLAN
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <SumRow label="Customer" value={form.customerName || '—'} />
              <SumRow label="Duration" value={`${form.durationMonths} months`} />
              <SumRow label="Free Visits" value={String(form.freeVisitsAllowed)} />
              <SumRow label="Value" value={formatPKRFull(form.contractValue)} tone="emerald" />
              <SumRow label="Paid" value={formatPKRFull(form.paidAmount)} />
              {remaining > 0 && <SumRow label="Balance" value={formatPKRFull(remaining)} tone="rose" />}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600">Checklist</div>
            <Chk done={!!form.customerName.trim()} label="Customer name" />
            <Chk done={!!form.customerPhone.trim()} label="Phone" />
            <Chk done={form.contractValue > 0} label="Contract value" />
            <Chk done={form.durationMonths > 0} label="Duration" />
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-200 bg-white/95 backdrop-blur px-4 py-3 lg:pl-[300px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => navigate('/appliances/amc-contracts')}>Cancel</Button>
          <Button className="bg-gradient-to-r from-pink-600 to-rose-700"
            onClick={() => save.mutate()} loading={save.isPending} disabled={!canSave}>
            <Save className="h-4 w-4" />
            {isEdit ? 'Update Contract' : 'Create Contract'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SumRow({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-300',
    rose: 'text-rose-300',
  };
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/70 font-bold">{label}</span>
      <span className={['font-extrabold', tone ? tones[tone] : 'text-white'].join(' ')}>{value}</span>
    </div>
  );
}

function Chk({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={['h-4 w-4 rounded-md flex items-center justify-center shrink-0',
        done ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-300'].join(' ')}>
        {done && <CheckCircle2 className="h-3 w-3" />}
      </div>
      <span className={['font-bold', done ? 'text-emerald-800 line-through' : 'text-slate-600'].join(' ')}>{label}</span>
    </div>
  );
}
