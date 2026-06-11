import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, PlayCircle, StopCircle, ArrowDownToLine, ArrowUpFromLine,
  Banknote, CalendarClock, TrendingUp, AlertCircle, History,
} from 'lucide-react';
import { cashRegisterApi } from '@/api/cash-register.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export default function CashRegisterPage() {
  const queryClient = useQueryClient();
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txReason, setTxReason] = useState('');

  const { data: current, isLoading } = useQuery({
    queryKey: ['cash-register-current'],
    queryFn: cashRegisterApi.current,
    refetchInterval: 30000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['cash-register-history'],
    queryFn: cashRegisterApi.history,
  });

  const openMutation = useMutation({
    mutationFn: cashRegisterApi.open,
    onSuccess: () => {
      toast.success('Register open ho gaya');
      setOpeningBalance('');
      setOpeningNotes('');
      queryClient.invalidateQueries({ queryKey: ['cash-register-current'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register-history'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Open fail ho gaya'),
  });

  const txMutation = useMutation({
    mutationFn: cashRegisterApi.transaction,
    onSuccess: () => {
      toast.success('Transaction record ho gayi');
      setTxAmount('');
      setTxReason('');
      queryClient.invalidateQueries({ queryKey: ['cash-register-current'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Transaction fail'),
  });

  const closeMutation = useMutation({
    mutationFn: cashRegisterApi.close,
    onSuccess: () => {
      toast.success('Register close ho gaya');
      setClosingBalance('');
      setClosingNotes('');
      queryClient.invalidateQueries({ queryKey: ['cash-register-current'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register-history'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Close fail ho gaya'),
  });

  const handleOpen = () => {
    const bal = Number(openingBalance);
    if (isNaN(bal) || bal < 0) return toast.error('Valid opening balance likhein');
    openMutation.mutate({
      openingBalance: bal,
      notes: openingNotes.trim() || undefined,
    });
  };

  const handleTx = (type: 'CASH_IN' | 'CASH_OUT') => {
    const amt = Number(txAmount);
    if (isNaN(amt) || amt <= 0) return toast.error('Valid amount likhein');
    if (!txReason.trim()) return toast.error('Reason likhein');
    txMutation.mutate({
      type,
      amount: amt,
      reason: txReason.trim(),
    });
  };

  const handleClose = () => {
    const bal = Number(closingBalance);
    if (isNaN(bal) || bal < 0) return toast.error('Valid closing balance likhein');
    closeMutation.mutate({
      closingBalance: bal,
      notes: closingNotes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Wallet className="h-3.5 w-3.5" />
              Daily Cash Management
            </div>
            <h2 className="mt-3 text-3xl font-bold">Cash Register</h2>
            <p className="mt-2 text-sm text-white/80">
              Din ke shuru aur akhir mein cash count, asaan tareeqe se.
            </p>
          </div>
          {current && (
            <div className="rounded-2xl bg-white/10 px-5 py-4">
              <div className="text-xs text-white/70">Status</div>
              <div className="mt-1 text-xl font-bold flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse"></span>
                OPEN
              </div>
              <div className="text-xs text-white/70 mt-1">
                {current.registerNumber}
              </div>
            </div>
          )}
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center text-slate-500">
          Loading...
        </div>
      ) : !current ? (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8">
          <div className="max-w-md mx-auto text-center">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-emerald-100 flex items-center justify-center">
              <PlayCircle className="h-10 w-10 text-emerald-700" />
            </div>
            <h3 className="mt-6 text-2xl font-bold text-slate-900">Register Open Karein</h3>
            <p className="mt-2 text-sm text-slate-500">
              Din shuru karne se pehle apna opening cash count enter karein.
            </p>

            <div className="mt-6 space-y-4 text-left">
              <Input
                label="Opening Cash Balance"
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="5000"
              />
              <Input
                label="Notes (optional)"
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                placeholder="Morning shift opened by..."
              />

              <Button
                className="w-full"
                size="lg"
                loading={openMutation.isPending}
                onClick={handleOpen}
              >
                <PlayCircle className="h-5 w-5" />
                Open Register
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="text-sm text-slate-500">Opening Balance</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatPKR(current.openingBalance)}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                {formatDate(current.openedAt)}
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 shadow-sm">
              <div className="text-sm text-emerald-700">Cash In</div>
              <div className="mt-2 text-2xl font-bold text-emerald-900">
                {formatPKR(current.totalCashIn)}
              </div>
              <div className="text-xs text-emerald-700 mt-1">Manual additions</div>
            </div>

            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5 shadow-sm">
              <div className="text-sm text-rose-700">Cash Out</div>
              <div className="mt-2 text-2xl font-bold text-rose-900">
                {formatPKR(current.totalCashOut)}
              </div>
              <div className="text-xs text-rose-700 mt-1">Manual withdrawals</div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white p-5 shadow-sm">
              <div className="text-sm text-white/80">Expected in Drawer</div>
              <div className="mt-2 text-2xl font-bold">
                {formatPKR(current.expectedBalance)}
              </div>
              <div className="text-xs text-white/80 mt-1">Includes all sales</div>
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-11 w-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Cash Transaction</h3>
                  <p className="text-sm text-slate-500">Cash add/remove karein</p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Amount"
                  type="number"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="1000"
                />
                <Input
                  label="Reason"
                  value={txReason}
                  onChange={(e) => setTxReason(e.target.value)}
                  placeholder="e.g., Owner withdrawal, vendor payment"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleTx('CASH_IN')}
                    loading={txMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    Cash In
                  </Button>
                  <Button
                    onClick={() => handleTx('CASH_OUT')}
                    loading={txMutation.isPending}
                    className="bg-rose-600 hover:bg-rose-700"
                  >
                    <ArrowUpFromLine className="h-4 w-4" />
                    Cash Out
                  </Button>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Recent Transactions</h4>
                {!current.transactions?.length ? (
                  <div className="text-sm text-slate-500">No transactions yet</div>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto">
                    {current.transactions.slice(0, 10).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900">{tx.type}</div>
                          <div className="text-xs text-slate-500 truncate">{tx.reason || '—'}</div>
                        </div>
                        <div className={`font-semibold ${
                          ['CASH_IN', 'OPENING', 'SALE'].includes(tx.type) ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {formatPKR(tx.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-white border border-rose-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-11 w-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <StopCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Close Register</h3>
                  <p className="text-sm text-slate-500">Din ke akhir mein cash count karein</p>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 mb-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <strong>Tip:</strong> Drawer mein actual cash gin lo, phir niche enter karo.
                  System expected amount se difference batayega.
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Closing Cash Count (actual)"
                  type="number"
                  value={closingBalance}
                  onChange={(e) => setClosingBalance(e.target.value)}
                  placeholder="25000"
                />
                <Input
                  label="Closing Notes"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="End of day shift"
                />

                <Button
                  className="w-full bg-rose-600 hover:bg-rose-700"
                  size="lg"
                  loading={closeMutation.isPending}
                  onClick={handleClose}
                >
                  <StopCircle className="h-5 w-5" />
                  Close Register
                </Button>
              </div>
            </div>
          </section>
        </>
      )}

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <History className="h-5 w-5 text-slate-700" />
          <div>
            <h3 className="text-xl font-bold text-slate-900">Register History</h3>
            <p className="text-sm text-slate-500">Last 30 sessions</p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">No history yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-6 py-4 font-medium">Register #</th>
                  <th className="text-left px-6 py-4 font-medium">Opened By</th>
                  <th className="text-left px-6 py-4 font-medium">Opened At</th>
                  <th className="text-left px-6 py-4 font-medium">Opening</th>
                  <th className="text-left px-6 py-4 font-medium">Sales</th>
                  <th className="text-left px-6 py-4 font-medium">Closing</th>
                  <th className="text-left px-6 py-4 font-medium">Difference</th>
                  <th className="text-left px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-xs">{r.registerNumber}</td>
                    <td className="px-6 py-3">{r.openedBy?.fullName || '—'}</td>
                    <td className="px-6 py-3 text-slate-600">{formatDate(r.openedAt)}</td>
                    <td className="px-6 py-3 font-medium">{formatPKR(r.openingBalance)}</td>
                    <td className="px-6 py-3 text-emerald-700">{formatPKR(r.totalSales)}</td>
                    <td className="px-6 py-3 font-medium">{formatPKR(r.closingBalance)}</td>
                    <td className="px-6 py-3">
                      <span className={`font-semibold ${
                        r.difference === 0 ? 'text-slate-700' :
                        r.difference > 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {r.difference > 0 ? '+' : ''}{formatPKR(r.difference)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        r.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
