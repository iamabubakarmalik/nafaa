// src/industries/mobile/pages/MobileSalesPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Smartphone, TrendingUp, Wallet, Search, X, Package, User, Banknote,
  CreditCard, Building2, Zap, Eye, Download, RefreshCw, Award, ArrowRight,
  ShieldCheck, Hash, Palette, Clock, BarChart3, CalendarRange,
  GraduationCap, Printer, CheckCircle2, Wrench, AlertOctagon,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';
import { useAuthStore } from '@core/stores/auth.store';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA MOBILE SALES — FULL BEST v1
   ─────────────────────────────────────────────────────────────
   📱 IMEI/EMI/All Sales tabs • PTA breakdown chart
   🌙 Dark mode complete • 🔒 PrivacyToggle • 🎓 Teacher guide
   🖨️ Print (A4 landscape) • 📊 CSV with IMEI detail rows
   ⌨️ / search • Esc close
   ═════════════════════════════════════════════════════════════ */

const formatDate = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const PTA_LABELS: Record<string, string> = { APPROVED: 'PTA Approved', NON_PTA: 'Non-PTA', PATCH: 'PTA Patched', PENDING: 'PTA Pending', EXEMPT: 'PTA Exempt' };
const PTA_COLORS: Record<string, string> = {
  APPROVED: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
  NON_PTA: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
  PATCH: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
  PENDING: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-500/40',
  EXEMPT: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600',
};
const PTA_HEX: Record<string, string> = { APPROVED: '#10b981', NON_PTA: '#f43f5e', PATCH: '#f59e0b', PENDING: '#3b82f6', EXEMPT: '#64748b' };

const paymentConfig: Record<string, { label: string; icon: any; hex: string }> = {
  CASH: { label: 'Cash', icon: Banknote, hex: '#10b981' },
  CARD: { label: 'Card', icon: CreditCard, hex: '#3b82f6' },
  JAZZCASH: { label: 'JazzCash', icon: Smartphone, hex: '#f97316' },
  EASYPAISA: { label: 'EasyPaisa', icon: Zap, hex: '#22c55e' },
  BANK_TRANSFER: { label: 'Bank', icon: Building2, hex: '#8b5cf6' },
};

