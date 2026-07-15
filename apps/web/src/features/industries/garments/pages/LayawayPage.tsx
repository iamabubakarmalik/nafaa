import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Plus, X, Save, RefreshCw, Sparkles, DollarSign,
  Calendar, User, Phone, CheckCircle2, AlertCircle, Ban, Clock,
} from 'lucide-react';
import { layawayApi, type LayawayPlan } from '../api/layaway.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-blue-500',
  COMPLETED: 'bg-emerald-600',
  CANCELLED: 'bg-rose-500',
  DEFAULTED: 'bg-orange-600',
  REFUNDED: 'bg-slate-500',
};

const INSTALLMENT_COLORS: Record<string, string> = {
  UNPAID: 'bg-slate-500',
  PARTIALLY_PAID: 'bg-amber-500',
  PAID: 'bg-emerald-600',
  REFUNDED: 'bg-rose-500',
};

export default function LayawayPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [showForm, setShowForm] = useState(false);
  const [payingPlan, setPayingPlan] = useState<LayawayPlan | null>(null);

  const { data: plans = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['layaway', statusFilter],
    queryFn: () => layawayApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-green-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Installment Plans
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💳 Layaway Plans</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Kist / installment — expensive garments</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Plan
            </Button>
          </div>
        </div>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['ACTIVE', 'all', 'COMPLETED', 'CANCELLED', 'DEFAULTED'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (statusFilter === s ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {showForm && (
        <LayawayForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['layaway'] }); }}
        />
      )}

      {payingPlan && (
        <PayInstallmentModal
          plan={payingPlan}
          onClose={() => setPayingPlan(null)}
          onDone={() => { setPayingPlan(null); queryClient.invalidateQueries({ queryKey: ['layaway'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <CreditCard className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No layaway plans</p>
        </div>
      ) : (
        <section className="grid gap-4">
          {plans.map((plan) => {
            const daysToNext = plan.nextDueDate ? differenceInDays(new Date(plan.nextDueDate), new Date()) : null;
            const progressPct = (plan.paidAmount / plan.totalAmount) * 100;
            return (
              <div key={plan.id} className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white">{plan.planNumber}</span>
                        <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + STATUS_COLORS[plan.status]}>
                          {plan.status}
                        </span>
                      </div>
                      {plan.customerName && (
                        <div className="mt-1 flex items-center gap-2 text-sm text-slate-600 font-bold">
                          <User className="h-3 w-3" /> {plan.customerName}
                          {plan.customerPhone && <><Phone className="h-3 w-3 ml-2" /> {plan.customerPhone}</>}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-slate-500 font-semibold">
                        {plan.installmentCount} × {formatPKR(plan.installmentAmount)} • {plan.frequency}
                        {plan.nextDueDate && plan.status === 'ACTIVE' && (
                          <span className={
                            'ml-2 font-extrabold ' +
                            (daysToNext !== null && daysToNext < 0 ? 'text-rose-700' : daysToNext !== null && daysToNext <= 3 ? 'text-amber-700' : 'text-slate-600')
                          }>
                            Next: {format(new Date(plan.nextDueDate), 'dd MMM')}
                            {daysToNext !== null && daysToNext < 0 && ' (OVERDUE)'}
                          </span>
                        )}
                      </div>
                    </div>
                    {plan.status === 'ACTIVE' && (
                      <Button size="sm" onClick={() => setPayingPlan(plan)} className="bg-gradient-to-r from-emerald-600 to-green-700">
                        <DollarSign className="h-3.5 w-3.5" />
                        Pay Installment
                      </Button>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-2">
                      <div className="text-[9px] uppercase font-extrabold text-slate-500">Total</div>
                      <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(plan.totalAmount)}</div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2">
                      <div className="text-[9px] uppercase font-extrabold text-emerald-700">Paid</div>
                      <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(plan.paidAmount)}</div>
                    </div>
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2">
                      <div className="text-[9px] uppercase font-extrabold text-amber-700">Remaining</div>
                      <div className="text-lg font-extrabold text-amber-700 tabular-nums">{formatPKR(plan.remainingAmount)}</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 mb-1">
                      <span>Payment Progress</span>
                      <span>{progressPct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-green-600" style={{ width: progressPct + '%' }} />
                    </div>
                  </div>
                </div>

                {plan.installments.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-800/20 p-3">
                    <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-2">Installments</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
                      {plan.installments.map((inst) => (
                        <div key={inst.id} className={
                          'rounded-lg p-2 border-2 ' +
                          (inst.status === 'PAID' ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30' :
                           inst.status === 'PARTIALLY_PAID' ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30' :
                           'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900')
                        }>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-extrabold text-slate-500">#{inst.installmentNo}</span>
                            <span className={'px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase text-white ' + INSTALLMENT_COLORS[inst.status]}>
                              {inst.status === 'PARTIALLY_PAID' ? 'PART' : inst.status}
                            </span>
                          </div>
                          <div className="mt-1 text-xs font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(inst.amount)}</div>
                          <div className="text-[9px] font-bold text-slate-500">{format(new Date(inst.dueDate), 'dd MMM')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function LayawayForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    customerName: '', customerPhone: '',
    totalAmount: 0, depositAmount: 0, installmentCount: 3,
    frequency: 'MONTHLY', startDate: new Date().toISOString().split('T')[0], notes: '',
  });

  const saveMutation = useMutation({
    mutationFn: () => layawayApi.create({
      ...form,
      totalAmount: Number(form.totalAmount),
      depositAmount: Number(form.depositAmount) || 0,
      installmentCount: Number(form.installmentCount),
    }),
    onSuccess: () => { toast.success('Layaway plan created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const remaining = Number(form.totalAmount || 0) - Number(form.depositAmount || 0);
  const perInstallment = form.installmentCount > 0 ? remaining / Number(form.installmentCount) : 0;

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-300 dark:border-emerald-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">New Layaway Plan</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-3 max-h-[80vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Total Amount *</label>
            <input type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} placeholder="0" className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-4 text-xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Deposit (Down Payment)</label>
            <input type="number" value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })} placeholder="0" className="h-14 w-full rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 text-xl font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block"># Installments *</label>
            <input type="number" min="1" value={form.installmentCount} onChange={(e) => setForm({ ...form, installmentCount: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Frequency</label>
            <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
              <option>WEEKLY</option>
              <option>BIWEEKLY</option>
              <option>MONTHLY</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Start Date</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        {form.totalAmount > 0 && form.installmentCount > 0 && (
          <div className="rounded-xl bg-gradient-to-br from-slate-950 to-emerald-900 text-white p-4">
            <div className="text-[10px] uppercase font-extrabold text-white/70 mb-2">Plan Preview</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-white/70">Remaining:</span> <span className="font-extrabold text-cyan-300">{formatPKR(remaining)}</span></div>
              <div><span className="text-white/70">Per installment:</span> <span className="font-extrabold text-emerald-300">{formatPKR(perInstallment)}</span></div>
            </div>
          </div>
        )}

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.totalAmount || !form.installmentCount}>
            <Save className="h-4 w-4" />
            Create Plan
          </Button>
        </div>
      </div>
    </section>
  );
}

function PayInstallmentModal({ plan, onClose, onDone }: { plan: LayawayPlan; onClose: () => void; onDone: () => void }) {
  const nextUnpaid = plan.installments.find((i) => i.status !== 'PAID');
  const [installmentId, setInstallmentId] = useState(nextUnpaid?.id ?? '');
  const [amount, setAmount] = useState(nextUnpaid ? nextUnpaid.amount - nextUnpaid.paidAmount : 0);
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');

  const payMutation = useMutation({
    mutationFn: () => layawayApi.pay(plan.id, installmentId, { amount, paymentMethod: method, reference }),
    onSuccess: () => { toast.success('Payment recorded'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">Pay Installment</h3>
            <p className="text-xs text-slate-500 font-semibold">{plan.planNumber} • {plan.customerName}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Installment</label>
            <select value={installmentId} onChange={(e) => {
              setInstallmentId(e.target.value);
              const inst = plan.installments.find((i) => i.id === e.target.value);
              if (inst) setAmount(inst.amount - inst.paidAmount);
            }} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
              {plan.installments.filter((i) => i.status !== 'PAID').map((i) => (
                <option key={i.id} value={i.id}>
                  #{i.installmentNo} • {formatPKR(i.amount - i.paidAmount)} • Due {format(new Date(i.dueDate), 'dd MMM')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Amount *</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Method</label>
            <div className="grid grid-cols-3 gap-2">
              {['CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK', 'OTHER'].map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={
                  'p-2 rounded-lg border-2 text-xs font-extrabold ' +
                  (method === m ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800')
                }>{m}</button>
              ))}
            </div>
          </div>

          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference (optional)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => payMutation.mutate()} loading={payMutation.isPending} disabled={amount <= 0 || !installmentId}>
              <CheckCircle2 className="h-4 w-4" />
              Confirm Payment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
