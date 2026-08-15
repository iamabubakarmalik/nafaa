import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, PlayCircle, StopCircle, ArrowDownToLine, ArrowUpFromLine,
  Banknote, CalendarClock, TrendingUp, AlertCircle, History,
  CheckCircle2, AlertTriangle, Calculator, Sparkles, Receipt,
  Activity, Clock, User as UserIcon, Download, GraduationCap,
  X, RefreshCw, Printer, Coins, HandCoins, Timer, Zap,
  ShieldCheck, Search,
} from 'lucide-react';
import { cashRegisterApi } from '@modules/finance/cash-register/api/cash-register.api';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA CASH REGISTER — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 GLOBAL — Retail/Restaurant/Pharmacy/Salon sab me
   🌙 Dark mode complete
   🎓 Teacher modal — Cash reconciliation, short/surplus fix
   ⌨️  O open • I in • U out • C close • T guide • Esc
   🧮 Denomination calculator (PKR notes)
   ⚠️ Smart close warning (>5% diff)
   ⏱️ Live session timer
   🖨️ Print + 📊 CSV
   ═════════════════════════════════════════════════════════════ */

const PKR_DENOMS = [
  { value: 5000, label: '5000' },
  { value: 1000, label: '1000' },
  { value: 500, label: '500' },
  { value: 100, label: '100' },
  { value: 50, label: '50' },
  { value: 20, label: '20' },
  { value: 10, label: '10' },
];

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const formatRelative = (v: string) => {
  const d = new Date(v);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const txTypeConfig: Record<string, { label: string; tone: string; darkTone: string; icon: any; isIncome: boolean }> = {
  OPENING:  { label: 'Opening Balance', tone: 'bg-blue-100 text-blue-700',       darkTone: 'dark:bg-blue-500/20 dark:text-blue-300',       icon: PlayCircle,       isIncome: true },
  SALE:     { label: 'Sale Received',   tone: 'bg-emerald-100 text-emerald-700', darkTone: 'dark:bg-emerald-500/20 dark:text-emerald-300', icon: Receipt,          isIncome: true },
  CASH_IN:  { label: 'Cash In',         tone: 'bg-emerald-100 text-emerald-700', darkTone: 'dark:bg-emerald-500/20 dark:text-emerald-300', icon: ArrowDownToLine,  isIncome: true },
  CASH_OUT: { label: 'Cash Out',        tone: 'bg-rose-100 text-rose-700',       darkTone: 'dark:bg-rose-500/20 dark:text-rose-300',       icon: ArrowUpFromLine,  isIncome: false },
  EXPENSE:  { label: 'Expense',         tone: 'bg-amber-100 text-amber-700',     darkTone: 'dark:bg-amber-500/20 dark:text-amber-300',     icon: ArrowUpFromLine,  isIncome: false },
  CLOSING:  { label: 'Closing',         tone: 'bg-slate-100 text-slate-700',     darkTone: 'dark:bg-slate-700 dark:text-slate-300',        icon: StopCircle,       isIncome: false },
};

export default function CashRegisterPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const openingRef = useRef<HTMLInputElement>(null);
  const txAmountRef = useRef<HTMLInputElement>(null);
  const closingRef = useRef<HTMLInputElement>(null);

  const [openingBalance, setOpeningBalance] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txReason, setTxReason] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);
  const [showDenomCalc, setShowDenomCalc] = useState<'opening' | 'closing' | null>(null);
  const [denomCounts, setDenomCounts] = useState<Record<number, string>>({});
  const [tick, setTick] = useState(0);

  const { data: current, isLoading } = useQuery({
    queryKey: ['cash-register-current', currentShopId],
    queryFn: () => cashRegisterApi.current(currentShopId || undefined),
    enabled: !!currentShopId,
    refetchInterval: 30000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['cash-register-history', currentShopId],
    queryFn: () => cashRegisterApi.history(currentShopId || undefined),
    enabled: !!currentShopId,
  });

  const openMutation = useMutation({
    mutationFn: cashRegisterApi.open,
    onSuccess: () => {
      toast.success('Register open ho gaya', { description: 'Aap ka din shuru ho chuka hai' });
      setOpeningBalance(''); setOpeningNotes(''); setDenomCounts({});
      queryClient.invalidateQueries({ queryKey: ['cash-register-current'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register-history'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Open fail ho gaya'),
  });

  const txMutation = useMutation({
    mutationFn: (payload: any) => cashRegisterApi.transaction(payload, currentShopId || undefined),
    onSuccess: (_, vars: any) => {
      toast.success(`${vars.type === 'CASH_IN' ? 'Cash added' : 'Cash withdrawn'}`, {
        description: `${formatPKR(vars.amount)} • ${vars.reason}`,
      });
      setTxAmount(''); setTxReason('');
      queryClient.invalidateQueries({ queryKey: ['cash-register-current'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Transaction fail'),
  });

  const closeMutation = useMutation({
    mutationFn: (payload: any) => cashRegisterApi.close(payload, currentShopId || undefined),
    onSuccess: (data: any) => {
      const diff = data?.difference || 0;
      if (diff === 0) toast.success('Register closed — All cash matched!', { description: '🎯 Perfect day! No discrepancy' });
      else if (diff > 0) toast.success(`Register closed — +${formatPKR(diff)} surplus`, { description: 'Extra cash mila — kahin se aaya?' });
      else toast.error(`Register closed — ${formatPKR(Math.abs(diff))} short`, { description: '⚠️ Cash missing — check karein' });
      setClosingBalance(''); setClosingNotes(''); setDenomCounts({});
      queryClient.invalidateQueries({ queryKey: ['cash-register-current'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register-history'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Close fail ho gaya'),
  });

  const handleOpen = () => {
    if (!currentShopId) return toast.error('Top-bar se shop select karein');
    const bal = Number(openingBalance);
    if (isNaN(bal) || bal < 0) return toast.error('Valid opening balance likhein');
    openMutation.mutate({ shopId: currentShopId, openingBalance: bal, notes: openingNotes.trim() || undefined });
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
    // Smart warning for large discrepancy
    if (current) {
      const diff = Math.abs(bal - current.expectedBalance);
      const pct = current.expectedBalance > 0 ? (diff / current.expectedBalance) * 100 : 0;
      if (pct > 5 && diff > 500) {
        const proceed = confirm(
          `⚠️ Bara farak detect hua!\n\nExpected: ${formatPKR(current.expectedBalance)}\nActual: ${formatPKR(bal)}\nDifference: ${formatPKR(diff)} (${pct.toFixed(1)}%)\n\nKya aap sure hain? Cash dobara gino, warna audit issue ban sakta hai.`
        );
        if (!proceed) return;
      }
    }
    closeMutation.mutate({ closingBalance: bal, notes: closingNotes.trim() || undefined });
  };

  // Denomination calculator total
  const denomTotal = useMemo(() => {
    return PKR_DENOMS.reduce((sum, d) => sum + (Number(denomCounts[d.value]) || 0) * d.value, 0);
  }, [denomCounts]);

  const applyDenomTotal = () => {
    if (showDenomCalc === 'opening') setOpeningBalance(String(denomTotal));
    if (showDenomCalc === 'closing') setClosingBalance(String(denomTotal));
    setShowDenomCalc(null);
    toast.success(`${formatPKR(denomTotal)} apply ho gaya`);
  };

  const closingDiff = useMemo(() => {
    if (!current || !closingBalance) return null;
    const actual = Number(closingBalance);
    if (isNaN(actual)) return null;
    return actual - current.expectedBalance;
  }, [closingBalance, current]);

  // Live session timer
  useEffect(() => {
    if (!current) return;
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, [current]);

  const sessionDuration = current ? Math.floor((Date.now() - new Date(current.openedAt).getTime()) / 60000) : 0;
  const hoursOpen = Math.floor(sessionDuration / 60);
  const minutesOpen = sessionDuration % 60;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = tick; // force re-render

  const exportHistoryCSV = () => {
    if (history.length === 0) return toast.error('No history');
    const summary = [
      ['Cash Register History'],
      [`Generated: ${new Date().toLocaleString('en-PK')}  •  Sessions: ${history.length}`],
      [''],
    ];
    const headers = ['Register #', 'Opened By', 'Opened At', 'Closed At', 'Opening', 'Sales', 'Cash In', 'Cash Out', 'Closing', 'Difference', 'Status'];
    const rows = history.map((r) => [
      r.registerNumber, r.openedBy?.fullName || '—',
      new Date(r.openedAt).toLocaleString('en-PK'),
      r.closedAt ? new Date(r.closedAt).toLocaleString('en-PK') : '—',
      r.openingBalance.toFixed(2), r.totalSales.toFixed(2),
      (r.totalCashIn || 0).toFixed(2), (r.totalCashOut || 0).toFixed(2),
      r.closingBalance.toFixed(2), r.difference.toFixed(2), r.status,
    ]);
    const csv = [...summary, headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-register-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('History exported');
  };

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (showDenomCalc) return setShowDenomCalc(null);
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key.toLowerCase() === 't') { e.preventDefault(); setShowTeacher(true); }
      if (!current && e.key.toLowerCase() === 'o') { e.preventDefault(); openingRef.current?.focus(); }
      if (current && e.key.toLowerCase() === 'i') { e.preventDefault(); txAmountRef.current?.focus(); }
      if (current && e.key.toLowerCase() === 'u') { e.preventDefault(); txAmountRef.current?.focus(); }
      if (current && e.key.toLowerCase() === 'c') { e.preventDefault(); closingRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, showDenomCalc, current]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = (showTeacher || showDenomCalc) ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher, showDenomCalc]);

  const netCashFlow = current ? current.totalCashIn - current.totalCashOut : 0;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <CashRegisterTeacher onClose={() => setShowTeacher(false)} />}
      {showDenomCalc && (
        <DenominationCalculator
          mode={showDenomCalc}
          counts={denomCounts}
          setCounts={setDenomCounts}
          total={denomTotal}
          onApply={applyDenomTotal}
          onClose={() => setShowDenomCalc(null)}
        />
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 dark:from-slate-950 dark:via-emerald-950 dark:to-emerald-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Wallet className="h-3.5 w-3.5 text-amber-300" /> Daily Cash Management
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">💰 Cash Register</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold max-w-xl">
              Din ke shuru aur akhir me cash count karo — automatic reconciliation aur audit trail.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            {current && (
              <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 px-4 py-2.5 shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                  <span className="text-xs font-extrabold uppercase tracking-wider">OPEN</span>
                </div>
                <div className="text-[10px] text-white/70 mt-0.5 font-mono">{current.registerNumber}</div>
                <div className="text-[10px] text-amber-300 mt-0.5 flex items-center gap-1 font-extrabold">
                  <Timer className="h-2.5 w-2.5" />
                  {hoursOpen}h {minutesOpen}m
                </div>
              </div>
            )}
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
            >
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            {history.length > 0 && (
              <button
                onClick={exportHistoryCSV}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
              >
                <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          {!current && <><Kbd>O</Kbd><span className="text-white/60">Open</span><span className="text-white/30 mx-1">•</span></>}
          {current && <>
            <Kbd>I</Kbd><span className="text-white/60">Cash In</span>
            <span className="text-white/30 mx-1">•</span>
            <Kbd>U</Kbd><span className="text-white/60">Cash Out</span>
            <span className="text-white/30 mx-1">•</span>
            <Kbd>C</Kbd><span className="text-white/60">Close</span>
            <span className="text-white/30 mx-1">•</span>
          </>}
          <Kbd>T</Kbd><span className="text-white/60">Guide</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="inline-block h-10 w-10 rounded-full border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 dark:border-t-emerald-400 animate-spin" />
        </div>
      ) : !current ? (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8">
          <div className="max-w-md mx-auto text-center">
            <div className="mx-auto h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-500/20 dark:to-emerald-500/30 flex items-center justify-center shadow-inner">
              <PlayCircle className="h-10 w-10 sm:h-12 sm:w-12 text-emerald-700 dark:text-emerald-400" />
            </div>
            <h3 className="mt-5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">Register Open Karo</h3>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 font-semibold">
              Din shuru karne se pehle apna opening cash count enter karo.
            </p>

            <div className="mt-6 space-y-4 text-left">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Opening Cash Balance *</label>
                  <button
                    onClick={() => setShowDenomCalc('opening')}
                    className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    <Calculator className="h-3 w-3" /> Note-wise ginti
                  </button>
                </div>
                <input
                  ref={openingRef}
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="5000"
                  className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-lg font-extrabold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition tabular-nums"
                />
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                  Drawer me jitna cash hai woh count karke likho
                </div>
              </div>

              <Input
                label="Notes (optional)"
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                placeholder="Morning shift opened by..."
              />

              <Button
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 font-extrabold shadow-lg shadow-emerald-500/30"
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
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <StatCard
              label="Opening"
              value={formatPKR(current.openingBalance)}
              sub={formatRelative(current.openedAt)}
              subIcon={CalendarClock}
              icon={PlayCircle}
              tone="slate"
            />
            <StatCard
              label="Cash In"
              value={formatPKR(current.totalCashIn)}
              sub="Manual additions"
              icon={ArrowDownToLine}
              tone="emerald"
              tinted
            />
            <StatCard
              label="Cash Out"
              value={formatPKR(current.totalCashOut)}
              sub="Withdrawals"
              icon={ArrowUpFromLine}
              tone="rose"
              tinted
            />
            <StatCard
              label="Expected"
              value={formatPKR(current.expectedBalance)}
              sub="Drawer me hona chahiye"
              icon={Calculator}
              tone="emerald"
              highlight
            />
          </section>

          {/* Sales summary bar */}
          <section className="rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-500/10 dark:to-emerald-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Today's Sales</div>
                <div className="text-xl sm:text-2xl font-extrabold text-blue-700 dark:text-blue-400 tabular-nums">{formatPKR(current.totalSales)}</div>
              </div>
              <div className="h-8 w-px bg-blue-200 dark:bg-blue-500/30 hidden sm:block" />
              <div>
                <div className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Net Flow</div>
                <div className={`text-sm sm:text-base font-extrabold tabular-nums ${netCashFlow >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                  {netCashFlow >= 0 ? '+' : ''}{formatPKR(netCashFlow)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase">Started</div>
                <div className="font-extrabold text-slate-900 dark:text-white">{formatDate(current.openedAt)}</div>
              </div>
              {current.openedBy && (
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase">By</div>
                  <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    {current.openedBy.fullName}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-4 sm:gap-5">
            {/* Transaction panel */}
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                  <Banknote className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Cash Transaction</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Cash add/remove (vendor payment, owner withdrawal)</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Amount</label>
                  <input
                    ref={txAmountRef}
                    type="number"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="1000"
                    className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-extrabold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition tabular-nums"
                  />
                </div>
                <Input
                  label="Reason"
                  value={txReason}
                  onChange={(e) => setTxReason(e.target.value)}
                  placeholder="Owner withdrawal, vendor payment, change purchase"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleTx('CASH_IN')}
                    loading={txMutation.isPending}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 font-extrabold shadow-md shadow-emerald-500/30"
                    disabled={!txAmount || !txReason.trim()}
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    Cash In
                  </Button>
                  <Button
                    onClick={() => handleTx('CASH_OUT')}
                    loading={txMutation.isPending}
                    className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 font-extrabold shadow-md shadow-rose-500/30"
                    disabled={!txAmount || !txReason.trim()}
                  >
                    <ArrowUpFromLine className="h-4 w-4" />
                    Cash Out
                  </Button>
                </div>
              </div>

              {/* Session Activity */}
              <div className="mt-6 pt-6 border-t-2 border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Activity className="h-4 w-4" />
                    Session Activity
                  </h4>
                  {current.transactions && current.transactions.length > 0 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      {current.transactions.length}
                    </span>
                  )}
                </div>
                {!current.transactions?.length ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
                    <Activity className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                    <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Abhi koi transaction nahi</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {current.transactions.slice(0, 15).map((tx: any) => {
                      const cfg = txTypeConfig[tx.type] || txTypeConfig.CASH_IN;
                      const Icon = cfg.icon;
                      return (
                        <div key={tx.id} className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3 flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.tone} ${cfg.darkTone}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-extrabold text-slate-900 dark:text-white text-sm">{cfg.label}</div>
                            {tx.reason && <div className="text-xs text-slate-600 dark:text-slate-400 truncate font-semibold">{tx.reason}</div>}
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{formatRelative(tx.createdAt)}</div>
                          </div>
                          <div className={`font-extrabold text-sm shrink-0 tabular-nums ${cfg.isIncome ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
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
            <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-rose-50 to-white dark:from-rose-500/10 dark:to-slate-900/60 border-2 border-rose-200 dark:border-rose-500/40 shadow-sm p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0">
                  <StopCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Close Register</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Din ke akhir me cash count karo</p>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 mb-4 flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200 font-semibold leading-relaxed">
                  <strong>Step 1:</strong> Drawer me actual cash physically gin lo.<br/>
                  <strong>Step 2:</strong> Neeche woh exact amount likho.<br/>
                  <strong>Step 3:</strong> System batayega kitna match hua ya farak hai.
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Closing Cash Count (drawer me) *</label>
                    <button
                      onClick={() => setShowDenomCalc('closing')}
                      className="text-xs font-extrabold text-rose-700 dark:text-rose-400 hover:underline inline-flex items-center gap-1"
                    >
                      <Calculator className="h-3 w-3" /> Note-wise ginti
                    </button>
                  </div>
                  <input
                    ref={closingRef}
                    type="number"
                    value={closingBalance}
                    onChange={(e) => setClosingBalance(e.target.value)}
                    placeholder={String(current.expectedBalance)}
                    className="h-12 w-full rounded-xl border-2 border-rose-200 dark:border-rose-500/40 bg-white dark:bg-slate-800 px-4 text-lg font-extrabold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition tabular-nums"
                  />
                </div>
                <Input
                  label="Closing Notes"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="End of day shift, all reconciled"
                />

                {closingDiff !== null && (
                  <div className={`rounded-2xl p-4 border-2 ${
                    closingDiff === 0
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40'
                      : closingDiff > 0
                        ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40'
                        : 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {closingDiff === 0 ? (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-extrabold text-emerald-900 dark:text-emerald-200 text-sm">Perfect Match! 🎯</span>
                          </>
                        ) : closingDiff > 0 ? (
                          <>
                            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span className="font-extrabold text-blue-900 dark:text-blue-200 text-sm">Surplus (Extra)</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                            <span className="font-extrabold text-rose-900 dark:text-rose-200 text-sm">Short (Missing)</span>
                          </>
                        )}
                      </div>
                      <div className={`text-lg sm:text-xl font-extrabold tabular-nums ${
                        closingDiff === 0 ? 'text-emerald-700 dark:text-emerald-400' :
                        closingDiff > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {closingDiff > 0 ? '+' : ''}{formatPKR(closingDiff)}
                      </div>
                    </div>
                    <div className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                      Expected: <strong>{formatPKR(current.expectedBalance)}</strong> • Actual: <strong>{formatPKR(Number(closingBalance) || 0)}</strong>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 font-extrabold shadow-lg shadow-rose-500/30"
                  size="lg"
                  loading={closeMutation.isPending}
                  onClick={handleClose}
                  disabled={!closingBalance}
                >
                  <StopCircle className="h-5 w-5" />
                  Close Register
                </Button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* History */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Register History</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{history.length} sessions</p>
            </div>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center">
            <History className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="font-extrabold text-slate-700 dark:text-slate-200">Abhi koi history nahi</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">Pehla register session close karo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="text-left px-4 sm:px-6 py-3 font-extrabold text-[10px] uppercase tracking-widest">Register #</th>
                  <th className="text-left px-4 sm:px-6 py-3 font-extrabold text-[10px] uppercase tracking-widest">Opened By</th>
                  <th className="text-left px-4 sm:px-6 py-3 font-extrabold text-[10px] uppercase tracking-widest">Date</th>
                  <th className="text-right px-4 sm:px-6 py-3 font-extrabold text-[10px] uppercase tracking-widest">Opening</th>
                  <th className="text-right px-4 sm:px-6 py-3 font-extrabold text-[10px] uppercase tracking-widest">Sales</th>
                  <th className="text-right px-4 sm:px-6 py-3 font-extrabold text-[10px] uppercase tracking-widest">Closing</th>
                  <th className="text-right px-4 sm:px-6 py-3 font-extrabold text-[10px] uppercase tracking-widest">Diff</th>
                  <th className="text-center px-4 sm:px-6 py-3 font-extrabold text-[10px] uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 sm:px-6 py-3 font-mono text-xs font-extrabold text-slate-900 dark:text-white">{r.registerNumber}</td>
                    <td className="px-4 sm:px-6 py-3 text-slate-700 dark:text-slate-300 font-semibold">{r.openedBy?.fullName || '—'}</td>
                    <td className="px-4 sm:px-6 py-3 text-slate-600 dark:text-slate-400 text-xs font-semibold whitespace-nowrap">{formatDate(r.openedAt)}</td>
                    <td className="px-4 sm:px-6 py-3 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(r.openingBalance)}</td>
                    <td className="px-4 sm:px-6 py-3 text-right font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(r.totalSales)}</td>
                    <td className="px-4 sm:px-6 py-3 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(r.closingBalance)}</td>
                    <td className="px-4 sm:px-6 py-3 text-right">
                      <span className={`font-extrabold tabular-nums ${
                        r.difference === 0 ? 'text-emerald-700 dark:text-emerald-400' :
                        r.difference > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {r.difference > 0 ? '+' : ''}{formatPKR(r.difference)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        r.status === 'OPEN'
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
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

      {/* Print CSS */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm 10mm; }
          html, body { background: white !important; color: #0f172a !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   DENOMINATION CALCULATOR — Note-wise cash counter
   ═════════════════════════════════════════════════════════════ */
function DenominationCalculator({ mode, counts, setCounts, total, onApply, onClose }: any) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-5 py-3 border-b-2 sticky top-0 z-10 flex items-center justify-between ${
          mode === 'opening'
            ? 'border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/15'
            : 'border-rose-200 dark:border-rose-500/30 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-500/15 dark:to-pink-500/15'
        }`}>
          <h3 className={`font-extrabold flex items-center gap-2 ${
            mode === 'opening' ? 'text-emerald-900 dark:text-emerald-200' : 'text-rose-900 dark:text-rose-200'
          }`}>
            <Coins className="h-5 w-5" /> Note-wise Cash Ginti
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Har note kitne hain woh likho. Total auto calculate hoga.
          </p>

          <div className="space-y-2">
            {PKR_DENOMS.map((d) => {
              const count = Number(counts[d.value]) || 0;
              const subtotal = count * d.value;
              return (
                <div key={d.value} className="flex items-center gap-2 sm:gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-2.5">
                  <div className="w-16 sm:w-20 shrink-0">
                    <div className="rounded-lg bg-gradient-to-br from-amber-100 to-yellow-200 dark:from-amber-500/30 dark:to-yellow-500/30 border border-amber-300 dark:border-amber-500/40 py-1.5 text-center font-mono font-extrabold text-amber-900 dark:text-amber-200 text-sm">
                      Rs {d.label}
                    </div>
                  </div>
                  <span className="text-slate-400 dark:text-slate-500 font-bold">×</span>
                  <input
                    type="number"
                    min="0"
                    value={counts[d.value] || ''}
                    onChange={(e) => setCounts({ ...counts, [d.value]: e.target.value })}
                    placeholder="0"
                    className="h-10 w-16 sm:w-20 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-center font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition tabular-nums"
                  />
                  <span className="text-slate-400 dark:text-slate-500 font-bold">=</span>
                  <div className="flex-1 text-right font-extrabold text-slate-900 dark:text-white tabular-nums text-sm">
                    {formatPKR(subtotal)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`rounded-2xl p-4 border-2 ${
            mode === 'opening'
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40'
              : 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-extrabold uppercase tracking-wider ${
                mode === 'opening' ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'
              }`}>
                Total
              </span>
              <span className={`text-2xl font-extrabold tabular-nums ${
                mode === 'opening' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
              }`}>
                {formatPKR(total)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setCounts({})}>
              <RefreshCw className="h-4 w-4" /> Reset
            </Button>
            <Button
              className={`flex-1 font-extrabold ${
                mode === 'opening'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 shadow-lg shadow-rose-500/30'
              }`}
              onClick={onApply}
              disabled={total === 0}
            >
              <CheckCircle2 className="h-4 w-4" /> Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CASH REGISTER TEACHER — Universal reconciliation guide
   ═════════════════════════════════════════════════════════════ */
function CashRegisterTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Cash Register — Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Cash register = din ke cash ka accountability system.</strong> Subha kya tha, din bhar kya aya, kya gaya, aur shaam ko kya bacha —
            sab track. Chori/loss ka pata seedha lagta hai.
          </p>

          {/* Daily workflow */}
          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300">
              📅 Daily Workflow — 3 Steps
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 p-2">
                <strong>🌅 Subah — Open:</strong> Drawer ka cash gino, "Open Register" karo. Ye tumhara starting point hai.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 p-2">
                <strong>☀️ Din bhar — Track:</strong> POS sales auto-add hoti hain. Vendor payment/owner withdrawal = Cash Out. Extra cash aya = Cash In.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 p-2">
                <strong>🌙 Shaam — Close:</strong> Drawer ka actual cash gino, "Close Register" karo. Expected vs Actual = difference dikhta hai.
              </div>
            </div>
          </div>

          {/* Formula */}
          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1">
              <Calculator className="h-3 w-3" /> Expected Balance Formula
            </div>
            <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2.5 font-mono text-xs text-slate-800 dark:text-slate-200 space-y-0.5">
              <div>Expected = Opening</div>
              <div className="text-emerald-700 dark:text-emerald-400">+ Sales (cash)</div>
              <div className="text-emerald-700 dark:text-emerald-400">+ Cash In</div>
              <div className="text-rose-700 dark:text-rose-400">− Cash Out</div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-1 mt-1 font-extrabold">= Drawer me hona chahiye</div>
            </div>
          </div>

          {/* Short/Surplus troubleshooting */}
          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Short/Surplus — Kya Karein?
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/40 p-2">
                🔴 <strong>Short (missing):</strong> Cash kam nikla. Reasons: change ghalat diya, cash out record nahi hua, chori. Rs 50-100 chhota — normal. Rs 500+ = investigate.
              </div>
              <div className="rounded-lg bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/40 p-2">
                🔵 <strong>Surplus (extra):</strong> Cash zyada nikla. Reasons: customer se extra le liya, refund miss ho gaya. Log karo — kisi ka udhaar/refund pending ho sakta hai.
              </div>
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 p-2">
                🟢 <strong>Perfect match:</strong> Rare hai! Roz ho to system tight hai. Celebrate! 🎉
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>🧮 Note-wise ginti</strong> — Calculator button use karo, 5000/1000/500/100/50/20/10 alag alag count, mistake ka chance kam.</TipRow>
            <TipRow><strong>💵 Cash In examples</strong> — Owner ne extra paisa daala, refund reversal, previous shift bacha hua.</TipRow>
            <TipRow><strong>💸 Cash Out examples</strong> — Vendor payment, tea/chai kharcha, owner withdrawal, chotay expenses.</TipRow>
            <TipRow><strong>⚠️ {'>'}5% farak</strong> — System warning karega. Dobara gino, warna audit issue.</TipRow>
            <TipRow><strong>👥 Shift handover</strong> — Ek session close karo, doosri open. Har staff ka accountability alag.</TipRow>
            <TipRow><strong>🔒 Chori prevention</strong> — Roz close karo, difference track karo. 2-3 din continuous short = red flag.</TipRow>
            <TipRow><strong>📝 Notes zaroor</strong> — Har unusual transaction pe note likho. 1 mahine baad kaam ata hai.</TipRow>
          </div>

          <div className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 p-3 text-xs font-semibold text-violet-800 dark:text-violet-200">
            💡 <strong>Pro tip:</strong> Har hafte "Register History" CSV export karo — Excel me monthly trends dekho. Agar ek staff ka register hamesha short hota hai, red flag hai. Data se chori pakadti hai.
          </div>

          <Button
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 font-extrabold shadow-lg shadow-emerald-500/40 h-12"
            onClick={onClose}
          >
            <ShieldCheck className="h-4 w-4" /> Samajh Gaya — Cash Manage Karo!
          </Button>
        </div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm">
      {children}
    </kbd>
  );
}

function StatCard({ label, value, sub, subIcon: SubIcon, icon: Icon, tone, tinted, highlight }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-700 to-slate-900 shadow-slate-500/40',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/40',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
  };
  const tintBg: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30',
    slate: 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800',
  };
  const textAccent: Record<string, string> = {
    emerald: 'text-emerald-900 dark:text-emerald-200',
    rose: 'text-rose-900 dark:text-rose-200',
    slate: 'text-slate-900 dark:text-white',
  };
  return (
    <div className={`rounded-2xl border-2 p-3 sm:p-4 shadow-sm transition-all ${
      highlight
        ? `bg-gradient-to-br ${tones[tone]} text-white border-transparent shadow-lg`
        : tinted
          ? `${tintBg[tone]}`
          : 'bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] uppercase tracking-widest font-extrabold ${
            highlight ? 'text-white/80' : tinted ? textAccent[tone] : 'text-slate-500 dark:text-slate-400'
          } opacity-90`}>{label}</div>
          <div className={`mt-1.5 text-lg sm:text-xl lg:text-2xl font-extrabold tabular-nums truncate ${
            highlight ? 'text-white' : tinted ? textAccent[tone] : 'text-slate-900 dark:text-white'
          }`}>{value}</div>
          {sub && (
            <div className={`text-[10px] font-bold mt-0.5 truncate flex items-center gap-1 ${
              highlight ? 'text-white/80' : tinted ? textAccent[tone] + ' opacity-80' : 'text-slate-500 dark:text-slate-400'
            }`}>
              {SubIcon && <SubIcon className="h-2.5 w-2.5 shrink-0" />}
              {sub}
            </div>
          )}
        </div>
        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
          highlight
            ? 'bg-white/20 backdrop-blur text-white'
            : `bg-gradient-to-br ${tones[tone]} text-white shadow-lg`
        }`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