type View = 'imei' | 'emi' | 'sales';
type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export default function MobileSalesPage() {
  const hideAmounts = useCostHidden();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<View>('imei');
  const [search, setSearch] = useState('');
  const [ptaFilter, setPtaFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
  const [showTeacher, setShowTeacher] = useState(false);

  const { data: sales = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sales-list'],
    queryFn: () => salesApi.list(),
  });

  const showValue = (v: string) => (hideAmounts ? '••••••' : v);

  const getDateRange = (): [Date, Date] => {
    const now = new Date();
    let start = new Date(); let end = new Date();
    if (dateFilter === 'today') start.setHours(0, 0, 0, 0);
    else if (dateFilter === 'yesterday') { start.setDate(now.getDate() - 1); start.setHours(0, 0, 0, 0); end = new Date(start); end.setHours(23, 59, 59, 999); }
    else if (dateFilter === 'week') start.setDate(now.getDate() - 7);
    else if (dateFilter === 'month') start.setMonth(now.getMonth() - 1);
    else if (dateFilter === 'year') start.setFullYear(now.getFullYear() - 1);
    else if (dateFilter === 'custom') { if (customStart) { start = new Date(customStart); start.setHours(0, 0, 0, 0); } if (customEnd) { end = new Date(customEnd); end.setHours(23, 59, 59, 999); } }
    else if (dateFilter === 'all') start = new Date(0);
    return [start, end];
  };

  const imeiSales = useMemo(() => sales.filter((s) => s.items.some((it: any) => (it.imeis?.length ?? 0) > 0)), [sales]);
  const emiSales = useMemo(() => sales.filter((s) => s.creditAmount > 0 && s.items.some((it: any) => (it.imeis?.length ?? 0) > 0)), [sales]);

  const imeiStats = useMemo(() => {
    let devicesSold = 0, ptaApproved = 0, nonPta = 0, warrantyMonths = 0;
    imeiSales.forEach((s) => s.items.forEach((it: any) => (it.imeis || []).forEach((imei: any) => {
      devicesSold++;
      if (imei.ptaStatus === 'APPROVED') ptaApproved++;
      if (imei.ptaStatus === 'NON_PTA') nonPta++;
      warrantyMonths += imei.warrantyMonths || 0;
    })));
    const revenue = imeiSales.reduce((s, sale) => s + sale.total, 0);
    return { devicesSold, ptaApproved, nonPta, revenue, avgWarranty: devicesSold > 0 ? warrantyMonths / devicesSold : 0 };
  }, [imeiSales]);

  const filteredList = useMemo(() => {
    let list = view === 'imei' ? [...imeiSales] : view === 'emi' ? [...emiSales] : [...sales];
    const [start, end] = getDateRange();
    list = list.filter((s) => { const d = new Date(s.soldAt); return d >= start && d <= end; });
    if (paymentFilter !== 'all') list = list.filter((s) => s.paymentMethod === paymentFilter);
    if (ptaFilter !== 'all') list = list.filter((s) => s.items.some((it: any) => (it.imeis || []).some((imei: any) => imei.ptaStatus === ptaFilter)));
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((s) => s.saleNumber.toLowerCase().includes(q) || s.customer?.name?.toLowerCase().includes(q) || s.customer?.phone?.toLowerCase().includes(q) || s.items.some((it: any) => it.product.name.toLowerCase().includes(q) || (it.imeis || []).some((imei: any) => imei.imei1?.toLowerCase().includes(q) || imei.imei2?.toLowerCase().includes(q))));
    return list.sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, imeiSales, emiSales, view, dateFilter, customStart, customEnd, paymentFilter, ptaFilter, search]);

  const stats = useMemo(() => {
    const totalAmount = filteredList.reduce((s, x) => s + x.total, 0);
    const totalCredit = filteredList.reduce((s, x) => s + x.creditAmount, 0);
    const totalPaid = filteredList.reduce((s, x) => s + x.paidAmount, 0);
    const avgOrder = filteredList.length > 0 ? totalAmount / filteredList.length : 0;
    const creditCount = filteredList.filter((s) => s.creditAmount > 0).length;
    return { totalAmount, totalCredit, totalPaid, avgOrder, count: filteredList.length, creditCount };
  }, [filteredList]);

  const ptaBreakdown = useMemo(() => {
    const counts: Record<string, number> = { APPROVED: 0, NON_PTA: 0, PATCH: 0, PENDING: 0, EXEMPT: 0 };
    imeiSales.forEach((s) => s.items.forEach((it: any) => (it.imeis || []).forEach((imei: any) => { if (imei.ptaStatus && counts[imei.ptaStatus] !== undefined) counts[imei.ptaStatus]++; })));
    return Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => ({ status: k, label: PTA_LABELS[k] || k, count: v }));
  }, [imeiSales]);

  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredList.forEach((s) => { map[s.paymentMethod] = (map[s.paymentMethod] || 0) + s.total; });
    return Object.entries(map).map(([k, v]) => ({ method: k, label: paymentConfig[k]?.label || k, value: v }));
  }, [filteredList]);

  const exportCSV = () => {
    if (filteredList.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Mobile Sales Report — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`View: ${view}  •  Sales: ${filteredList.length}  •  Total: ${stats.totalAmount.toFixed(2)}  •  Devices: ${imeiStats.devicesSold}`],
      [''],
    ];
    const headers = ['Sale #', 'Date', 'Customer', 'Phone', 'Device', 'IMEI 1', 'IMEI 2', 'PTA', 'Warranty(m)', 'Sale Total', 'Paid', 'Credit'];
    const rows: any[] = [];
    filteredList.forEach((s) => {
      const imeiItems = s.items.filter((it: any) => (it.imeis?.length ?? 0) > 0);
      if (imeiItems.length === 0) {
        rows.push([s.saleNumber, new Date(s.soldAt).toLocaleString('en-PK'), s.customer?.name || 'Walk-in', s.customer?.phone || '', s.items.map((it: any) => it.product.name).join('; '), '', '', '', '', s.total.toFixed(2), s.paidAmount.toFixed(2), s.creditAmount.toFixed(2)]);
      } else {
        imeiItems.forEach((it: any) => (it.imeis || []).forEach((imei: any) => {
          rows.push([s.saleNumber, new Date(s.soldAt).toLocaleString('en-PK'), s.customer?.name || 'Walk-in', s.customer?.phone || '', it.product.name, imei.imei1, imei.imei2 || '', PTA_LABELS[imei.ptaStatus] || '', imei.warrantyMonths || 0, s.total.toFixed(2), s.paidAmount.toFixed(2), s.creditAmount.toFixed(2)]);
        }));
      }
    });
    const csv = [...summary, headers, ...rows].map((r) => r.map((c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mobile-sales-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredList.length} sales export ho gaye`);
  };

  const handlePrint = () => window.print();
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape' && showTeacher) setShowTeacher(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  const hasFilters = !!search || dateFilter !== 'month' || paymentFilter !== 'all' || ptaFilter !== 'all';
  const clearFilters = () => { setSearch(''); setDateFilter('month'); setPaymentFilter('all'); setPtaFilter('all'); setCustomStart(''); setCustomEnd(''); };

  return (
    <div className="space-y-4 sm:space-y-5 pb-8 print:space-y-3">
      {showTeacher && <SalesTeacher onClose={() => setShowTeacher(false)} />}

      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-blue-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">📱 {tenantName || 'My Store'} — Mobile Sales Report</h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">{shopName ? `Shop: ${shopName}  •  ` : ''}{filteredList.length} sales • {formatPKR(stats.totalAmount)}</p>
          </div>
          <div className="text-right"><div className="text-[10px] uppercase font-bold text-slate-500">Generated</div><div className="text-xs font-bold text-slate-900">{printDate}</div></div>
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Smartphone className="h-3.5 w-3.5 text-amber-300" /> Mobile Industry
              {shopName && <><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">📇 Device Sales</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-emerald-300">{stats.count}</strong> sales
              <span className="opacity-50 mx-1.5">•</span>
              Total <strong className="text-emerald-300">{showValue(formatPKR(stats.totalAmount))}</strong>
              {stats.creditCount > 0 && <><span className="opacity-50 mx-1.5">•</span><strong className="text-amber-300">{stats.creditCount}</strong> udhaar/EMI</>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button onClick={() => setShowTeacher(true)} className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"><GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span></button>
            <PrivacyToggle compact />
            <button onClick={() => refetch()} disabled={isRefetching} className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"><RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Refresh</span></button>
            <button onClick={handlePrint} className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"><Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span></button>
            <button onClick={exportCSV} disabled={filteredList.length === 0} className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-40 transition"><Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span></button>
            <Link to="/pos"><Button className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold shadow-2xl"><Smartphone className="h-4 w-4" /> New Sale</Button></Link>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap print:hidden">
        <button onClick={() => setView('imei')} className={`px-5 py-3 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 transition ${view === 'imei' ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}><Smartphone className="h-4 w-4" /> IMEI Sales ({imeiSales.length})</button>
        <button onClick={() => setView('emi')} className={`px-5 py-3 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 transition ${view === 'emi' ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}><Wrench className="h-4 w-4" /> EMI Sales ({emiSales.length})</button>
        <button onClick={() => setView('sales')} className={`px-5 py-3 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 transition ${view === 'sales' ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}><Package className="h-4 w-4" /> All Sales ({sales.length})</button>
      </div>

      {/* KPIs */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi label="Devices Sold" value={String(imeiStats.devicesSold)} sub={`${imeiSales.length} sales`} icon={Smartphone} tone="blue" />
        <Kpi label="PTA Approved" value={String(imeiStats.ptaApproved)} sub={`${imeiStats.nonPta} non-PTA`} icon={ShieldCheck} tone="emerald" alert={imeiStats.nonPta > 0} />
        <Kpi label="Avg Warranty" value={`${imeiStats.avgWarranty.toFixed(1)}m`} sub="Per device" icon={Award} tone="violet" />
        <Kpi label="Device Revenue" value={showValue(formatPKR(imeiStats.revenue))} sub="From IMEI sales" icon={Wallet} tone="amber" />
      </section>

      {/* Charts */}
      {!hideAmounts && (
        <section className="grid lg:grid-cols-[1.4fr_1fr] gap-4 print:hidden">
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-5">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="text-lg font-extrabold text-slate-900 dark:text-white">PTA Status Breakdown</h3><p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Devices by compliance</p></div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center shadow-md"><BarChart3 className="h-5 w-5" /></div>
            </div>
            {ptaBreakdown.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2"><ShieldCheck className="h-10 w-10 text-slate-300 dark:text-slate-600" /><p className="text-sm font-extrabold text-slate-500 dark:text-slate-400">No IMEI data yet</p></div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ptaBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 12, backgroundColor: 'rgba(15,23,42,0.95)', color: '#f8fafc', border: '2px solid #1e293b' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {ptaBreakdown.map((p) => <Cell key={p.status} fill={PTA_HEX[p.status] || '#3b82f6'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-5">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Payment Split</h3><p className="text-xs text-slate-500 dark:text-slate-400 font-bold">By method</p></div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md"><CreditCard className="h-5 w-5" /></div>
            </div>
            {paymentBreakdown.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2"><CreditCard className="h-10 w-10 text-slate-300 dark:text-slate-600" /><p className="text-sm font-extrabold text-slate-500 dark:text-slate-400">No payment data</p></div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentBreakdown} cx="50%" cy="45%" outerRadius={75} innerRadius={42} dataKey="value" labelLine={false}
                      label={(e: any) => { const t = paymentBreakdown.reduce((s, p) => s + p.value, 0); return t > 0 ? `${((e.value / t) * 100).toFixed(0)}%` : ''; }}>
                      {paymentBreakdown.map((p) => <Cell key={p.method} fill={paymentConfig[p.method]?.hex || '#64748b'} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12, backgroundColor: 'rgba(15,23,42,0.95)', color: '#f8fafc' }} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Toolbar */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-4 space-y-3 print:hidden">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="IMEI, customer, device... (/ shortcut)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-extrabold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 transition" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"><X className="h-4 w-4 text-slate-400" /></button>}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 mb-1.5 inline-flex items-center gap-1"><CalendarRange className="h-3 w-3" /> Date Range</label>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {([{ v: 'today', l: 'Today' }, { v: 'yesterday', l: 'Yesterday' }, { v: 'week', l: '7 Days' }, { v: 'month', l: '30 Days' }, { v: 'year', l: 'This Year' }, { v: 'all', l: 'All Time' }, { v: 'custom', l: '📅 Custom' }] as { v: DateFilter; l: string }[]).map((d) => (
              <button key={d.v} onClick={() => setDateFilter(d.v)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${dateFilter === d.v ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{d.l}</button>
            ))}
          </div>
          {dateFilter === 'custom' && (
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-3">
              <div><label className="text-[10px] uppercase font-extrabold text-blue-700 dark:text-blue-400 mb-1 block">From</label><input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-10 w-full rounded-lg border-2 border-blue-300 dark:border-blue-500/40 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" /></div>
              <div><label className="text-[10px] uppercase font-extrabold text-blue-700 dark:text-blue-400 mb-1 block">To</label><input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-10 w-full rounded-lg border-2 border-blue-300 dark:border-blue-500/40 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" /></div>
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 mb-1.5 block">PTA Status</label>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setPtaFilter('all')} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${ptaFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>All PTA</button>
            {Object.entries(PTA_LABELS).map(([k, l]) => (
              <button key={k} onClick={() => setPtaFilter(k)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 border-2 transition ${ptaFilter === k ? PTA_COLORS[k] : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}><ShieldCheck className="h-3 w-3" />{l}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 mb-1.5 block">Payment Method</label>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setPaymentFilter('all')} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${paymentFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>All</button>
            {Object.entries(paymentConfig).map(([k, cfg]) => (
              <button key={k} onClick={() => setPaymentFilter(k as PaymentMethod)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition ${paymentFilter === k ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}><cfg.icon className="h-3 w-3" />{cfg.label}</button>
            ))}
          </div>
        </div>

        {hasFilters && (
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCell label="Showing" value={`${stats.count} sales`} tone="blue" />
            <SummaryCell label="Total" value={showValue(formatPKR(stats.totalAmount))} tone="slate" />
            <SummaryCell label="Avg Order" value={showValue(formatPKR(stats.avgOrder))} tone="violet" />
            <SummaryCell label="Udhaar" value={showValue(formatPKR(stats.totalCredit))} tone="amber" />
            <button onClick={clearFilters} className="col-span-2 sm:col-span-4 mt-1 text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 self-start transition"><X className="h-3 w-3" /> Filters clear karo</button>
          </div>
        )}
      </section>

      {/* List */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden print:border-0 print:rounded-none print:shadow-none">
        {isLoading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}</div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-700 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/40"><Smartphone className="h-10 w-10 text-white" /></div>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">{hasFilters ? 'Kuch nahi mila' : 'Abhi koi sale nahi'}</h3>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto">{hasFilters ? 'Filter change karo ya clear karo' : 'POS se pehli device sale karo'}</p>
            <div className="mt-4 flex gap-2 justify-center flex-wrap">
              {hasFilters ? <Button variant="secondary" className="font-extrabold" onClick={clearFilters}><X className="h-4 w-4" /> Filters clear karo</Button> : <Link to="/pos"><Button className="bg-gradient-to-r from-blue-600 to-indigo-700 font-extrabold"><Smartphone className="h-4 w-4" /> POS pe jao</Button></Link>}
            </div>
          </div>
        ) : (
          <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
            {filteredList.map((sale) => {
              const imeiItems = sale.items.filter((it: any) => (it.imeis?.length ?? 0) > 0);
              const totalImeis = imeiItems.reduce((s: number, it: any) => s + (it.imeis?.length ?? 0), 0);
              const PayIcon = paymentConfig[sale.paymentMethod]?.icon || CreditCard;
              return (
                <Link key={sale.id} to={`/sales/${sale.id}/receipt`} className="block px-4 sm:px-5 py-4 hover:bg-blue-50/40 dark:hover:bg-blue-500/5 transition group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0"><Smartphone className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-extrabold text-slate-900 dark:text-white text-sm">{sale.saleNumber}</span>
                          {sale.status === 'VOIDED' && <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold">VOIDED</span>}
                          {totalImeis > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold inline-flex items-center gap-1"><Hash className="h-2.5 w-2.5" />{totalImeis} device{totalImeis !== 1 ? 's' : ''}</span>}
                          {sale.creditAmount > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold inline-flex items-center gap-1"><Wrench className="h-2.5 w-2.5" />EMI/Udhaar</span>}
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-2 flex-wrap">
                          <User className="h-3 w-3" />{sale.customer?.name || 'Walk-in'}{sale.customer?.phone && <><span>•</span><span>{sale.customer.phone}</span></>}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{formatDate(sale.soldAt)}</div>

                        {imeiItems.map((it: any) => (
                          <div key={it.id} className="mt-2 pl-3 border-l-2 border-blue-200 dark:border-blue-500/30 space-y-1">
                            <div className="font-extrabold text-sm text-slate-900 dark:text-white">{it.product.name}</div>
                            {(it.imeis || []).map((imei: any) => (
                              <div key={imei.id} className="flex items-center gap-2 flex-wrap text-[10px]">
                                <span className="font-mono font-extrabold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">IMEI: {imei.imei1}</span>
                                {imei.ptaStatus && <span className={`px-1.5 py-0.5 rounded border-2 font-extrabold uppercase ${PTA_COLORS[imei.ptaStatus]}`}><ShieldCheck className="h-2.5 w-2.5 inline mr-0.5" />{PTA_LABELS[imei.ptaStatus]}</span>}
                                {imei.warrantyMonths > 0 && <span className="text-teal-700 dark:text-teal-400 font-bold inline-flex items-center gap-0.5"><Award className="h-2.5 w-2.5" />{imei.warrantyMonths}m</span>}
                                {imei.color && <span className="text-violet-700 dark:text-violet-400 font-bold inline-flex items-center gap-0.5"><Palette className="h-2.5 w-2.5" />{imei.color}</span>}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl sm:text-2xl font-extrabold text-blue-700 dark:text-blue-400 tabular-nums">{showValue(formatPKR(sale.total))}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 inline-flex items-center justify-end gap-1 mt-0.5"><PayIcon className="h-2.5 w-2.5" />{paymentConfig[sale.paymentMethod]?.label}</div>
                      {sale.creditAmount > 0 && <div className="text-[10px] text-amber-700 dark:text-amber-400 font-extrabold mt-0.5">Balance: {showValue(formatPKR(sale.creditAmount))}</div>}
                      <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition"><Eye className="h-3 w-3" /> Invoice <ArrowRight className="h-3 w-3" /></div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          html, body { background: white !important; color: #0f172a !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [data-sonner-toaster], [data-sonner-toast] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

function SalesTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-blue-200 dark:border-blue-500/30 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/15 dark:to-indigo-500/15 flex items-center justify-between sticky top-0">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Mobile Sales — Guide</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center"><X className="h-4 w-4 text-slate-600 dark:text-slate-300" /></button>
        </div>
        <div className="p-5 space-y-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <Tip><strong>IMEI Sales tab</strong> — har phone jo IMEI ke saath bika, PTA status + warranty ke saath</Tip>
          <Tip><strong>EMI Sales tab</strong> — sirf udhaar/installment wali device sales</Tip>
          <Tip><strong>PTA chart</strong> — Non-PTA zyada ho tou compliance risk hai, dikhta hai</Tip>
          <Tip><strong>CSV export</strong> — har IMEI apni line par, accountant ko de sakte ho</Tip>
          <Tip>Row pe click → receipt khulti hai (print, WhatsApp)</Tip>
          <Button className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-700 h-11" onClick={onClose}><CheckCircle2 className="h-4 w-4" /> Samajh Gaya!</Button>
        </div>
      </div>
    </div>
  );
}
function Tip({ children }: { children: React.ReactNode }) {
  return <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>{children}</span></div>;
}

function Kpi({ icon: Icon, label, value, sub, tone, alert }: any) {
  const tones: Record<string, string> = { blue: 'from-blue-500 to-indigo-700 shadow-blue-500/40', emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40', violet: 'from-violet-500 to-purple-600 shadow-violet-500/40', amber: 'from-amber-500 to-orange-600 shadow-amber-500/40' };
  return (
    <div className={`rounded-2xl border-2 p-3 sm:p-4 shadow-sm dark:shadow-black/20 bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm ${alert ? 'border-rose-300 dark:border-rose-500/40' : 'border-slate-200 dark:border-slate-800'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}
function SummaryCell({ label, value, tone }: any) {
  const tones: Record<string, string> = { blue: 'text-blue-700 dark:text-blue-400', slate: 'text-slate-900 dark:text-white', violet: 'text-violet-700 dark:text-violet-400', amber: 'text-amber-700 dark:text-amber-400' };
  return <div><div className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">{label}</div><div className={`font-extrabold tabular-nums ${tones[tone]}`}>{value}</div></div>;
}
