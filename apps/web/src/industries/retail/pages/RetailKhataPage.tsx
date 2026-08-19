import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BookOpen, Search, X, Phone, MessageCircle, DollarSign,
  TrendingDown, Users, ArrowRight, Wallet, RefreshCw,
  AlertTriangle, CheckCircle2, ShoppingCart, Calendar, Download,
  ChevronDown, ChevronUp, Banknote, Award, GraduationCap,
  BellRing, SkipForward, Copy, CheckCheck, Clock, Flame,
  ArrowLeft, Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { customerLedgerApi } from '@modules/customers/khata/api/customer-ledger.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { AppLockGate } from '@core/security/AppLockGate';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETAIL KHATA — FULL BEST v4
   ─────────────────────────────────────────────────────────────
   ✅ FIX: Payment ab customerLedgerApi.receivePayment() use karta hai
      (pehle customersApi.recordPayment tha — 404 aata tha)
   🔔 BULK REMINDER WIZARD — sab ko yaad-dihani ek click me
   📅 Aging buckets — 0-7 / 7-30 / 30+ din
   🎓 Teacher modal • 🌙 Dark mode • ⌨️ / Esc
   🖨️ Print/PDF + 📊 CSV
   💳 Payment modal — calculator, quick amounts, live balance
   ═════════════════════════════════════════════════════════════ */

type SortKey = 'balance-high' | 'balance-low' | 'name' | 'recent' | 'oldest-due';
type FilterKey = 'all' | 'pending' | 'clear' | 'high' | 'aging30';

const DAY = 864e5;

/* Udhaar message templates — tone ke hisaab se */
function buildReminderMsg(c: any, shopName: string, tone: 'polite' | 'firm' | 'final' = 'polite') {
  const amt = `Rs ${Number(c.balance).toLocaleString('en-PK')}`;
  if (tone === 'polite') {
    return `Assalam-o-Alaikum ${c.name} bhai! 🙏\n\n${shopName} ki taraf se yaad-dihani — aap ka *${amt}* ka udhaar baqi hai.\n\nJab moqa mile, ada kar dein. Shukriya! 😊`;
  }
  if (tone === 'firm') {
    return `Assalam-o-Alaikum ${c.name} bhai,\n\n${shopName} mein aap ka *${amt}* udhaar kaafi arsay se pending hai.\n\nBaraye meherbani is hafte tak ada kar dein — hisaab-kitaab band karna hai.\n\nShukriya 🙏`;
  }
  return `${c.name} bhai,\n\n⚠️ FINAL REMINDER — ${shopName}\n\nAap ka *${amt}* udhaar bohat arsay se baqi hai. Agar 7 din mein payment na hui to humein dusre tareeqay ikhtiyar karne parenge.\n\nPayment options: Cash / Bank / JazzCash / EasyPaisa`;
}

const REMINDER_TONES = [
  { v: 'polite', l: '😊 Polite', d: 'Pehli yaad-dihani' },
  { v: 'firm', l: '💼 Firm', d: 'Dobara reminder' },
  { v: 'final', l: '⚠️ Final', d: 'Aakhri warning' },
] as const;

export default function RetailKhataPage() {
  return (
    <AppLockGate title="Customer Khata Locked" description="PIN daalo unlock karne ke liye">
      <RetailKhataContent />
    </AppLockGate>
  );
}

