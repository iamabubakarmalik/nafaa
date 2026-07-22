import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Zap, X, Save, RefreshCw, Sparkles, DollarSign, CheckCircle2,
  Send, Printer,
} from 'lucide-react';
import { monthlyBillsApi } from '../api/monthly-bills.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function MonthlyBillsPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [paidFilter, setPaidFilter] = useState<string>('all');
  const [showBulk, setShowBulk] = useState(false);
  const [showPayment, setShowPayment] = useState<any>(null);

  const { data: bills = [], isLoading, refetch } = useQuery({
    queryKey: ['monthly-bills', month, year, paidFilter],
    queryFn: () => monthlyBillsApi.list({
      month, year,
      isPaid: paidFilter === 'paid' ? true : paidFilter === 'unpaid' ? false : undefined,
    }),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Monthly Khata
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📄 Monthly Bills</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Auto-generated monthly khata bills</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className="h-4 w-4" />Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowBulk(true)}>
              <Zap className="h-4 w-4" />Generate All Bills
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 flex gap-3 flex-wrap items-end">
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-pink-500">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Year</label>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-10 w-24 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-pink-500" />
        </div>
        <div className="flex gap-1.5">
          {[
            { v: 'all', label: 'All' },
            { v: 'unpaid', label: 'Unpaid' },
            { v: 'paid', label: 'Paid' },
          ].map((f) => (
            <button key={f.v} onClick={() => setPaidFilter(f.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (paidFilter === f.v ? 'bg-pink-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{f.label}</button>
          ))}
        </div>
      </section>

      {showBulk && (
        <BulkGenModal
          month={month} year={year}
          onClose={() => setShowBulk(false)}
          onDone={() => { setShowBulk(false); queryClient.invalidateQueries({ queryKey: ['monthly-bills'] }); }}
        />
      )}

      {showPayment && (
        <PayBillModal
          bill={showPayment}
          onClose={() => setShowPayment(null)}
          onDone={() => { setShowPayment(null); queryClient.invalidateQueries({ queryKey: ['monthly-bills'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : bills.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <FileText className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No bills generated for {MONTHS[month - 1]} {year}</p>
          <Button className="mt-4 bg-gradient-to-r from-pink-600 to-rose-700" onClick={() => setShowBulk(true)}>
            <Zap className="h-4 w-4" />Generate Bills
          </Button>
        </div>
      ) : (
        <section className="grid gap-2">
          {bills.map((b) => (
            <div key={b.id} className={
              'rounded-xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-3 ' +
              (b.isPaid ? 'border-emerald-300' : b.remainingAmount > 0 ? 'border-amber-300' : 'border-slate-200')
            }>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={
                    'h-10 w-10 rounded-xl text-white flex items-center justify-center shrink-0 ' +
                    (b.isPaid ? 'bg-emerald-500' : 'bg-pink-500')
                  }>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold">{b.billNumber}</span>
                      <span className={
                        'px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ' +
                        (b.isPaid ? 'bg-emerald-600' : 'bg-amber-500')
                      }>{b.isPaid ? 'PAID' : 'PENDING'}</span>
                      {b.sentToCustomer && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase">SENT</span>}
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">{MONTHS[b.month - 1]} {b.year} • {b.totalDeliveries} deliveries • {b.totalLiters.toFixed(1)}L</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center">
                    <div className="text-[9px] uppercase font-extrabold text-slate-500">Total</div>
                    <div className="text-lg font-extrabold tabular-nums">{formatPKR(b.totalAmount)}</div>
                  </div>
                  {b.paidAmount > 0 && (
                    <div className="text-center">
                      <div className="text-[9px] uppercase font-extrabold text-emerald-700">Paid</div>
                      <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(b.paidAmount)}</div>
                    </div>
                  )}
                  {b.remainingAmount > 0 && (
                    <div className="text-center">
                      <div className="text-[9px] uppercase font-extrabold text-rose-700">Due</div>
                      <div className="text-sm font-extrabold text-rose-700 tabular-nums">{formatPKR(b.remainingAmount)}</div>
                    </div>
                  )}
                  {!b.isPaid && (
                    <button onClick={() => setShowPayment(b)} className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />Pay
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function BulkGenModal({ month, year, onClose, onDone }: any) {
  const genMutation = useMutation({
    mutationFn: () => monthlyBillsApi.bulkGenerate({ month, year }),
    onSuccess: (r) => { toast.success('Generated ' + r.generated + ' bills of ' + r.total + ' customers'); onDone(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-pink-50 flex items-center justify-between">
          <h3 className="font-extrabold">Bulk Generate Monthly Bills</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-xl bg-pink-50 border-2 border-pink-200 p-4 text-center">
            <div className="text-xs uppercase font-extrabold text-pink-700">Generating for</div>
            <div className="text-2xl font-extrabold text-pink-900 mt-1">{MONTHS[month - 1]} {year}</div>
          </div>
          <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 text-xs text-slate-700 font-bold">
            ℹ️ Auto-generates bills for all active customers based on their delivered milk for this month.
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-pink-600 to-rose-700" onClick={() => genMutation.mutate()} loading={genMutation.isPending}>
              <Zap className="h-4 w-4" />Generate All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PayBillModal({ bill, onClose, onDone }: any) {
  const [amount, setAmount] = useState(bill.remainingAmount);
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');

  const payMutation = useMutation({
    mutationFn: () => monthlyBillsApi.payment(bill.id, { amount, paymentMethod: method, reference }),
    onSuccess: () => { toast.success('Payment recorded'); onDone(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-emerald-50 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold">Pay Bill</h3>
            <p className="text-xs text-slate-500 font-semibold">{bill.billNumber} • Due: {formatPKR(bill.remainingAmount)}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <input type="number" step="0.01" autoFocus value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          <div className="grid grid-cols-3 gap-2">
            {['CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK', 'OTHER'].map((m) => (
              <button key={m} onClick={() => setMethod(m)} className={
                'p-2 rounded-lg border-2 text-xs font-extrabold ' +
                (method === m ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white')
              }>{m}</button>
            ))}
          </div>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference (optional)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => payMutation.mutate()} loading={payMutation.isPending}>
              <CheckCircle2 className="h-4 w-4" />Pay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
