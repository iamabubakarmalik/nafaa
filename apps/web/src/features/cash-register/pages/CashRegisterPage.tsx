import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, PlayCircle, StopCircle, ArrowDownToLine, ArrowUpFromLine,
  Banknote, CalendarClock, TrendingUp, AlertCircle, History,
  CheckCircle2, AlertTriangle, Calculator, Sparkles, Receipt,
  Activity, Clock, User as UserIcon, Download,
} from 'lucide-react';
import { cashRegisterApi } from '@/api/cash-register.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const formatRelative = (value: string) => {
  const d = new Date(value);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const txTypeConfig: Record<string, { label: string; tone: string; icon: any; isIncome: boolean }> = {
  OPENING: { label: 'Opening Balance', tone: 'bg-blue-100 text-blue-700', icon: PlayCircle, isIncome: true },
  SALE: { label: 'Sale Received', tone: 'bg-emerald-100 text-emerald-700', icon: Receipt, isIncome: true },
  CASH_IN: { label: 'Cash In', tone: 'bg-emerald-100 text-emerald-700', icon: ArrowDownToLine, isIncome: true },
  CASH_OUT: { label: 'Cash Out', tone: 'bg-rose-100 text-rose-700', icon: ArrowUpFromLine, isIncome: false },
  EXPENSE: { label: 'Expense', tone: 'bg-amber-100 text-amber-700', icon: ArrowUpFromLine, isIncome: false },
  CLOSING: { label: 'Closing', tone: 'bg-slate-100 text-slate-700', icon: StopCircle, isIncome: false },
};

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
      toast.success('Register open ho gaya', { description: 'Aap ka din shuru ho chuka hai' });
      setOpeningBalance('');
      setOpeningNotes('');
      queryClient.invalidateQueries({ queryKey: ['cash-register-current'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register-history'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Open fail ho gaya'),
  });

  const txMutation = useMutation({
    mutationFn: cashRegisterApi.transaction,
    onSuccess: (_, vars: any) => {
      toast.success(`${vars.type === 'CASH_IN' ? 'Cash added' : 'Cash withdrawn'}`, {
        description: `${formatPKR(vars.amount)} • ${vars.reason}`,
      });
      setTxAmount('');
      setTxReason('');
      queryClient.invalidateQueries({ queryKey: ['cash-register-current'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Transaction fail'),
  });

  const closeMutation = useMutation({
    mutationFn: cashRegisterApi.close,
    onSuccess: (data: any) => {
      const diff = data?.difference || 0;
      if (diff === 0) {
        toast.success('Register closed - All cash matched!', { description: 'Perfect day! No discrepancy' });
      } else if (diff > 0) {
        toast.success(`Register closed - +${formatPKR(diff)} surplus`, {
          description: 'Extra cash mila — kahin se aaya?',
        });
      } else {
        toast.error(`Register closed - ${formatPKR(Math.abs(diff))} short`, {
          description: 'Cash missing hai — check karein',
        });
      }
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
    openMutation.mutate({ openingBalance: bal, notes: openingNotes.trim() || undefined });
  };

  const handleTx = (type: 'CASH_IN' | 'CASH_OUT') => {
    const amt = Number(txAmount);
    if (isNaN(amt) || amt <= 0) return toast.error('Valid amount likhein');
    if (!txReason.trim()) return toast.error('Reason likhein');
    txMutation.mutate({ type, amount: amt, reason: txReason.trim() });
  };

  const handleClose = () => {
    const bal = Number(closingBalance);
    if (isNaN(bal) || bal < 0) return toast.error('Valid closing balance likhein');
    closeMutation.mutate({ closingBalance: bal, notes: closingNotes.trim() || undefined });
  };

  // Calculate difference preview
  const closingDiff = useMemo(() => {
    if (!current || !closingBalance) return null;
    const actual = Number(closingBalance);
    if (isNaN(actual)) return null;
    return actual - current.expectedBalance;
  }, [closingBalance, current]);

  // Stats
  const sessionDuration = current ? Math.floor((Date.now() - new Date(current.openedAt).getTime()) / 60000) : 0;
  const hoursOpen = Math.floor(sessionDuration / 60);
  const minutesOpen = sessionDuration % 60;

  // Export history CSV
  const exportHistoryCSV = () => {
    if (history.length === 0) return toast.error('No history');
    const headers = ['Register #', 'Opened By', 'Opened At', 'Closed At', 'Opening', 'Sales', 'Closing', 'Difference', 'Status'];
    const rows = history.map((r) => [
      r.registerNumber,
      r.openedBy?.fullName || '—',
      new Date(r.openedAt).toLocaleString('en-PK'),
      r.closedAt ? new Date(r.closedAt).toLocaleString('en-PK') : '—',
      r.openingBalance.toFixed(2),
      r.totalSales.toFixed(2),
      r.closingBalance.toFixed(2),
      r.difference.toFixed(2),
      r.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-register-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('History exported');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Wallet className="h-3.5 w-3.5 text-amber-300" />
              Daily Cash Management
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Cash Register</h2>
            <p className="mt-2 text-sm text-white/80">
              Din ke shuru aur akhir me cash count karein — automatic reconciliation aur tracking.
            </p>
          </div>
          {current && (
            <div className="rounded-2xl bg-white/10 backdrop-blur px-5 py-4 min-w-[200px]">
              <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Active Session</div>
              <div className="mt-1 text-xl font-extrabold flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse"></span>
                OPEN
              </div>
              <div className="text-xs text-white/75 mt-1 font-mono">{current.registerNumber}</div>
              <div className="text-[10px] text-white/60 mt-1 flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {hoursOpen}h {minutesOpen}m active
              </div>
            </div>
          )}
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-12 text-center">
          <div className="inline-block h-10 w-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
        </div>
      ) : !current ? (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8">
          <div className="max-w-md mx-auto text-center">
            <div className="mx-auto h-24 w-24 rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center shadow-inner">
              <PlayCircle className="h-12 w-12 text-emerald-700" />
            </div>
            <h3 className="mt-6 text-2xl font-extrabold text-slate-900">Register Open Karein</h3>
            <p className="mt-2 text-sm text-slate-500">
              Din shuru karne se pehle apna opening cash count enter karein.
            </p>

            <div className="mt-8 space-y-4 text-left">
              <Input
                label="Opening Cash Balance *"
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="5000"
                hint="Drawer me jitna cash hai woh count karke likhein"
              />
              <Input
                label="Notes (optional)"
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                placeholder="Morning shift opened by..."
              />

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                size="lg"
                loading={openMutation.isPending}
                onClick={handleOpen}
                disabled={!openingBalance}
              >
                <PlayCircle className="h-5 w-5" />
                Open Register
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Stats Grid */}
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Opening</div>
                  <div className="mt-2 text-2xl font-extrabold text-slate-900">{formatPKR(current.openingBalance)}</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    {formatRelative(current.openedAt)}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center shadow-lg">
                  <PlayCircle className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-emerald-700 font-bold">Cash In</div>
                  <div className="mt-2 text-2xl font-extrabold text-emerald-900">{formatPKR(current.totalCashIn)}</div>
                  <div className="text-xs text-emerald-700 font-semibold mt-1">Manual additions</div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <ArrowDownToLine className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-rose-700 font-bold">Cash Out</div>
                  <div className="mt-2 text-2xl font-extrabold text-rose-900">{formatPKR(current.totalCashOut)}</div>
                  <div className="text-xs text-rose-700 font-semibold mt-1">Withdrawals</div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                  <ArrowUpFromLine className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-5 shadow-lg shadow-emerald-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/80 font-bold">Expected</div>
                  <div className="mt-2 text-2xl font-extrabold">{formatPKR(current.expectedBalance)}</div>
                  <div className="text-xs text-white/80 font-semibold mt-1">Drawer me hona chahiye</div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Calculator className="h-6 w-6" />
                </div>
              </div>
            </div>
          </section>

          {/* Sales summary */}
          <section className="rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 border border-blue-200 p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">Today's Sales</div>
                <div className="text-2xl font-extrabold text-blue-700">{formatPKR(current.totalSales)}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-right">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Started</div>
                <div className="font-bold text-slate-900">{formatDate(current.openedAt)}</div>
              </div>
              {current.openedBy && (
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">By</div>
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    {current.openedBy.fullName}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            {/* Transaction panel */}
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Cash Transaction</h3>
                  <p className="text-sm text-slate-500">Cash add/remove karein (vendor payments, owner withdrawal)</p>
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
                  placeholder="e.g., Owner withdrawal, vendor payment, change purchase"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => handleTx('CASH_IN')} loading={txMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700" disabled={!txAmount || !txReason.trim()}>
                    <ArrowDownToLine className="h-4 w-4" />
                    Cash In
                  </Button>
                  <Button onClick={() => handleTx('CASH_OUT')} loading={txMutation.isPending} className="bg-rose-600 hover:bg-rose-700" disabled={!txAmount || !txReason.trim()}>
                    <ArrowUpFromLine className="h-4 w-4" />
                    Cash Out
                  </Button>
                </div>
              </div>

              {/* Recent transactions */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <Activity className="h-4 w-4" />
                    Session Activity
                  </h4>
                  {current.transactions && current.transactions.length > 0 && (
                    <span className="text-xs text-slate-500 font-bold">{current.transactions.length}</span>
                  )}
                </div>
                {!current.transactions?.length ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
                    <Activity className="h-8 w-8 text-slate-300 mx-auto mb-1" />
                    <p className="text-sm font-bold text-slate-700">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {current.transactions.slice(0, 15).map((tx: any) => {
                      const cfg = txTypeConfig[tx.type] || txTypeConfig.CASH_IN;
                      const Icon = cfg.icon;
                      return (
                        <div key={tx.id} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.tone}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 text-sm">{cfg.label}</div>
                            {tx.reason && <div className="text-xs text-slate-600 truncate">{tx.reason}</div>}
                            <div className="text-[10px] text-slate-400">{formatRelative(tx.createdAt)}</div>
                          </div>
                          <div className={`font-extrabold text-sm shrink-0 ${cfg.isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {cfg.isIncome ? '+' : '-'}{formatPKR(Math.abs(tx.amount))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Close panel */}
            <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-white border-2 border-rose-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow">
                  <StopCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Close Register</h3>
                  <p className="text-sm text-slate-500">Din ke akhir me cash count karein</p>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 mb-4 flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <strong>Step 1:</strong> Drawer me actual cash physically gin lein.<br/>
                  <strong>Step 2:</strong> Neeche woh exact amount likhein.<br/>
                  <strong>Step 3:</strong> System batayega kitna match hua ya difference hai.
                </div>
              </div>

              <div className="space-y-4">
                <Input label="Closing Cash Count (actual drawer me) *" type="number" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} placeholder="25000" />
                <Input label="Closing Notes" value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} placeholder="End of day shift, all reconciled" />

                {closingDiff !== null && (
                  <div className={`rounded-2xl p-4 border-2 ${
                    closingDiff === 0 ? 'bg-emerald-50 border-emerald-300' :
                    closingDiff > 0 ? 'bg-blue-50 border-blue-300' : 'bg-rose-50 border-rose-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {closingDiff === 0 ? (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            <span className="font-bold text-emerald-900 text-sm">Perfect Match!</span>
                          </>
                        ) : closingDiff > 0 ? (
                          <>
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            <span className="font-bold text-blue-900 text-sm">Surplus (Extra)</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-5 w-5 text-rose-600" />
                            <span className="font-bold text-rose-900 text-sm">Short (Missing)</span>
                          </>
                        )}
                      </div>
                      <div className={`text-xl font-extrabold ${
                        closingDiff === 0 ? 'text-emerald-700' :
                        closingDiff > 0 ? 'text-blue-700' : 'text-rose-700'
                      }`}>
                        {closingDiff > 0 ? '+' : ''}{formatPKR(closingDiff)}
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-600">
                      Expected: <strong>{formatPKR(current.expectedBalance)}</strong> • Actual: <strong>{formatPKR(Number(closingBalance) || 0)}</strong>
                    </div>
                  </div>
                )}

                <Button className="w-full bg-rose-600 hover:bg-rose-700" size="lg" loading={closeMutation.isPending} onClick={handleClose} disabled={!closingBalance}>
                  <StopCircle className="h-5 w-5" />
                  Close Register
                </Button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* History */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-slate-700" />
            <div>
              <h3 className="text-xl font-bold text-slate-900">Register History</h3>
              <p className="text-sm text-slate-500">{history.length} sessions</p>
            </div>
          </div>
          {history.length > 0 && (
            <button onClick={exportHistoryCSV} className="h-10 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center">
            <History className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No history yet</p>
            <p className="text-xs text-slate-500 mt-1">Close pehla register session to start history</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Register #</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Opened By</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Date</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider">Opening</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider">Sales</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider">Closing</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider">Diff</th>
                  <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-xs font-bold">{r.registerNumber}</td>
                    <td className="px-6 py-3 text-slate-700">{r.openedBy?.fullName || '—'}</td>
                    <td className="px-6 py-3 text-slate-600 text-xs">{formatDate(r.openedAt)}</td>
                    <td className="px-6 py-3 text-right font-bold text-slate-900">{formatPKR(r.openingBalance)}</td>
                    <td className="px-6 py-3 text-right font-bold text-emerald-700">{formatPKR(r.totalSales)}</td>
                    <td className="px-6 py-3 text-right font-bold text-slate-900">{formatPKR(r.closingBalance)}</td>
                    <td className="px-6 py-3 text-right">
                      <span className={`font-extrabold ${
                        r.difference === 0 ? 'text-emerald-700' :
                        r.difference > 0 ? 'text-blue-700' : 'text-rose-700'
                      }`}>
                        {r.difference > 0 ? '+' : ''}{formatPKR(r.difference)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