function RetailKhataContent() {
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();
  const tenantName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('balance-high');
  const [filter, setFilter] = useState<FilterKey>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showBulkReminder, setShowBulkReminder] = useState(false);

  const { data: customersData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['khata-customers'],
    queryFn: () => customersApi.list({ page: 1, limit: 2000 }),
    staleTime: 30_000,
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ['khata-sales'],
    queryFn: () => salesApi.list(),
    staleTime: 60_000,
  });

  const customers: any[] = customersData?.items ?? [];

  const khataData = useMemo(() => {
    return customers.map((c: any) => {
      const custSales = allSales.filter((s: any) => s.customer?.id === c.id);
      const totalSales = custSales.reduce((a: number, s: any) => a + Number(s.total || 0), 0);
      const totalPaid = custSales.reduce((a: number, s: any) => a + Number(s.paidAmount || 0), 0);
      const pendingSales = custSales.filter((s: any) => Number(s.creditAmount || 0) > 0);
      const lastSaleAt = custSales.length > 0
        ? Math.max(...custSales.map((s: any) => new Date(s.soldAt).getTime()))
        : 0;
      const oldestDueAt = pendingSales.length > 0
        ? Math.min(...pendingSales.map((s: any) => new Date(s.soldAt).getTime()))
        : 0;
      const ageDays = oldestDueAt > 0 ? Math.floor((Date.now() - oldestDueAt) / DAY) : 0;
      return {
        ...c,
        balance: Number(c.balance || 0),
        totalSales, totalPaid,
        salesCount: custSales.length,
        pendingCount: pendingSales.length,
        pendingSales, allSales: custSales,
        lastSaleAt, oldestDueAt, ageDays,
      };
    });
  }, [customers, allSales]);

  const filtered = useMemo(() => {
    let list = khataData;
    if (filter === 'pending') list = list.filter((c) => c.balance > 0);
    if (filter === 'clear') list = list.filter((c) => c.balance <= 0);
    if (filter === 'high') list = list.filter((c) => c.balance > 10000);
    if (filter === 'aging30') list = list.filter((c) => c.balance > 0 && c.ageDays >= 30);

    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((c) =>
        c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q),
      );
    }

    list = [...list].sort((a, b) => {
      if (sortKey === 'balance-high') return b.balance - a.balance;
      if (sortKey === 'balance-low') return a.balance - b.balance;
      if (sortKey === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortKey === 'recent') return b.lastSaleAt - a.lastSaleAt;
      if (sortKey === 'oldest-due') return (b.ageDays || 0) - (a.ageDays || 0);
      return 0;
    });
    return list;
  }, [khataData, search, sortKey, filter]);

  const stats = useMemo(() => {
    const due = khataData.filter((c) => c.balance > 0);
    const totalDue = due.reduce((a, c) => a + c.balance, 0);
    const withDues = due.length;
    const clearCustomers = khataData.filter((c) => c.balance <= 0 && c.salesCount > 0).length;
    const highDue = due.filter((c) => c.balance > 10000).length;

    const aging = {
      fresh:  due.filter((c) => c.ageDays < 7).reduce((a, c) => a + c.balance, 0),
      week:   due.filter((c) => c.ageDays >= 7 && c.ageDays < 30).reduce((a, c) => a + c.balance, 0),
      old:    due.filter((c) => c.ageDays >= 30).reduce((a, c) => a + c.balance, 0),
      oldCount: due.filter((c) => c.ageDays >= 30).length,
    };
    return { totalDue, withDues, clearCustomers, highDue, totalCustomers: khataData.length, aging };
  }, [khataData]);

  /* ─── ✅ FIXED: Payment ab customerLedgerApi use karta hai ─── */
  const paymentMutation = useMutation({
    mutationFn: async ({ customerId, amount, note }: { customerId: string; amount: number; note?: string }) => {
      return customerLedgerApi.receivePayment(customerId, { amount, note });
    },
    onSuccess: (_, vars) => {
      toast.success(`${formatPKR(vars.amount)} wasool ho gaye ✓`);
      setPaymentModal(null);
      queryClient.invalidateQueries({ queryKey: ['khata-customers'] });
      queryClient.invalidateQueries({ queryKey: ['khata-sales'] });
      queryClient.invalidateQueries({ queryKey: ['khata-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['khata-summary'] });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Payment fail'),
  });

  const whatsappReminder = (c: any) => {
    if (!c.phone) return toast.error('Phone number nahi hai');
    const phone = String(c.phone).replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    const tone = c.ageDays >= 30 ? 'final' : c.ageDays >= 7 ? 'firm' : 'polite';
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(buildReminderMsg(c, tenantName, tone))}`, '_blank');
  };

  const reminderList = useMemo(() =>
    khataData
      .filter((c) => c.balance > 0 && c.phone)
      .sort((a, b) => b.balance - a.balance),
    [khataData]);

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Khata Report — ${tenantName}`],
      [`Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Total Udhaar: ${stats.totalDue.toFixed(2)}  •  Customers: ${stats.withDues}`],
      [''],
    ];
    const headers = ['Naam', 'Phone', 'Udhaar', 'Kitne Din Se', 'Total Sales', 'Total Paid', 'Sales Count', 'Pending Bills'];
    const rows = filtered.map((c) => [
      c.name || '', c.phone || '', c.balance.toFixed(2), c.ageDays,
      c.totalSales.toFixed(2), c.totalPaid.toFixed(2), c.salesCount, c.pendingCount,
    ]);
    const csv = [...summary, headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khata-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Khata export ho gaya');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (showBulkReminder) setShowBulkReminder(false);
        else if (showTeacher) setShowTeacher(false);
        else if (paymentModal) setPaymentModal(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showBulkReminder, showTeacher, paymentModal]);

  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <>
      {paymentModal && (
        <PaymentModal
          customer={paymentModal}
          loading={paymentMutation.isPending}
          onClose={() => setPaymentModal(null)}
          onConfirm={(amount: number, note: string) => paymentMutation.mutate({ customerId: paymentModal.id, amount, note })}
        />
      )}

      {showTeacher && <KhataTeacher onClose={() => setShowTeacher(false)} onStartBulk={() => { setShowTeacher(false); setShowBulkReminder(true); }} hasDues={stats.withDues > 0} />}

      {showBulkReminder && (
        <BulkReminderWizard
          customers={reminderList}
          shopName={tenantName}
          onClose={() => setShowBulkReminder(false)}
        />
      )}

      <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
        {/* ═══ PRINT-ONLY HEADER ═══ */}
        <div className="hidden print:block">
          <div className="flex items-center justify-between border-b-4 border-amber-600 pb-3 mb-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">📔 {tenantName} — Khata Report</h1>
              <p className="text-xs text-slate-600 font-semibold mt-1">
                {stats.withDues} customers • Total udhaar {formatPKR(stats.totalDue)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-500">Generated</div>
              <div className="text-xs font-bold text-slate-900">{printDate}</div>
            </div>
          </div>
        </div>

        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 dark:from-slate-950 dark:via-amber-950 dark:to-orange-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
                <BookOpen className="h-3.5 w-3.5 text-amber-300" /> Customer Khata
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">📔 Udhaar Book</h1>
              <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
                {stats.withDues > 0 ? (
                  <>
                    <strong className="text-amber-300">{stats.withDues} customers</strong> ka total{' '}
                    <strong className="text-rose-300">{formatPKR(stats.totalDue)}</strong> baqi
                    {stats.aging.old > 0 && (
                      <> <span className="opacity-50 mx-1">•</span> <strong className="text-rose-300">🔥 {formatPKR(stats.aging.old)}</strong> 30+ din purana</>
                    )}
                  </>
                ) : (
                  <>Sab customers ka khata clear hai — MashaAllah! 🎉</>
                )}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap items-center shrink-0">
              <button
                onClick={() => setShowTeacher(true)}
                className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
                title="Guide"
              >
                <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
              </button>
              <PrivacyToggle compact />
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
              >
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button onClick={() => window.print()} className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition">
                <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
              </button>
              <button onClick={exportCSV} className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition">
                <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
              </button>
              <Link to="/pos">
                <Button className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold shadow-2xl">
                  <ShoppingCart className="h-4 w-4" /> POS
                </Button>
              </Link>
            </div>
          </div>

          {/* 🔔 BULK REMINDER strip */}
          {stats.withDues > 0 && (
            <div className="relative mt-4 rounded-2xl bg-gradient-to-r from-emerald-500/25 to-green-500/15 backdrop-blur-md border border-emerald-300/40 p-3 flex items-center gap-3 flex-wrap">
              <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40 shrink-0">
                <BellRing className="h-5 w-5 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-sm">Sab ko yaad dilao — 1 click mein 🔔</div>
                <div className="text-[11px] text-white/80 font-semibold">
                  {reminderList.length} customers (phone walay) — har kisi ka message ready, bas Next-Next-Send
                </div>
              </div>
              <button
                onClick={() => reminderList.length > 0 ? setShowBulkReminder(true) : toast.error('Kisi customer ka phone number nahi hai')}
                className="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/40 transition active:scale-95"
              >
                <MessageCircle className="h-4 w-4" /> Reminders Bhejo ({reminderList.length})
              </button>
            </div>
          )}

          {/* Keyboard hints */}
          <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
            <Kbd>/</Kbd><span className="text-white/60">Search</span>
            <span className="text-white/30 mx-1">•</span>
            <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
          </div>
        </section>

        {/* ═══ KPIs ═══ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:hidden">
          <Kpi icon={TrendingDown} label="Total Udhaar" value={hideCost ? '••••' : formatPKR(stats.totalDue)} sub={`${stats.withDues} customers`} tone="rose" highlight />
          <Kpi icon={Users} label="Total Customers" value={stats.totalCustomers} sub={`${stats.clearCustomers} clear`} tone="blue" />
          <Kpi icon={AlertTriangle} label="Zyada Udhaar" value={stats.highDue} sub="10K+ walay" tone="amber" active={filter === 'high'} onClick={() => setFilter(filter === 'high' ? 'pending' : 'high')} />
          <Kpi icon={Flame} label="30+ Din Purana" value={stats.aging.oldCount} sub={hideCost ? '••••' : formatPKR(stats.aging.old)} tone="rose" active={filter === 'aging30'} onClick={() => setFilter(filter === 'aging30' ? 'pending' : 'aging30')} />
        </section>

        {/* ═══ AGING BUCKETS ═══ */}
        {stats.withDues > 0 && !hideCost && (
          <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 print:hidden">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/40">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Udhaar Kitna Purana Hai?</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Jitna purana, utna mushkil wasooli</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <AgingBucket emoji="🌱" label="Naya (0-7 din)" value={stats.aging.fresh} tone="emerald" />
              <AgingBucket emoji="⏰" label="Week+ (7-30 din)" value={stats.aging.week} tone="amber" />
              <AgingBucket emoji="🔥" label="Bohat Purana (30+)" value={stats.aging.old} tone="rose" />
            </div>
          </section>
        )}

        {/* ═══ TOOLBAR ═══ */}
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-4 space-y-3 print:hidden">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Customer naam ya phone... (/ shortcut)"
                className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-500/30 transition"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-12 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
            >
              <option value="balance-high">💰 Zyada udhaar pehle</option>
              <option value="balance-low">Kam udhaar pehle</option>
              <option value="oldest-due">🔥 Sab se purana pehle</option>
              <option value="recent">🕐 Nayi sales pehle</option>
              <option value="name">🔤 Naam A-Z</option>
            </select>
          </div>

          <div className="flex gap-1.5 flex-wrap items-center">
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-wrap">
              {[
                { v: 'pending', l: 'Baqi Udhaar', c: stats.withDues },
                { v: 'all', l: 'Sab', c: stats.totalCustomers },
                { v: 'clear', l: 'Clear', c: stats.clearCustomers },
                { v: 'high', l: '10K+', c: stats.highDue },
                { v: 'aging30', l: '🔥 30+ din', c: stats.aging.oldCount },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => setFilter(o.v as FilterKey)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1.5',
                    filter === o.v ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                  ].join(' ')}
                >
                  {o.l}
                  <span className={['px-1.5 rounded text-[10px] tabular-nums', filter === o.v ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'].join(' ')}>
                    {o.c}
                  </span>
                </button>
              ))}
            </div>
            <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
              {filtered.length} customers
            </div>
          </div>
        </section>

        {/* ═══ CUSTOMER LIST ═══ */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 sm:p-16 text-center">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-200 dark:from-emerald-500/20 dark:to-teal-500/20 mx-auto flex items-center justify-center">
              {filter === 'pending' ? <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" /> : <BookOpen className="h-10 w-10 text-amber-600 dark:text-amber-400" />}
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
              {filter === 'pending' && stats.withDues === 0 ? 'MashaAllah! Sab clear hai 🎉'
                : search ? 'Koi customer nahi mila'
                : 'Khaate mein koi entry nahi'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto">
              {filter === 'pending' && stats.withDues === 0
                ? 'Kisi customer ka koi udhaar nahi — zabardast!'
                : search ? 'Doosra naam ya number try karo'
                : 'POS se udhaar wali sales karo — yahan aa jayega'}
            </p>
            {search && (
              <Button variant="secondary" className="mt-4 font-extrabold" onClick={() => setSearch('')}>
                <X className="h-4 w-4" /> Search Clear Karo
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <CustomerKhataRow
                key={c.id}
                customer={c}
                expanded={expandedId === c.id}
                hideCost={hideCost}
                onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                onPayment={() => setPaymentModal(c)}
                onWhatsApp={() => whatsappReminder(c)}
              />
            ))}
          </div>
        )}

        {/* ═══ PRINT CSS ═══ */}
        <style>{`
          @media print {
            @page { size: A4; margin: 12mm 10mm; }
            html, body { background: white !important; color: #0f172a !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
            .dark body, .dark { background: white !important; color: #0f172a !important; }
            .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
            section, div { box-shadow: none !important; }
            [class*="fixed"] { display: none !important; }
            html, body, #root, #__next { height: auto !important; min-height: 0 !important; overflow: visible !important; }
            [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
            [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
          }
        `}</style>
      </div>
    </>
  );
}

