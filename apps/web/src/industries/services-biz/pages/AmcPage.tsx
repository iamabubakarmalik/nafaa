import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Plus, X, Save, RefreshCw, Sparkles, Calendar, User, Phone,
  CheckCircle2, DollarSign, Award, AlertCircle,
} from 'lucide-react';
import { amcApi, type AmcContract } from '../api/amc.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

const TIERS = [
  { value: 'BASIC', label: 'Basic', color: 'from-slate-500 to-slate-600', emoji: '🥉' },
  { value: 'STANDARD', label: 'Standard', color: 'from-blue-500 to-cyan-600', emoji: '🥈' },
  { value: 'PREMIUM', label: 'Premium', color: 'from-amber-500 to-orange-600', emoji: '🥇' },
  { value: 'COMPREHENSIVE', label: 'Comprehensive', color: 'from-fuchsia-500 to-purple-600', emoji: '💎' },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-600',
  EXPIRED: 'bg-slate-500',
  CANCELLED: 'bg-rose-500',
  SUSPENDED: 'bg-amber-500',
  RENEWAL_DUE: 'bg-orange-500',
};

export default function AmcPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [showForm, setShowForm] = useState(false);

  const { data: contracts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['services-amc', statusFilter],
    queryFn: () => amcApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  const expireMutation = useMutation({
    mutationFn: () => amcApi.expireOld(),
    onSuccess: () => { toast.success('Expired old AMCs'); queryClient.invalidateQueries({ queryKey: ['services-amc'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Shield className="h-3.5 w-3.5" />
              Annual Contracts
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🛡️ AMC Contracts</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Recurring maintenance contracts with scheduled visits</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => expireMutation.mutate()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <Calendar className="h-4 w-4" />
              Expire Old
            </button>
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Contract
            </Button>
          </div>
        </div>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['ACTIVE', 'all', 'RENEWAL_DUE', 'EXPIRED', 'CANCELLED', 'SUSPENDED'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (statusFilter === s ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>{s === 'all' ? 'All' : s.replace('_', ' ')}</button>
        ))}
      </div>

      {showForm && (
        <AmcForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['services-amc'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">{[1, 2].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : contracts.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Shield className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No AMC contracts</p>
        </div>
      ) : (
        <section className="grid gap-4">
          {contracts.map((c) => <ContractCard key={c.id} contract={c} />)}
        </section>
      )}
    </div>
  );
}

function ContractCard({ contract }: { contract: AmcContract }) {
  const tier = TIERS.find((t) => t.value === contract.type);
  const daysLeft = differenceInDays(new Date(contract.endDate), new Date());
  const isExpiring = daysLeft <= 30 && daysLeft > 0 && contract.status === 'ACTIVE';
  const visitsPct = contract.numberOfVisits > 0 ? (contract.visitsUsed / contract.numberOfVisits) * 100 : 0;

  return (
    <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
      <div className={'p-5 text-white bg-gradient-to-br ' + (tier?.color ?? 'from-slate-500 to-slate-700')}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl">{tier?.emoji}</span>
              <span className="font-extrabold">{contract.amcNumber}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + STATUS_COLORS[contract.status]}>
                {contract.status.replace('_', ' ')}
              </span>
              {isExpiring && (
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-pulse">
                  Expires in {daysLeft}d
                </span>
              )}
            </div>
            <div className="mt-2 text-sm font-bold">{contract.customerName}</div>
            <div className="text-xs font-bold text-white/80 inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {contract.customerPhone}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-extrabold tabular-nums">{formatPKR(contract.contractValue)}</div>
            <div className="text-[10px] font-extrabold text-white/70">{tier?.label} • {contract.numberOfVisits} visits/yr</div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <div>
          <div className="flex items-center justify-between text-[10px] font-extrabold mb-1">
            <span className="text-slate-600">Visit Progress</span>
            <span>{contract.visitsUsed} / {contract.numberOfVisits} used</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-green-600" style={{ width: visitsPct + '%' }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-2 text-center">
            <div className="text-[9px] uppercase font-extrabold text-slate-500">Start</div>
            <div className="text-xs font-extrabold">{format(new Date(contract.startDate), 'dd MMM yyyy')}</div>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-2 text-center">
            <div className="text-[9px] uppercase font-extrabold text-slate-500">End</div>
            <div className="text-xs font-extrabold">{format(new Date(contract.endDate), 'dd MMM yyyy')}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
            <div className="text-[9px] uppercase font-extrabold text-emerald-700">Paid</div>
            <div className="text-xs font-extrabold text-emerald-800">{formatPKR(contract.amountPaid)}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 text-[10px]">
          {contract.includesLabour && <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-extrabold">✅ Labour</span>}
          {contract.includesParts && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-extrabold">✅ Parts</span>}
          {contract.emergencyIncluded && <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-extrabold">🚨 Emergency</span>}
          {contract.autoRenew && <span className="px-2 py-0.5 rounded bg-fuchsia-100 text-fuchsia-700 font-extrabold">🔄 Auto-renew</span>}
        </div>

        {contract.visits && contract.visits.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-2">Scheduled Visits</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {contract.visits.map((v: any) => (
                <div key={v.id} className={
                  'rounded-lg p-2 border-2 text-xs ' +
                  (v.status === 'COMPLETED' ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30' :
                   'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900')
                }>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-slate-500">Visit #{v.visitNumber}</span>
                    {v.status === 'COMPLETED' && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">{format(new Date(v.scheduledDate), 'dd MMM')}</div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase">{v.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AmcForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    customerName: '', customerPhone: '', customerEmail: '',
    type: 'STANDARD',
    numberOfVisits: 4,
    includesParts: false, includesLabour: true,
    emergencyIncluded: false, emergencyDiscountPct: 0,
    contractValue: 0, amountPaid: 0,
    paymentInstallments: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '', // will auto-calc
    autoRenew: false,
    reminderDaysBefore: 30,
    serviceAddress: '',
    city: '',
    autoScheduleVisits: true,
    numberOfSites: 1,
    notes: '',
  });

  // Auto-calc end date = start + 365 days
  const computedEndDate = form.endDate || (() => {
    const d = new Date(form.startDate);
    d.setDate(d.getDate() + 365);
    return d.toISOString().split('T')[0];
  })();

  const saveMutation = useMutation({
    mutationFn: () => amcApi.create({
      ...form,
      endDate: form.endDate || computedEndDate,
      numberOfVisits: Number(form.numberOfVisits),
      contractValue: Number(form.contractValue) || 0,
      amountPaid: Number(form.amountPaid) || 0,
      emergencyDiscountPct: Number(form.emergencyDiscountPct) || 0,
      paymentInstallments: Number(form.paymentInstallments) || 1,
      reminderDaysBefore: Number(form.reminderDaysBefore) || 30,
      numberOfSites: Number(form.numberOfSites) || 1,
    }),
    onSuccess: () => { toast.success('AMC created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-300 dark:border-emerald-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">🛡️ New AMC Contract</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-3 gap-3">
          <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} placeholder="Email" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Contract Type *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TIERS.map((t) => (
              <button key={t.value} onClick={() => setForm({ ...form, type: t.value })} className={
                'p-4 rounded-xl border-2 text-center transition ' +
                (form.type === t.value ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-emerald-300')
              }>
                <div className="text-3xl mb-1">{t.emoji}</div>
                <div className="text-sm font-extrabold">{t.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Visits per year *</label>
            <input type="number" min="1" value={form.numberOfVisits} onChange={(e) => setForm({ ...form, numberOfVisits: e.target.value })} className="h-11 w-full rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Start Date</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">End Date</label>
            <input type="date" value={form.endDate || computedEndDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Contract Value *</label>
            <input type="number" value={form.contractValue} onChange={(e) => setForm({ ...form, contractValue: e.target.value })} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Amount Paid</label>
            <input type="number" value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-2">
          <div className="text-sm font-extrabold text-blue-900">Coverage</div>
          <div className="grid grid-cols-2 gap-2">
            <label className={'flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer ' + (form.includesLabour ? 'border-blue-500 bg-white' : 'border-slate-200 bg-white')}>
              <input type="checkbox" checked={form.includesLabour} onChange={(e) => setForm({ ...form, includesLabour: e.target.checked })} className="h-4 w-4 rounded" />
              <span className="text-xs font-extrabold">✅ Labour Included</span>
            </label>
            <label className={'flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer ' + (form.includesParts ? 'border-emerald-500 bg-white' : 'border-slate-200 bg-white')}>
              <input type="checkbox" checked={form.includesParts} onChange={(e) => setForm({ ...form, includesParts: e.target.checked })} className="h-4 w-4 rounded" />
              <span className="text-xs font-extrabold">✅ Parts Included</span>
            </label>
            <label className={'flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer ' + (form.emergencyIncluded ? 'border-red-500 bg-white' : 'border-slate-200 bg-white')}>
              <input type="checkbox" checked={form.emergencyIncluded} onChange={(e) => setForm({ ...form, emergencyIncluded: e.target.checked })} className="h-4 w-4 rounded" />
              <span className="text-xs font-extrabold">🚨 Emergency Included</span>
            </label>
            <label className={'flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer ' + (form.autoRenew ? 'border-fuchsia-500 bg-white' : 'border-slate-200 bg-white')}>
              <input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })} className="h-4 w-4 rounded" />
              <span className="text-xs font-extrabold">🔄 Auto-renew</span>
            </label>
          </div>
        </div>

        <textarea rows={2} value={form.serviceAddress} onChange={(e) => setForm({ ...form, serviceAddress: e.target.value })} placeholder="Service address *" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />

        <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-violet-200 bg-violet-50 cursor-pointer">
          <input type="checkbox" checked={form.autoScheduleVisits} onChange={(e) => setForm({ ...form, autoScheduleVisits: e.target.checked })} className="h-5 w-5 rounded" />
          <div className="flex-1">
            <div className="text-sm font-extrabold text-violet-900">📅 Auto-schedule {form.numberOfVisits} quarterly visits</div>
            <div className="text-xs text-violet-700 font-semibold">System will create visit slots automatically</div>
          </div>
        </label>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.customerName || !form.contractValue || !form.serviceAddress}>
            <Shield className="h-4 w-4" />
            Create Contract
          </Button>
        </div>
      </div>
    </section>
  );
}
