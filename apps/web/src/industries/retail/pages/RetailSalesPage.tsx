import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp, CalendarDays, ShoppingCart, Search, X, Package, User,
  Banknote, CreditCard, Smartphone, Building2, Zap,
  Eye, Download, RefreshCw, Award, ArrowRight, BookOpen, Barcode, Clock,
  BarChart3, Lock, Unlock, EyeOff, Shield, CalendarRange,
} from 'lucide-react';
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useSalesPrivacy } from '@modules/sales/sales/hooks/useSalesPrivacy';
import { SalesPrivacyModal } from '@modules/sales/sales/components/SalesPrivacyModal';
import { HiddenAmount } from '@modules/sales/sales/components/HiddenAmount';
import { toast } from 'sonner';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const paymentConfig: Record<string, { label: string; icon: any; color: string; bg: string; hex: string }> = {
  CASH:          { label: 'Cash',      icon: Banknote,   color: '#16a34a', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', hex: '#10b981' },
  CARD:          { label: 'Card',      icon: CreditCard, color: '#2563eb', bg: 'bg-blue-50 text-blue-700 border-blue-200',           hex: '#3b82f6' },
  JAZZCASH:      { label: 'JazzCash',  icon: Smartphone, color: '#f97316', bg: 'bg-orange-50 text-orange-700 border-orange-200',     hex: '#f97316' },
  EASYPAISA:     { label: 'EasyPaisa', icon: Zap,        color: '#22c55e', bg: 'bg-green-50 text-green-700 border-green-200',        hex: '#22c55e' },
  BANK_TRANSFER: { label: 'Bank',      icon: Building2,  color: '#7c3aed', bg: 'bg-violet-50 text-violet-700 border-violet-200',     hex: '#8b5cf6' },
};

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export default function RetailSalesPage() {
  const privacy = useSalesPrivacy();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
  const [creditOnly, setCreditOnly] = useState(false);
  const [privacyModal, setPrivacyModal] = useState<'unlock' | 'setup' | 'disable' | null>(null);

  useEffect(() => {
    if (privacy.isLocked && !privacyModal) setPrivacyModal('unlock');
  }, [privacy.isLocked, privacyModal]);

  const { data: sales = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sales-list'],
    queryFn: () => salesApi.list(),
    enabled: !privacy.isLocked,
  });

  const { data: summary } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: () => salesApi.summary(),
    enabled: !privacy.isLocked,
  });

  const hideAmounts = privacy.hideStats;
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
    const avgOrder = filteredSales.length > 0 ? totalAmount / filteredSales.length : 0;
    const creditCount = filteredSales.filter((s) => s.creditAmount > 0).length;
    return { totalAmount, totalCredit, avgOrder, count: filteredSales.length, creditCount };
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
    const headers = ['Sale #', 'Date', 'Customer', 'Phone', 'Items', 'Qty', 'Payment', 'Subtotal', 'Discount', 'Total', 'Paid', 'Credit'];
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
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retail-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredSales.length} sales export ho gaye`);
  };

  if (privacy.isLocked) {
    return (
      <>
        {privacyModal && <SalesPrivacyModal mode={privacyModal} onClose={() => setPrivacyModal(null)} />}
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="max-w-md w-full text-center">
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-sky-600 to-cyan-700 mx-auto flex items-center justify-center shadow-xl shadow-sky-500/30">
              <Lock className="h-12 w-12 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-slate-900">🔒 Sales Locked</h2>
            <p className="mt-2 text-slate-600 font-semibold">Sales data password protected hai.</p>
            <Button size="lg" className="mt-6 bg-gradient-to-r from-sky-600 to-cyan-700" onClick={() => setPrivacyModal('unlock')}>
              <Unlock className="h-5 w-5" /> Unlock with Password
            </Button>
          </div>
        </div>
      </>
    );
  }

  const hasFilters = !!search || dateFilter !== 'today' || paymentFilter !== 'all' || creditOnly;

  return (
    <>
      {privacyModal && <SalesPrivacyModal mode={privacyModal} onClose={() => setPrivacyModal(null)} />}

      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 text-white p-6 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <ShoppingCart className="h-3.5 w-3.5 text-amber-300" /> Retail Sales
                {privacy.isEnabled && (
                  <>
                    <span className="text-white/40">•</span>
                    <Shield className="h-3 w-3 text-emerald-300" />
                    <span className="text-emerald-300">Protected</span>
                  </>
                )}
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🧾 Sales History</h1>
              <p className="mt-2 text-sm text-white/80">
                {stats.count > 0 ? (
                  <>
                    {stats.count} sales • Total <strong className="text-emerald-300">{showValue(formatPKR(stats.totalAmount))}</strong>
                    {stats.creditCount > 0 && <> • {stats.creditCount} udhaar</>}
                  </>
                ) : <>Daily transactions, khata tracking, quick receipts</>}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={privacy.toggleHideStats}
                className={[
                  'inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold backdrop-blur border transition',
                  hideAmounts ? 'bg-amber-500/30 border-amber-300/40' : 'bg-white/10 border-white/20 hover:bg-white/20',
                ].join(' ')}
              >
                {hideAmounts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="hidden sm:inline">{hideAmounts ? 'Show' : 'Hide'}</span>
              </button>
              {privacy.isEnabled ? (
                <>
                  <button onClick={privacy.lock} className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2.5 text-sm font-bold border border-white/20">
                    <Lock className="h-4 w-4" /><span className="hidden sm:inline">Lock</span>
                  </button>
                  <button onClick={() => setPrivacyModal('disable')} className="inline-flex items-center gap-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 px-3 py-2.5 text-sm font-bold border border-rose-300/30">
                    <Shield className="h-4 w-4" /><span className="hidden sm:inline">Disable</span>
                  </button>
                </>
              ) : (
                <button onClick={() => setPrivacyModal('setup')} className="inline-flex items-center gap-2 rounded-xl bg-sky-500/30 hover:bg-sky-500/50 px-3 py-2.5 text-sm font-bold border border-sky-300/40">
                  <Shield className="h-4 w-4" /><span className="hidden sm:inline">Enable Privacy</span>
                </button>
              )}
              <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold border border-white/20 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <Link to="/pos">
                <Button className="bg-white text-slate-900 hover:bg-slate-100">
                  <ShoppingCart className="h-4 w-4" /> New Sale
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <Kpi icon={TrendingUp} label="Aaj ki Sales" value={showValue(formatPKR(summary?.todaySales ?? 0))} sub={`${summary?.todayOrders ?? 0} orders`} tone="emerald" />
          <Kpi icon={Award} label="Aaj ka Profit" value={showValue(formatPKR(summary?.todayProfit ?? 0))} sub="Today's earning" tone="blue" highlight />
          <Kpi icon={CalendarDays} label="Is Mahine" value={showValue(formatPKR(summary?.monthSales ?? 0))} sub="Monthly total" tone="violet" />
          <Kpi icon={BookOpen} label="Total Udhaar" value={showValue(formatPKR(stats.totalCredit))} sub={`${stats.creditCount} khata sales`} tone="amber" />
        </section>

        {!hideAmounts && (
          <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
            <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Last 7 Days</h3>
                  <p className="text-xs text-slate-500 font-bold">Daily sales trend</p>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                    <Area type="monotone" dataKey="sales" name="Sales" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#salesGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Payment Split</h3>
                  <p className="text-xs text-slate-500 font-bold">By method</p>
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
                      <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[240px] flex flex-col items-center justify-center gap-2">
                  <CreditCard className="h-10 w-10 text-slate-300" />
                  <p className="text-sm font-extrabold text-slate-500">No payment data</p>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sale #, customer, product, barcode..."
                className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
            <button
              onClick={() => setCreditOnly(!creditOnly)}
              className={[
                'h-12 px-4 rounded-2xl border-2 font-extrabold text-sm inline-flex items-center gap-2 transition',
                creditOnly ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300',
              ].join(' ')}
            >
              <BookOpen className="h-4 w-4" /> Udhaar
            </button>
            {filteredSales.length > 0 && (
              <button onClick={exportCSV} className="h-12 px-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-sky-300 font-extrabold text-sm text-slate-700 inline-flex items-center gap-2 transition">
                <Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span>
              </button>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 inline-flex items-center gap-1">
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
                    dateFilter === d.v ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  ].join(' ')}
                >
                  {d.l}
                </button>
              ))}
            </div>
            {dateFilter === 'custom' && (
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-sky-50 border-2 border-sky-200 p-3">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-sky-700 mb-1 block">From</label>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                    className="h-10 w-full rounded-lg border-2 border-sky-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-sky-500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-sky-700 mb-1 block">To</label>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                    className="h-10 w-full rounded-lg border-2 border-sky-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-sky-500" />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 block">Payment Method</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setPaymentFilter('all')}
                className={[
                  'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition',
                  paymentFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
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
                    paymentFilter === k ? cfg.bg : 'bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200',
                  ].join(' ')}
                >
                  <cfg.icon className="h-3 w-3" style={{ color: paymentFilter === k ? cfg.color : undefined }} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {hasFilters && (
            <div className="rounded-xl bg-gradient-to-br from-sky-50 to-cyan-50 border-2 border-sky-200 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCell label="Showing" value={`${stats.count} sales`} tone="sky" />
              <SummaryCell label="Total" value={showValue(formatPKR(stats.totalAmount))} tone="slate" />
              <SummaryCell label="Avg Order" value={showValue(formatPKR(stats.avgOrder))} tone="blue" />
              <SummaryCell label="Udhaar" value={showValue(formatPKR(stats.totalCredit))} tone="amber" />
              <button
                onClick={() => { setSearch(''); setDateFilter('today'); setPaymentFilter('all'); setCreditOnly(false); setCustomStart(''); setCustomEnd(''); }}
                className="col-span-2 sm:col-span-4 mt-1 text-xs font-extrabold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 self-start"
              >
                <X className="h-3 w-3" /> Filters clear karo
              </button>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />)}
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="p-16 text-center">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 mx-auto flex items-center justify-center">
                <ShoppingCart className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-slate-900">
                {hasFilters ? 'Kuch nahi mila' : 'Abhi koi sale nahi'}
              </h3>
              <p className="mt-1 text-sm text-slate-500 font-semibold">
                {hasFilters ? 'Filter change karo ya clear karo' : 'POS se pehli sale karo'}
              </p>
              {!hasFilters && (
                <Link to="/pos">
                  <Button className="mt-4 bg-gradient-to-r from-sky-600 to-cyan-700">
                    <ShoppingCart className="h-4 w-4" /> POS pe jao
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y-2 divide-slate-100">
              {filteredSales.map((sale) => {
                const PayIcon = paymentConfig[sale.paymentMethod]?.icon || CreditCard;
                const payColor = paymentConfig[sale.paymentMethod]?.color || '#64748b';
                const totalQty = sale.items.reduce((a: number, it: any) => a + Number(it.quantity || 0), 0);
                return (
                  <Link key={sale.id} to={`/sales/${sale.id}/receipt`} className="block px-5 py-4 hover:bg-sky-50/40 transition group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: payColor + '20' }}>
                          <PayIcon className="h-5 w-5" style={{ color: payColor }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-extrabold text-slate-900 text-sm">{sale.saleNumber}</span>
                            {sale.status === 'VOIDED' && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">VOIDED</span>
                            )}
                            {sale.creditAmount > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold inline-flex items-center gap-1">
                                <BookOpen className="h-2.5 w-2.5" /> UDHAAR
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-slate-600 font-semibold flex items-center gap-2 flex-wrap">
                            <User className="h-3 w-3" />
                            {sale.customer?.name || 'Walk-in'}
                            {sale.customer?.phone && (<><span className="text-slate-300">•</span><span>{sale.customer.phone}</span></>)}
                            <span className="text-slate-300">•</span>
                            <Package className="h-3 w-3" />
                            {sale.items.length} items • {totalQty.toFixed(0)} qty
                          </div>
                          <div className="mt-1 text-[10px] text-slate-500 inline-flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDate(sale.soldAt)}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {sale.items.slice(0, 4).map((it: any) => (
                              <span key={it.id} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 max-w-[180px] truncate inline-flex items-center gap-1">
                                {it.product.barcode && <Barcode className="h-2.5 w-2.5 text-sky-600" />}
                                {it.product.name} × {it.quantity.toFixed(it.quantity % 1 === 0 ? 0 : 2)}
                              </span>
                            ))}
                            {sale.items.length > 4 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                                +{sale.items.length - 4} aur
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-extrabold text-sky-700 tabular-nums">
                          <HiddenAmount value={formatPKR(sale.total)} hidden={hideAmounts} />
                        </div>
                        {sale.changeAmount > 0 && (
                          <div className="text-[10px] text-emerald-700 font-extrabold mt-0.5">
                            Change: <HiddenAmount value={formatPKR(sale.changeAmount)} hidden={hideAmounts} />
                          </div>
                        )}
                        {sale.creditAmount > 0 && (
                          <div className="text-[10px] text-amber-700 font-extrabold mt-0.5">
                            Udhaar: <HiddenAmount value={formatPKR(sale.creditAmount)} hidden={hideAmounts} />
                          </div>
                        )}
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-sky-600 group-hover:text-sky-700">
                          <Eye className="h-3 w-3" /> Receipt <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, highlight }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
  };
  return (
    <div className={[
      'rounded-2xl border-2 p-4 shadow-sm hover:shadow-md transition',
      highlight ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300' : 'bg-white border-slate-200',
    ].join(' ')}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SummaryCell({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    sky: 'text-sky-700', slate: 'text-slate-900', blue: 'text-blue-700', amber: 'text-amber-700',
  };
  return (
    <div>
      <div className="text-[10px] uppercase font-extrabold text-slate-600">{label}</div>
      <div className={`font-extrabold tabular-nums ${tones[tone]}`}>{value}</div>
    </div>
  );
}