/* ═════════════════════════════════════════════════════════════
   🔔 BULK REMINDER WIZARD
   ═════════════════════════════════════════════════════════════ */
function BulkReminderWizard({ customers, shopName, onClose }: {
  customers: any[];
  shopName: string;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [tone, setTone] = useState<'polite' | 'firm' | 'final'>('polite');
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const total = customers.length;
  const current = customers[idx];
  const finished = doneIds.size + skippedIds.size;
  const allDone = finished >= total;

  const msg = current ? buildReminderMsg(current, shopName, tone) : '';

  const openWhatsApp = () => {
    if (!current?.phone) return;
    const phone = String(current.phone).replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    setDoneIds((p) => new Set([...p, current.id]));
  };

  const copyMsg = () => {
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success('Message copy ho gaya');
  };

  const next = (skipped = false) => {
    if (current) {
      if (skipped) setSkippedIds((p) => new Set([...p, current.id]));
    }
    if (idx < total - 1) setIdx(idx + 1);
  };

  const prev = () => { if (idx > 0) setIdx(idx - 1); };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-br from-slate-950 via-emerald-900 to-green-700 text-white px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-white/20">
                <BellRing className="h-3 w-3 text-emerald-300" /> Bulk Reminders
              </div>
              <h3 className="font-extrabold text-lg mt-1">Sab Ko Yaad Dilao 🔔</h3>
              <p className="text-xs text-white/80 font-semibold">
                {allDone ? 'Ho gaya!' : `${finished}/${total} done`}
              </p>
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0 transition">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-2 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-400 transition-all duration-300"
              style={{ width: `${total > 0 ? (finished / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {allDone ? (
            <div className="text-center py-6">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/40">
                <CheckCheck className="h-8 w-8 text-white" />
              </div>
              <h4 className="mt-3 text-lg font-extrabold text-slate-900 dark:text-white">Sab Done! 🎉</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                {doneIds.size} reminders bheje • {skippedIds.size} skip kiye
              </p>
              <Button className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-700 font-extrabold" onClick={onClose}>
                <CheckCircle2 className="h-4 w-4" /> Band Karo
              </Button>
            </div>
          ) : current && (
            <>
              {/* Current customer */}
              <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-extrabold text-lg shrink-0 shadow-md">
                  {(current.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-slate-900 dark:text-white truncate">{current.name}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-bold flex items-center gap-2 flex-wrap">
                    <span className="tabular-nums text-rose-700 dark:text-rose-400 font-extrabold">{formatPKR(current.balance)}</span>
                    <span>•</span>
                    <span>{current.phone}</span>
                    {current.ageDays >= 7 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-700 dark:text-amber-400">{current.ageDays} din se</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
                  {idx + 1} / {total}
                </div>
              </div>

              {/* Tone selector */}
              <div>
                <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider mb-1.5">Message ka tone</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {REMINDER_TONES.map((t) => (
                    <button
                      key={t.v}
                      onClick={() => setTone(t.v)}
                      className={[
                        'p-2.5 rounded-xl border-2 text-center transition',
                        tone === t.v
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/40',
                      ].join(' ')}
                    >
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">{t.l}</div>
                      <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{t.d}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Message Preview</div>
                  <button
                    onClick={copyMsg}
                    className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 hover:underline"
                  >
                    {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {msg}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!allDone && current && (
          <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-4 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={prev}
                disabled={idx === 0}
                className="h-12 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold disabled:opacity-40 transition"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => { openWhatsApp(); setTimeout(() => next(false), 400); }}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-lg shadow-green-500/40 transition active:scale-[0.98]"
              >
                <MessageCircle className="h-5 w-5" />
                WhatsApp Kholo → Agla
              </button>
              <button
                onClick={() => next(true)}
                title="Skip (is customer ko chhoro)"
                className="h-12 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1 transition"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>
            <p className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
              WhatsApp khulega → wahan Send dabao → yahan automatically agla customer
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   🎓 KHATA TEACHER
   ═════════════════════════════════════════════════════════════ */
function KhataTeacher({ onClose, onStartBulk, hasDues }: { onClose: () => void; onStartBulk: () => void; hasDues: boolean }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-amber-200 dark:border-amber-500/30 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/15 dark:to-orange-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Khata Kaise Use Karein?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Khata = <strong>customers ki udhaar ki register</strong>. Kis ne kitna liya, kab liya, kitna wapas aaya — sab yahan.
          </p>

          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>🔔 "Reminders Bhejo"</strong> — sab udhaar walon ko ek-ek WhatsApp ready-made message (tone choose karo: polite/firm/final)</TipRow>
            <TipRow><strong>💰 "Paisay Wasool"</strong> — customer aaya to foran payment record karo, khata khud update</TipRow>
            <TipRow><strong>📅 Aging colors</strong> — 🌱 naya, ⏰ 7+ din, 🔥 30+ din (red = jaldi wasool karo!)</TipRow>
            <TipRow><strong>💬 Green button</strong> — single customer ko reminder (puranay pe automatically sakht tone)</TipRow>
            <TipRow><strong>Tafseel</strong> — customer ki saari sales + pending bills dekho</TipRow>
            <TipRow><strong>⌨️ / dabao</strong> — search pe jump &nbsp;•&nbsp; <strong>Esc</strong> — sab band</TipRow>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            💡 <strong>Roz ki aadat:</strong> Jumma ko "Reminders Bhejo" dabao — weekend pe zyada log wasool kar dete hain. 🔥 30+ din wale pe "Firm" ya "Final" tone use karo.
          </div>

          {hasDues ? (
            <Button
              className="w-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 font-extrabold shadow-lg shadow-emerald-500/40 h-12"
              onClick={onStartBulk}
            >
              <BellRing className="h-4 w-4" /> Samajh Gaya — Abhi Reminders Bhejo! 🔔
            </Button>
          ) : (
            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 font-extrabold shadow-lg shadow-amber-500/40 h-12"
              onClick={onClose}
            >
              <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CUSTOMER ROW
   ═════════════════════════════════════════════════════════════ */
function CustomerKhataRow({ customer, expanded, hideCost, onToggle, onPayment, onWhatsApp }: any) {
  const hasBalance = customer.balance > 0;
  const isHigh = customer.balance > 10000;
  const isAged = hasBalance && customer.ageDays >= 30;

  return (
    <div className={[
      'rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-sm dark:shadow-black/20 transition-all',
      isAged ? 'border-rose-300 dark:border-rose-500/50' : isHigh ? 'border-rose-300 dark:border-rose-500/40' : hasBalance ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-800',
    ].join(' ')}>
      <div className="p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <div className={[
          'h-14 w-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shrink-0 shadow-md',
          isAged ? 'bg-gradient-to-br from-rose-600 to-red-800'
            : isHigh ? 'bg-gradient-to-br from-rose-500 to-red-700'
            : hasBalance ? 'bg-gradient-to-br from-amber-500 to-orange-700'
            : 'bg-gradient-to-br from-emerald-500 to-teal-700',
        ].join(' ')}>
          {(customer.name || '?').charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg truncate">{customer.name}</h3>
            {isAged && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-1 animate-pulse">
                <Flame className="h-2.5 w-2.5" /> {customer.ageDays} din se
              </span>
            )}
            {!isAged && isHigh && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" /> Zyada
              </span>
            )}
            {!hasBalance && customer.salesCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold uppercase">
                Clear ✓
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-bold flex-wrap">
            {customer.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {customer.phone}
              </span>
            )}
            <span>•</span>
            <span>{customer.salesCount} sales</span>
            {customer.pendingCount > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> {customer.pendingCount} pending
                </span>
              </>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Udhaar</div>
          <div className={[
            'text-2xl sm:text-3xl font-extrabold tabular-nums leading-none',
            isAged || isHigh ? 'text-rose-700 dark:text-rose-400' : hasBalance ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400',
          ].join(' ')}>
            {hideCost ? '••••' : formatPKR(customer.balance)}
          </div>
          {!hideCost && customer.totalSales > 0 && (
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              Total {formatPKR(customer.totalSales)}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-3 flex gap-2 flex-wrap border-t border-slate-100 dark:border-slate-800 pt-3">
        {hasBalance && (
          <button
            onClick={onPayment}
            className="flex-1 min-w-[120px] h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/30 active:scale-95 transition"
          >
            <Banknote className="h-4 w-4" /> Paisay Wasool
          </button>
        )}
        {customer.phone && hasBalance && (
          <button
            onClick={onWhatsApp}
            title={customer.ageDays >= 30 ? 'Final reminder (sakht)' : customer.ageDays >= 7 ? 'Firm reminder' : 'Polite reminder'}
            className="h-11 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-extrabold inline-flex items-center gap-1.5 shadow-sm shadow-green-500/30 active:scale-95 transition"
          >
            <MessageCircle className="h-4 w-4" /> Reminder
          </button>
        )}
        <button
          onClick={onToggle}
          className="h-11 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-extrabold inline-flex items-center gap-1 transition"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {expanded ? 'Chhupao' : 'Tafseel'}
        </button>
      </div>

      {expanded && (
        <div className="border-t-2 border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/40 space-y-2 max-h-96 overflow-y-auto">
          <div className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 tracking-wider mb-2">
            Sales History ({customer.allSales.length})
          </div>
          {customer.allSales.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold text-center py-4">
              Abhi tak koi sale nahi
            </p>
          ) : (
            [...customer.allSales]
              .sort((a: any, b: any) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime())
              .slice(0, 20)
              .map((sale: any) => {
                const credit = Number(sale.creditAmount || 0);
                return (
                  <Link
                    key={sale.id}
                    to={`/sales/${sale.id}/receipt`}
                    className="block rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500/40 hover:shadow-md transition p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-extrabold text-slate-900 dark:text-white text-xs">{sale.saleNumber}</span>
                          {credit > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-extrabold uppercase">
                              Udhaar
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 inline-flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(sale.soldAt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-slate-900 dark:text-white tabular-nums text-sm">
                          {hideCost ? '••••' : formatPKR(sale.total)}
                        </div>
                        {credit > 0 && (
                          <div className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400">
                            Baqi {formatPKR(credit)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
          )}
          {customer.allSales.length > 20 && (
            <div className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 pt-2">
              +{customer.allSales.length - 20} sales aur bhi...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   PAYMENT MODAL
   ═════════════════════════════════════════════════════════════ */
function PaymentModal({ customer, loading, onClose, onConfirm }: any) {
  const [amount, setAmount] = useState<string>(String(customer.balance));
  const [note, setNote] = useState('');
  const [showCalc, setShowCalc] = useState(false);

  const payAmount = Number(amount) || 0;
  const newBalance = customer.balance - payAmount;
  const isValid = payAmount > 0 && payAmount <= customer.balance;

  const QUICK = [100, 500, 1000, 2000, 5000, 10000];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-green-700 text-white px-5 py-4">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase font-extrabold text-emerald-200 tracking-wider">
                Paisay Wasool
              </div>
              <div className="text-xl font-extrabold mt-1 truncate">{customer.name}</div>
              <div className="text-xs font-bold text-white/80 mt-0.5">
                Kul udhaar: <strong className="text-amber-300">{formatPKR(customer.balance)}</strong>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-90 flex items-center justify-center border-2 border-white/20 transition shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 tracking-wider">
                Kitna paisa mila?
              </label>
              <button
                onClick={() => setShowCalc(!showCalc)}
                className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1"
              >
                <DollarSign className="h-3 w-3" /> Calculator
              </button>
            </div>
            <input
              autoFocus
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className="h-16 sm:h-20 w-full rounded-2xl border-4 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 text-3xl sm:text-4xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-500/20 text-center transition"
            />

            <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {QUICK.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(String((Number(amount) || 0) + amt))}
                  className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 active:scale-95 text-xs font-extrabold text-slate-800 dark:text-slate-200 transition"
                >
                  +{amt}
                </button>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                onClick={() => setAmount(String(customer.balance))}
                className="h-11 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 active:scale-95 text-sm font-extrabold text-emerald-800 dark:text-emerald-200 transition inline-flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="h-4 w-4" /> Pura Wasool
              </button>
              <button
                onClick={() => setAmount(String(Math.floor(customer.balance / 2)))}
                className="h-11 rounded-xl bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/30 active:scale-95 text-sm font-extrabold text-blue-800 dark:text-blue-200 transition"
              >
                Aadha
              </button>
              <button
                onClick={() => setAmount('')}
                className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-sm font-extrabold text-slate-700 dark:text-slate-200 transition"
              >
                Clear
              </button>
            </div>

            {showCalc && (
              <div className="mt-3 grid grid-cols-4 gap-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 p-2">
                {[7, 8, 9, 'C', 4, 5, 6, '←', 1, 2, 3, '00', 0, '.', '000', '='].map((k) => (
                  <button
                    key={String(k)}
                    onClick={() => {
                      const key = String(k);
                      if (key === 'C') return setAmount('');
                      if (key === '←') return setAmount(amount.slice(0, -1));
                      if (key === '=') return;
                      setAmount(amount + key);
                    }}
                    className={[
                      'h-11 rounded-xl font-extrabold text-lg transition active:scale-95',
                      k === 'C' ? 'bg-rose-500 text-white'
                        : k === '←' ? 'bg-amber-500 text-white'
                        : k === '=' ? 'bg-emerald-500 text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm',
                    ].join(' ')}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 tracking-wider mb-1 block">
              Note <span className="text-slate-400 dark:text-slate-500 normal-case font-bold">(optional)</span>
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Cash mila, Bank transfer..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900 border-4 border-slate-200 dark:border-slate-700 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-600 dark:text-slate-300">Purana udhaar</span>
              <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(customer.balance)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-600 dark:text-slate-300">Wasool</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">- {formatPKR(payAmount)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Baqi Udhaar</span>
              <span className={[
                'text-xl font-extrabold tabular-nums',
                newBalance <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400',
              ].join(' ')}>
                {formatPKR(Math.max(newBalance, 0))}
              </span>
            </div>
            {newBalance <= 0 && payAmount > 0 && (
              <div className="rounded-xl bg-emerald-500 text-white p-2.5 mt-2 text-center text-sm font-extrabold inline-flex items-center justify-center gap-2 w-full">
                <Award className="h-4 w-4" /> Khata clear ho jayega! 🎉
              </div>
            )}
          </div>

          {!isValid && payAmount > customer.balance && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/15 border-2 border-rose-300 dark:border-rose-500/40 p-2.5 text-xs font-extrabold text-rose-800 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Wasool udhaar se zyada nahi ho sakta</span>
            </div>
          )}
        </div>

        <div className="shrink-0 p-4 border-t-4 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={() => onConfirm(payAmount, note)}
            disabled={!isValid || loading}
            className={[
              'w-full h-14 sm:h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700',
              'text-white font-extrabold shadow-2xl transition active:scale-[0.98]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-between px-5',
            ].join(' ')}
          >
            <div className="text-left">
              <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">
                {loading ? 'Save ho raha...' : 'Payment confirm karo'}
              </div>
              <div className="text-xl sm:text-2xl tabular-nums leading-none mt-0.5">{formatPKR(payAmount)}</div>
            </div>
            <ArrowRight className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */
function AgingBucket({ emoji, label, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'border-emerald-200 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
    amber:   'border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300',
    rose:    'border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300',
  };
  return (
    <div className={`rounded-xl border-2 p-3 text-center ${tones[tone]}`}>
      <div className="text-xl">{emoji}</div>
      <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-80 mt-1">{label}</div>
      <div className="text-base font-extrabold tabular-nums mt-0.5">{formatPKR(value)}</div>
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

function Kpi({ icon: Icon, label, value, sub, tone, highlight, onClick, active }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 to-red-600 shadow-rose-500/40',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={[
        'rounded-2xl border-2 p-3 sm:p-4 shadow-sm dark:shadow-black/20 text-left w-full transition',
        highlight
          ? 'bg-gradient-to-br from-rose-50 to-white dark:from-rose-500/10 dark:to-slate-900/60 border-rose-300 dark:border-rose-500/40'
          : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800',
        onClick ? 'hover:border-amber-300 dark:hover:border-amber-500/50 hover:shadow-md hover:-translate-y-0.5' : '',
        active ? 'ring-2 ring-amber-400 dark:ring-amber-500/50' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}
