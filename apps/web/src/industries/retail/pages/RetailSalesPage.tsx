import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp, CalendarDays, ShoppingCart, Search, X, Package, User,
  Banknote, CreditCard, Smartphone, Building2, Zap,
  Eye, Download, RefreshCw, Award, ArrowRight, BookOpen, Barcode, Clock,
  BarChart3, CalendarRange, GraduationCap, Printer, CheckCircle2,
  Trophy, Settings2, Check, Minimize2, Maximize2,
} from 'lucide-react';
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';
import { useAuthStore } from '@core/stores/auth.store';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETAIL SALES — FULL BEST v4
   ─────────────────────────────────────────────────────────────
   🔒 PrivacyToggle (sales privacy modal khatam)
   🎓 Teacher modal — "Ye page kya karta hai"
   🌙 Dark mode COMPLETE
   🖨️ Print/PDF perfect (A4 landscape, colored)
   📊 CSV summary header ke sath
   ⌨️  / = search, Esc = modals
   ⚙️  Receipt Quick-Settings (inline popover, localStorage)
       → key 'nafaa.receipt.prefs' — ReceiptPage yahi defaults use karta hai
   🔗 Row pe direct Print button (prefs ke saath receipt)
   📱 Mobile → 4K responsive
   ═════════════════════════════════════════════════════════════ */

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const paymentConfig: Record<string, { label: string; icon: any; color: string; bg: string; hex: string }> = {
  CASH:          { label: 'Cash',      icon: Banknote,   color: '#16a34a', bg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40', hex: '#10b981' },
  CARD:          { label: 'Card',      icon: CreditCard, color: '#2563eb', bg: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/40',                     hex: '#3b82f6' },
  JAZZCASH:      { label: 'JazzCash',  icon: Smartphone, color: '#f97316', bg: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/40',       hex: '#f97316' },
  EASYPAISA:     { label: 'EasyPaisa', icon: Zap,        color: '#22c55e', bg: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/40',            hex: '#22c55e' },
  BANK_TRANSFER: { label: 'Bank',      icon: Building2,  color: '#7c3aed', bg: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/40',      hex: '#8b5cf6' },
};

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

/* ════════════════════════════════════════════════════════════
   RECEIPT PREFS — localStorage (ReceiptPage isi key se padhta hai)
   ════════════════════════════════════════════════════════════ */
const RECEIPT_PREFS_KEY = 'nafaa.receipt.prefs';

interface ReceiptPrefs {
  paperWidth: '58' | '80';
  mode: 'short' | 'full';
  autoPrint: boolean;
  showLogo: boolean;
}

const DEFAULT_RECEIPT_PREFS: ReceiptPrefs = {
  paperWidth: '80',
  mode: 'short',
  autoPrint: true,
  showLogo: true,
};

export function getReceiptPrefs(): ReceiptPrefs {
  try {
    const raw = localStorage.getItem(RECEIPT_PREFS_KEY);
    if (!raw) return DEFAULT_RECEIPT_PREFS;
    return { ...DEFAULT_RECEIPT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_RECEIPT_PREFS;
  }
}

function saveReceiptPrefs(p: ReceiptPrefs) {
  try {
    localStorage.setItem(RECEIPT_PREFS_KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent('receipt-prefs-changed', { detail: p }));
  } catch { /* storage full — ignore */ }
}

/* ══════════════════════════════════════════════════════════ */
export default function RetailSalesPage() {
  const hideAmounts = useCostHidden();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
  const [creditOnly, setCreditOnly] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showReceiptSettings, setShowReceiptSettings] = useState(false);

  // Receipt prefs (sale page par hi manage)
  const [receiptPrefs, setReceiptPrefs] = useState<ReceiptPrefs>(getReceiptPrefs);
  const [prefsSaved, setPrefsSaved] = useState(false);

  const updateReceiptPrefs = (patch: Partial<ReceiptPrefs>) => {
    const next = { ...receiptPrefs, ...patch };
    setReceiptPrefs(next);
    saveReceiptPrefs(next);
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 1200);
  };

  // Sale row ka direct print — prefs ke saath receipt pe
  const receiptLink = (saleId: string, autoprint = false) =>
    `/sales/${saleId}/receipt?paper=${receiptPrefs.paperWidth}&mode=${receiptPrefs.mode}${autoprint ? '&autoprint=1' : ''}`;

  const { data: sales = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sales-list'],
    queryFn: () => salesApi.list(),
  });

  const { data: summary } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: () => salesApi.summary(),
  });

  const showValue = (v: string) => hideAmounts ? '••••••' : v;

  const getDateRange = (): [Date, Date] => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    if (dateFilter === 'today') start.setHours(0, 0, 0, 0);
    else if (dateFilter === 'yesterday') {
      start.setDate(now.getDate() - 1); start.setHours(0, 0, 0, 0);
      end = new Date(start); end.setHours(23, 59, 59, 999);
    }
    else if (dateFilter === 'week') start.setDate(now.getDate() - 7);
    else if (dateFilter === 'month') start.setMonth(now.getMonth() - 1);
    else if (dateFilter === 'year') start.setFullYear(now.getFullYear() - 1);
    else if (dateFilter === 'custom') {
      if (customStart) { start = new Date(customStart); start.setHours(0, 0, 0, 0); }
      if (customEnd) { end = new Date(customEnd); end.setHours(23, 59, 59, 999); }
    }
    else if (dateFilter === 'all') start = new Date(0);
    return [start, end];
  };

  const filteredSales = useMemo(() => {
    let list = [...sales];
    const [start, end] = getDateRange();
    list = list.filter((s) => { const d = new Date(s.soldAt); return d >= start && d <= end; });
    if (paymentFilter !== 'all') list = list.filter((s) => s.paymentMethod === paymentFilter);
    if (creditOnly) list = list.filter((s) => s.creditAmount > 0);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((s) =>
        s.saleNumber.toLowerCase().includes(q) ||
        s.customer?.name?.toLowerCase().includes(q) ||
        s.customer?.phone?.toLowerCase().includes(q) ||
        s.items.some((it: any) =>
          it.product.name.toLowerCase().includes(q) ||
          it.product.sku?.toLowerCase().includes(q) ||
          it.product.barcode?.toLowerCase().includes(q)
        )
      );
    }
    return list.sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
  }, [sales, dateFilter, customStart, customEnd, paymentFilter, creditOnly, search]);

  const stats = useMemo(() => {
    const totalAmount = filteredSales.reduce((s, x) => s + x.total, 0);
    const totalCredit = filteredSales.reduce((s, x) => s + x.creditAmount, 0);
    const totalPaid = filteredSales.reduce((s, x) => s + x.paidAmount, 0);
    const avgOrder = filteredSales.length > 0 ? totalAmount / filteredSales.length : 0;
    const creditCount = filteredSales.filter((s) => s.creditAmount > 0).length;
    const voidedCount = filteredSales.filter((s) => s.status === 'VOIDED').length;
    const best = filteredSales.reduce<any>((b, s) => (s.total > (b?.total || 0) ? s : b), null);
    return { totalAmount, totalCredit, totalPaid, avgOrder, count: filteredSales.length, creditCount, voidedCount, best };
  }, [filteredSales]);

  const trendData = useMemo(() => {
    const buckets: Record<string, { label: string; sales: number; orders: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { label: d.toLocaleDateString('en-PK', { weekday: 'short' }), sales: 0, orders: 0 };
    }
    sales.forEach((s) => {
      const key = new Date(s.soldAt).toISOString().slice(0, 10);
      if (buckets[key]) { buckets[key].sales += s.total; buckets[key].orders += 1; }
    });
    return Object.values(buckets);
  }, [sales]);

  const exportCSV = () => {
    if (filteredSales.length === 0) return toast.error('Koi data nahi');
    const summaryRows = [
      [`Sales Report — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Period: ${dateFilter}  •  Total sales: ${filteredSales.length}  •  Total amount: ${stats.totalAmount.toFixed(2)}`],
      [`Paid: ${stats.totalPaid.toFixed(2)}  •  Udhaar: ${stats.totalCredit.toFixed(2)}  •  Avg order: ${stats.avgOrder.toFixed(2)}`],
      [''],
    ];
    const headers = ['Sale #', 'Date', 'Customer', 'Phone', 'Items', 'Qty', 'Payment', 'Subtotal', 'Discount', 'Total', 'Paid', 'Udhaar', 'Status'];
    const rows = filteredSales.map((s) => [
      s.saleNumber,
      new Date(s.soldAt).toLocaleString('en-PK'),
      s.customer?.name || 'Walk-in',
      s.customer?.phone || '',
      s.items.length,
      s.items.reduce((a: number, it: any) => a + Number(it.quantity || 0), 0),
      paymentConfig[s.paymentMethod]?.label || s.paymentMethod,
      s.subtotal.toFixed(2),
      s.discount.toFixed(2),
      s.total.toFixed(2),
      s.paidAmount.toFixed(2),
      s.creditAmount.toFixed(2),
      s.status,
    ]);
    const csv = [...summaryRows, headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retail-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredSales.length} sales export ho gaye`);
  };

  const handlePrint = () => window.print();
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (showTeacher) setShowTeacher(false);
        if (showReceiptSettings) setShowReceiptSettings(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, showReceiptSettings]);

  const hasFilters = !!search || dateFilter !== 'today' || paymentFilter !== 'all' || creditOnly;
  const clearFilters = () => {
    setSearch(''); setDateFilter('today'); setPaymentFilter('all');
    setCreditOnly(false); setCustomStart(''); setCustomEnd('');
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-8 print:space-y-3">
      {showTeacher && <SalesTeacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ PRINT-ONLY HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-sky-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              🧾 {tenantName || 'My Store'} — Sales Report
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `Shop: ${shopName}  •  ` : ''}{filteredSales.length} sales • {formatPKR(stats.totalAmount)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Generated</div>
            <div className="text-xs font-bold text-slate-900">{printDate}</div>
          </div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 dark:from-slate-950 dark:via-sky-950 dark:to-cyan-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sky-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <ShoppingCart className="h-3.5 w-3.5 text-amber-300" /> Retail Sales
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-200">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">🧾 Sales History</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              {stats.count > 0 ? (
                <>
                  <strong className="text-emerald-300">{stats.count}</strong> sales
                  <span className="opacity-50 mx-1.5">•</span>
                  Total <strong className="text-emerald-300">{showValue(formatPKR(stats.totalAmount))}</strong>
                  {stats.creditCount > 0 && (
                    <>
                      <span className="opacity-50 mx-1.5">•</span>
                      <strong className="text-amber-300">{stats.creditCount}</strong> udhaar
                    </>
                  )}
                </>
              ) : <>Daily transactions, khata tracking, receipts</>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              title="Guide"
            >
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <PrivacyToggle compact />

            {/* ⚙️ Receipt Quick-Settings */}
            <div className="relative">
              <button
                onClick={() => setShowReceiptSettings(!showReceiptSettings)}
                className={[
                  'h-11 px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition border',
                  showReceiptSettings
                    ? 'bg-white text-slate-900 border-white shadow-lg'
                    : 'bg-white/15 hover:bg-white/25 border-white/25 text-white',
                ].join(' ')}
                title="Receipt Settings"
              >
                <Settings2 className={`h-4 w-4 transition-transform ${showReceiptSettings ? 'rotate-90' : ''}`} />
                <span className="hidden sm:inline">Receipt</span>
              </button>

              {showReceiptSettings && (
                <>
                  {/* backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowReceiptSettings(false)} />
                  <div
  className="fixed right-4 top-16 w-72 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden"
  style={{ maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}
>

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-500/10 dark:to-cyan-500/10 border-b-2 border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                        <Printer className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                        Receipt Settings
                      </div>
                      <div className="flex items-center gap-1">
                        {prefsSaved && (
                          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                            <Check className="h-3 w-3" /> Saved
                          </span>
                        )}
                        <button
                          onClick={() => setShowReceiptSettings(false)}
                          className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
                        >
                          <X className="h-3.5 w-3.5 text-slate-500" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Paper Size */}
                      <div>
                        <div className="mb-1.5">
                          <div className="text-xs font-extrabold text-slate-900 dark:text-white">Paper Size</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Thermal printer ki width</div>
                        </div>
                        <div className="flex rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
                          {(['58', '80'] as const).map((w) => (
                            <button
                              key={w}
                              onClick={() => updateReceiptPrefs({ paperWidth: w })}
                              className={[
                                'flex-1 py-2 text-xs font-extrabold tabular-nums transition',
                                receiptPrefs.paperWidth === w
                                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
                              ].join(' ')}
                            >
                              {w}mm
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mode */}
                      <div>
                        <div className="mb-1.5">
                          <div className="text-xs font-extrabold text-slate-900 dark:text-white">Receipt Mode</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Short = sirf items + total</div>
                        </div>
                        <div className="flex rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
                          <button
                            onClick={() => updateReceiptPrefs({ mode: 'short' })}
                            className={[
                              'flex-1 py-2 text-xs font-extrabold inline-flex items-center justify-center gap-1 transition',
                              receiptPrefs.mode === 'short'
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
                            ].join(' ')}
                          >
                            <Minimize2 className="h-3 w-3" /> Short
                          </button>
                          <button
                            onClick={() => updateReceiptPrefs({ mode: 'full' })}
                            className={[
                              'flex-1 py-2 text-xs font-extrabold inline-flex items-center justify-center gap-1 transition',
                              receiptPrefs.mode === 'full'
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
                            ].join(' ')}
                          >
                            <Maximize2 className="h-3 w-3" /> Full
                          </button>
                        </div>
                      </div>

                      {/* Auto Print */}
                      <button
                        onClick={() => updateReceiptPrefs({ autoPrint: !receiptPrefs.autoPrint })}
                        className="w-full flex items-center gap-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 p-2.5 hover:border-sky-300 dark:hover:border-sky-500/40 transition text-left"
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          receiptPrefs.autoPrint ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                          <Zap className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-extrabold text-slate-900 dark:text-white">Auto-Print</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Sale hote hi receipt print</div>
                        </div>
                        <div className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${
                          receiptPrefs.autoPrint ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}>
                          <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                            receiptPrefs.autoPrint ? 'right-0.5' : 'left-0.5'
                          }`} />
                        </div>
                      </button>

                      {/* Logo */}
                      <button
                        onClick={() => updateReceiptPrefs({ showLogo: !receiptPrefs.showLogo })}
                        className="w-full flex items-center gap-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 p-2.5 hover:border-sky-300 dark:hover:border-sky-500/40 transition text-left"
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          receiptPrefs.showLogo ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                          <Printer className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-extrabold text-slate-900 dark:text-white">Logo on Receipt</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Dukaan ka logo receipt pe</div>
                        </div>
                        <div className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${
                          receiptPrefs.showLogo ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}>
                          <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                            receiptPrefs.showLogo ? 'right-0.5' : 'left-0.5'
                          }`} />
                        </div>
                      </button>
                    </div>

                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold text-center">
                        ⚡ Turant save — agli receipt se apply
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handlePrint}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={exportCSV}
              disabled={filteredSales.length === 0}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-40 transition"
            >
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
            <Link to="/pos">
              <Button className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold shadow-2xl">
                <ShoppingCart className="h-4 w-4" /> New Sale
              </Button>
            </Link>
          </div>
        </div>

        {/* Best sale strip */}
        {stats.best && !hideAmounts && (
          <div className="relative mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md px-3 py-2 text-xs font-extrabold transition">
            <Trophy className="h-4 w-4 text-amber-300" />
            <span className="text-white/70">Sab se badi sale:</span>
            <Link to={receiptLink(stats.best.id)} className="text-emerald-300 hover:underline">
              {stats.best.saleNumber}
            </Link>
            <span className="text-emerald-300 tabular-nums">{formatPKR(stats.best.total)}</span>
          </div>
        )}
      </section>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={TrendingUp} label="Aaj ki Sales" value={showValue(formatPKR(summary?.todaySales ?? 0))} sub={`${summary?.todayOrders ?? 0} orders`} tone="emerald" />
        <Kpi icon={Award} label="Aaj ka Profit" value={showValue(formatPKR(summary?.todayProfit ?? 0))} sub="Today's earning" tone="blue" highlight />
        <Kpi icon={CalendarDays} label="Is Mahine" value={showValue(formatPKR(summary?.monthSales ?? 0))} sub="Monthly total" tone="violet" />
        <Kpi
          icon={BookOpen}
          label="Total Udhaar"
          value={showValue(formatPKR(stats.totalCredit))}
          sub={`${stats.creditCount} khata sales`}
          tone="amber"
          onClick={() => setCreditOnly(!creditOnly)}
          active={creditOnly}
        />
      </section>

      {/* ═══ CHARTS ═══ */}
      {!hideAmounts && (
        <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 print:hidden">
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Last 7 Days</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Daily sales trend</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-700 text-white flex items-center justify-center shadow-md">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: any) => formatPKR(Number(v))}
                    contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', backgroundColor: 'rgba(15,23,42,0.95)', color: '#f8fafc' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 700 }}
                  />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Payment Split</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">By method</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            {summary?.paymentBreakdown?.length ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.paymentBreakdown.map((p) => ({
                        name: paymentConfig[p.paymentMethod]?.label || p.paymentMethod,
                        value: p._sum?.total ?? 0,
                      }))}
                      cx="50%" cy="45%" outerRadius={80} innerRadius={45}
                      dataKey="value" labelLine={false}
                      label={(entry: any) => {
                        const total = summary.paymentBreakdown.reduce((s, p) => s + (p._sum?.total ?? 0), 0);
                        return total > 0 ? `${((entry.value / total) * 100).toFixed(0)}%` : '';
                      }}
                    >
                      {summary.paymentBreakdown.map((p) => (
                        <Cell key={p.paymentMethod} fill={paymentConfig[p.paymentMethod]?.hex || '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => formatPKR(Number(v))}
                      contentStyle={{ borderRadius: 12, backgroundColor: 'rgba(15,23,42,0.95)', color: '#f8fafc' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[240px] flex flex-col items-center justify-center gap-2">
                <CreditCard className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-extrabold text-slate-500 dark:text-slate-400">No payment data</p>
              </div>
            )}
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
              placeholder="Sale #, customer, product, barcode... (/ shortcut)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-extrabold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-500/30 transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => setCreditOnly(!creditOnly)}
            className={[
              'h-12 px-4 rounded-2xl border-2 font-extrabold text-sm inline-flex items-center gap-2 transition',
              creditOnly
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-amber-300',
            ].join(' ')}
          >
            <BookOpen className="h-4 w-4" /> Udhaar
            {creditOnly && stats.creditCount > 0 && (
              <span className="px-1.5 rounded bg-amber-600 text-white text-[10px] tabular-nums">{stats.creditCount}</span>
            )}
          </button>
        </div>

        {/* Date range */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 mb-1.5 inline-flex items-center gap-1">
            <CalendarRange className="h-3 w-3" /> Date Range
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {([
              { v: 'today', l: 'Today' },
              { v: 'yesterday', l: 'Yesterday' },
              { v: 'week', l: '7 Days' },
              { v: 'month', l: '30 Days' },
              { v: 'year', l: 'This Year' },
              { v: 'all', l: 'All Time' },
              { v: 'custom', l: '📅 Custom' },
            ] as { v: DateFilter; l: string }[]).map((d) => (
              <button
                key={d.v}
                onClick={() => setDateFilter(d.v)}
                className={[
                  'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition',
                  dateFilter === d.v
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
                ].join(' ')}
              >
                {d.l}
              </button>
            ))}
          </div>
          {dateFilter === 'custom' && (
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 border-2 border-sky-200 dark:border-sky-500/30 p-3">
              <div>
                <label className="text-[10px] uppercase font-extrabold text-sky-700 dark:text-sky-400 mb-1 block">From</label>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                  className="h-10 w-full rounded-lg border-2 border-sky-300 dark:border-sky-500/40 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-sky-700 dark:text-sky-400 mb-1 block">To</label>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-10 w-full rounded-lg border-2 border-sky-300 dark:border-sky-500/40 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition" />
              </div>
            </div>
          )}
        </div>

        {/* Payment methods */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 mb-1.5 block">Payment Method</label>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setPaymentFilter('all')}
              className={[
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition',
                paymentFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
              ].join(' ')}
            >
              All Payments
            </button>
            {Object.entries(paymentConfig).map(([k, cfg]) => (
              <button
                key={k}
                onClick={() => setPaymentFilter(k as PaymentMethod)}
                className={[
                  'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition border-2',
                  paymentFilter === k
                    ? cfg.bg
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700',
                ].join(' ')}
              >
                <cfg.icon className="h-3 w-3" />
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active filter summary */}
        {hasFilters && (
          <div className="rounded-xl bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-500/10 dark:to-cyan-500/10 border-2 border-sky-200 dark:border-sky-500/30 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCell label="Showing" value={`${stats.count} sales`} tone="sky" />
            <SummaryCell label="Total" value={showValue(formatPKR(stats.totalAmount))} tone="slate" />
            <SummaryCell label="Avg Order" value={showValue(formatPKR(stats.avgOrder))} tone="blue" />
            <SummaryCell label="Udhaar" value={showValue(formatPKR(stats.totalCredit))} tone="amber" />
            <button
              onClick={clearFilters}
              className="col-span-2 sm:col-span-4 mt-1 text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 self-start transition"
            >
              <X className="h-3 w-3" /> Filters clear karo
            </button>
          </div>
        )}
      </section>

      {/* ═══ SALES LIST ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden print:border-0 print:rounded-none print:shadow-none">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-sky-500 to-cyan-700 mx-auto flex items-center justify-center shadow-lg shadow-sky-500/40">
              <ShoppingCart className="h-10 w-10 text-white" />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
              {hasFilters ? 'Kuch nahi mila' : 'Abhi koi sale nahi'}
            </h3>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto">
              {hasFilters ? 'Filter change karo ya clear karo' : 'POS se pehli sale karo — 30 second ka kaam'}
            </p>
            <div className="mt-4 flex gap-2 justify-center flex-wrap">
              {hasFilters ? (
                <Button variant="secondary" className="font-extrabold" onClick={clearFilters}>
                  <X className="h-4 w-4" /> Filters clear karo
                </Button>
              ) : (
                <Link to="/pos">
                  <Button className="bg-gradient-to-r from-sky-600 to-cyan-700 font-extrabold">
                    <ShoppingCart className="h-4 w-4" /> POS pe jao
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
            {filteredSales.map((sale) => {
              const PayIcon = paymentConfig[sale.paymentMethod]?.icon || CreditCard;
              const payColor = paymentConfig[sale.paymentMethod]?.color || '#64748b';
              const totalQty = sale.items.reduce((a: number, it: any) => a + Number(it.quantity || 0), 0);
              return (
                <div
                  key={sale.id}
                  className="relative px-4 sm:px-5 py-4 hover:bg-sky-50/40 dark:hover:bg-sky-500/5 transition group"
                >
                  {/* Poori row clickable (receipt pe) — print button iske upar z-index se */}
                  <Link to={receiptLink(sale.id)} className="absolute inset-0 print:hidden" aria-label={`Receipt ${sale.saleNumber}`} />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: payColor + '20' }}>
                        <PayIcon className="h-5 w-5" style={{ color: payColor }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-extrabold text-slate-900 dark:text-white text-sm">{sale.saleNumber}</span>
                          {sale.status === 'VOIDED' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold">VOIDED</span>
                          )}
                          {sale.creditAmount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold inline-flex items-center gap-1">
                              <BookOpen className="h-2.5 w-2.5" /> UDHAAR
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-2 flex-wrap">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[160px]">{sale.customer?.name || 'Walk-in'}</span>
                          {sale.customer?.phone && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600">•</span>
                              <span className="text-slate-500 dark:text-slate-400">{sale.customer.phone}</span>
                            </>
                          )}
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <Package className="h-3 w-3 shrink-0" />
                          <span>{sale.items.length} items • {totalQty.toFixed(0)} qty</span>
                        </div>
                        <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDate(sale.soldAt)}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {sale.items.slice(0, 4).map((it: any) => (
                            <span key={it.id} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 max-w-[180px] truncate inline-flex items-center gap-1">
                              {it.product.barcode && <Barcode className="h-2.5 w-2.5 text-sky-600 dark:text-sky-400" />}
                              {it.product.name} × {it.quantity.toFixed(it.quantity % 1 === 0 ? 0 : 2)}
                            </span>
                          ))}
                          {sale.items.length > 4 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              +{sale.items.length - 4} aur
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl sm:text-2xl font-extrabold text-sky-700 dark:text-sky-400 tabular-nums">
                        {showValue(formatPKR(sale.total))}
                      </div>
                      {sale.changeAmount > 0 && (
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold mt-0.5 tabular-nums">
                          Change: {showValue(formatPKR(sale.changeAmount))}
                        </div>
                      )}
                      {sale.creditAmount > 0 && (
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-extrabold mt-0.5 tabular-nums">
                          Udhaar: {showValue(formatPKR(sale.creditAmount))}
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-end gap-2 print:hidden">
                        {/* 🖨️ Direct print — prefs ke saath, autoprint=1 */}
                        <Link
                          to={receiptLink(sale.id, true)}
                          onClick={(e) => e.stopPropagation()}
                          className="relative z-10 inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-500/20 px-2 py-1 text-[10px] font-extrabold text-slate-600 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-300 transition"
                          title="Seedha print"
                        >
                          <Printer className="h-3 w-3" /> Print
                        </Link>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-sky-600 dark:text-sky-400 group-hover:text-sky-700 dark:group-hover:text-sky-300 transition">
                          <Eye className="h-3 w-3" /> Receipt <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          .overflow-x-auto, .overflow-y-auto, .overflow-hidden, .overflow-auto {
            overflow: visible !important; max-height: none !important; height: auto !important;
          }
          [class*="fixed"] { display: none !important; }
          html, body, #root, #__next { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [class*="rounded-2xl"], [class*="rounded-3xl"] { overflow: visible !important; border-radius: 6px !important; }
          .divide-y-2 > div { page-break-inside: avoid !important; break-inside: avoid !important; border-bottom: 1px solid #e2e8f0 !important; padding: 6px 0 !important; }
          img, .recharts-wrapper { display: none !important; }
          .text-sky-700, [class*="sky-400"] { color: #0284c7 !important; }
          .text-emerald-700, [class*="emerald-400"] { color: #047857 !important; }
          .text-amber-700, [class*="amber-400"] { color: #b45309 !important; }
          .text-rose-700, [class*="rose-400"] { color: #be123c !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SALES TEACHER — "Ye page kya karta hai"
   ═════════════════════════════════════════════════════════════ */
function SalesTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-sky-300 dark:border-sky-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-sky-200 dark:border-sky-500/30 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-500/15 dark:to-cyan-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-sky-900 dark:text-sky-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Sales Page — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Ye tumhari <strong>saari sales ka record</strong> hai — kab kya bika, kisne liya, kitna paisa aya,
            kitna udhaar bacha. POS se sale hoti hai to seedhi yahan aati hai.
          </p>

          <div className="rounded-2xl border-2 border-sky-200 dark:border-sky-500/30 bg-sky-50/60 dark:bg-sky-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>🔒 Privacy Toggle</strong> — password wala icon dabao, saare paise chhup jayenge</TipRow>
            <TipRow><strong>⚙️ Receipt button</strong> — paper size (58/80mm), short/full mode, auto-print, logo — sab yahi se set karo</TipRow>
            <TipRow><strong>🖨️ Row ka Print</strong> — har sale ke paas chhota Print button — seedha thermal pe nikalo</TipRow>
            <TipRow><strong>📅 Date range</strong> — Today, Yesterday, 7 din, 30 din, ya custom period</TipRow>
            <TipRow><strong>💳 Payment filter</strong> — sirf Cash, ya JazzCash, ya Card wali sales</TipRow>
            <TipRow><strong>📖 Udhaar button</strong> — sirf khata wali sales (paise baqi)</TipRow>
            <TipRow><strong>Row pe click</strong> — receipt khul jayegi (print, WhatsApp, share)</TipRow>
            <TipRow><strong>📊 CSV export</strong> — Excel me kholo, accountant ko bhejo</TipRow>
            <TipRow><strong>⌨️ / dabao</strong> — search box pe jump</TipRow>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            💡 <strong>Pro tip:</strong> Roz shaam ko "Today" filter check karo — aaj kitni sale hui, kitna udhaar gaya, kis method se paise aye. 30 second me poori dukaan ka hisaab!
          </div>

          <Button
            className="w-full bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-700 hover:to-cyan-800 font-extrabold shadow-lg shadow-sky-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
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

/* ══════════ HELPERS ══════════ */

function Kpi({ icon: Icon, label, value, sub, tone, highlight, onClick, active }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={[
        'rounded-2xl border-2 p-3 sm:p-4 shadow-sm dark:shadow-black/20 text-left w-full transition-all',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : '',
        active
          ? 'border-amber-500 dark:border-amber-500/60 ring-2 ring-amber-200 dark:ring-amber-500/20 bg-amber-50 dark:bg-amber-500/10'
          : highlight
          ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 border-blue-300 dark:border-blue-500/40'
          : 'bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-slate-200 dark:border-slate-800',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
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

function SummaryCell({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    sky: 'text-sky-700 dark:text-sky-400',
    slate: 'text-slate-900 dark:text-white',
    blue: 'text-blue-700 dark:text-blue-400',
    amber: 'text-amber-700 dark:text-amber-400',
  };
  return (
    <div>
      <div className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">{label}</div>
      <div className={`font-extrabold tabular-nums ${tones[tone]}`}>{value}</div>
    </div>
  );
}
