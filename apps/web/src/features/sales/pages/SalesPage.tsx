import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Receipt, TrendingUp, Wallet, CalendarDays, ArrowUpRight, Wrench,
  Search, Filter, X, Calendar, Package, User, Phone,
  Banknote, CreditCard, Smartphone, Building2, Zap,
  CheckCircle2, XCircle, AlertTriangle, ShoppingCart,
  Sparkles, BookOpen, Eye, Download, RefreshCw,
  TrendingDown, DollarSign, Award, Layers, Scissors,
  ArrowRight, Activity, BarChart3, Crown, Star,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { salesApi, type PaymentMethod } from '@/api/sales.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { Button } from '@/components/ui/Button';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatDateShort = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const formatQty = (qty: number) =>
  qty.toFixed(qty % 1 === 0 ? 0 : 2);

const paymentConfig: Record<string, { label: string; icon: any; color: string; bg: string; hex: string }> = {
  CASH: { label: 'Cash', icon: Banknote, color: '#16a34a', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', hex: '#10b981' },
  CARD: { label: 'Card', icon: CreditCard, color: '#2563eb', bg: 'bg-blue-50 text-blue-700 border-blue-200', hex: '#3b82f6' },
  JAZZCASH: { label: 'JazzCash', icon: Smartphone, color: '#f97316', bg: 'bg-orange-50 text-orange-700 border-orange-200', hex: '#f97316' },
  EASYPAISA: { label: 'EasyPaisa', icon: Zap, color: '#22c55e', bg: 'bg-green-50 text-green-700 border-green-200', hex: '#22c55e' },
  BANK_TRANSFER: { label: 'Bank', icon: Building2, color: '#7c3aed', bg: 'bg-violet-50 text-violet-700 border-violet-200', hex: '#8b5cf6' },
};

type DateFilter = 'all' | 'today' | 'week' | 'month';
type StatusFilter = 'all' | 'COMPLETED' | 'VOIDED' | 'PARTIALLY_RETURNED' | 'FULLY_RETURNED';

export default function SalesPage() {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: sales = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sales-list'],
    queryFn: () => salesApi.list(),
  });

  const { data: summary } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: () => salesApi.summary(),
  });

  const filteredSales = useMemo(() => {
    let result = [...sales];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (s) =>
          s.saleNumber.toLowerCase().includes(q) ||
          s.customer?.name.toLowerCase().includes(q) ||
          s.customer?.phone?.toLowerCase().includes(q) ||
          s.items.some((it) => it.product.name.toLowerCase().includes(q)),
      );
    }
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      if (dateFilter === 'today') cutoff.setHours(0, 0, 0, 0);
      else if (dateFilter === 'week') cutoff.setDate(now.getDate() - 7);
      else if (dateFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
      result = result.filter((s) => new Date(s.soldAt) >= cutoff);
    }
    if (paymentFilter !== 'all') result = result.filter((s) => s.paymentMethod === paymentFilter);
    if (statusFilter !== 'all') result = result.filter((s) => s.status === statusFilter);
    return result;
  }, [sales, search, dateFilter, paymentFilter, statusFilter]);

  const filteredStats = useMemo(() => {
    const totalAmount = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalPaid = filteredSales.reduce((sum, s) => sum + s.paidAmount, 0);
    const totalCredit = filteredSales.reduce((sum, s) => sum + s.creditAmount, 0);
    const totalDiscount = filteredSales.reduce((sum, s) => sum + s.discount, 0);
    const avgOrderValue = filteredSales.length > 0 ? totalAmount / filteredSales.length : 0;
    return { totalAmount, totalPaid, totalCredit, totalDiscount, avgOrderValue, count: filteredSales.length };
  }, [filteredSales]);

  // 7-day sales chart data
  const last7DaysData = useMemo(() => {
    const buckets: Record<string, { date: string; label: string; sales: number; orders: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-PK', { weekday: 'short' });
      buckets[key] = { date: key, label, sales: 0, orders: 0 };
    }
    for (const s of sales) {
      const key = new Date(s.soldAt).toISOString().slice(0, 10);
      if (buckets[key]) {
        buckets[key].sales += s.total;
        buckets[key].orders += 1;
      }
    }
    return Object.values(buckets);
  }, [sales]);

  const hasFilters = search || dateFilter !== 'all' || paymentFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setDateFilter('all');
    setPaymentFilter('all');
    setStatusFilter('all');
  };

  const exportCSV = () => {
    if (filteredSales.length === 0) return;
    const headers = ['Sale #', 'Date', 'Customer', 'Phone', 'Items', 'Payment', 'Subtotal', 'Discount', 'Total', 'Paid', 'Credit', 'Status'];
    const rows = filteredSales.map((s) => [
      s.saleNumber,
      new Date(s.soldAt).toLocaleString('en-PK'),
      s.customer?.name || 'Walk-in',
      s.customer?.phone || '',
      s.items.length,
      paymentConfig[s.paymentMethod]?.label || s.paymentMethod,
      s.subtotal.toFixed(2),
      s.discount.toFixed(2),
      s.total.toFixed(2),
      s.paidAmount.toFixed(2),
      s.creditAmount.toFixed(2),
      s.status || 'COMPLETED',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* ═══ HERO HEADER ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Sales Intelligence
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Sales History</h2>
            <p className="mt-2 text-sm text-white/80">
              Complete sales overview — search, filter, print, share via WhatsApp
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 backdrop-blur"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link to="/pos">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <ShoppingCart className="h-4 w-4" />
                New Sale
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ STATS CARDS ═══ */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Aaj ki Sales"
          value={formatPKR(summary?.todaySales ?? 0)}
          sub={`${summary?.todayOrders ?? 0} orders`}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          label="Aaj ka Profit"
          value={formatPKR(summary?.todayProfit ?? 0)}
          sub="Today's earning"
          icon={Award}
          color="blue"
          isHighlight
        />
        <StatCard
          label="Is Mahine ki Sales"
          value={formatPKR(summary?.monthSales ?? 0)}
          sub="Monthly total"
          icon={CalendarDays}
          color="violet"
        />
        <StatCard
          label="Total Revenue"
          value={formatPKR(summary?.totalSales ?? 0)}
          sub={`${summary?.totalOrders ?? 0} total orders`}
          icon={Wallet}
          color="amber"
        />
      </section>

      {/* ═══ CHARTS ROW ═══ */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* 7-Day Sales Chart */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Last 7 Days</h3>
              <p className="text-xs text-slate-500">Daily sales pattern</p>
            </div>
            <BarChart3 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7DaysData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: any) => formatPKR(Number(value))}
                  contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }}
                />
                <Bar dataKey="sales" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Pie */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Payment Methods</h3>
              <p className="text-xs text-slate-500">Breakdown by type</p>
            </div>
            <CreditCard className="h-5 w-5 text-blue-500" />
          </div>
          {summary?.paymentBreakdown?.length ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.paymentBreakdown.map((p) => ({
                      name: paymentConfig[p.paymentMethod]?.label || p.paymentMethod,
                      value: p._sum.total ?? 0,
                      method: p.paymentMethod,
                    }))}
                    cx="50%"
                    cy="45%"
                    outerRadius={80}
                    innerRadius={40}
                    dataKey="value"
                    label={(entry: any) => {
                      const total = summary.paymentBreakdown.reduce((s, p) => s + (p._sum.total ?? 0), 0);
                      const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
                      return `${pct}%`;
                    }}
                    labelLine={false}
                  >
                    {summary.paymentBreakdown.map((p) => (
                      <Cell key={p.paymentMethod} fill={paymentConfig[p.paymentMethod]?.hex || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">
              No payment data yet
            </div>
          )}
        </div>
      </section>

      {/* ═══ SEARCH + FILTERS ═══ */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              placeholder="Search sale #, customer, phone, product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`h-11 px-4 rounded-xl border-2 font-bold text-sm inline-flex items-center gap-2 transition ${
              showFilters || hasFilters
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasFilters && (
              <span className="h-5 w-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                !
              </span>
            )}
          </button>

          {filteredSales.length > 0 && (
            <button
              onClick={exportCSV}
              className="h-11 px-4 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 font-bold text-sm text-slate-700 inline-flex items-center gap-2 transition"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
        </div>

        {showFilters && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">Date Range</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { v: 'all' as DateFilter, l: 'All Time' },
                  { v: 'today' as DateFilter, l: 'Today' },
                  { v: 'week' as DateFilter, l: 'Last 7 Days' },
                  { v: 'month' as DateFilter, l: 'Last 30 Days' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setDateFilter(opt.v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      dateFilter === opt.v
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">Payment Method</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setPaymentFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    paymentFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  All
                </button>
                {Object.entries(paymentConfig).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const active = paymentFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setPaymentFilter(key as PaymentMethod)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition ${
                        active ? cfg.bg + ' border-2' : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="h-3 w-3" style={{ color: active ? cfg.color : undefined }} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">Status</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { v: 'all' as StatusFilter, l: 'All' },
                  { v: 'COMPLETED' as StatusFilter, l: 'Completed' },
                  { v: 'VOIDED' as StatusFilter, l: 'Voided' },
                  { v: 'PARTIALLY_RETURNED' as StatusFilter, l: 'Partial Return' },
                  { v: 'FULLY_RETURNED' as StatusFilter, l: 'Fully Returned' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setStatusFilter(opt.v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      statusFilter === opt.v
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {hasFilters && (
              <button onClick={clearFilters} className="text-xs font-bold text-rose-600 hover:underline inline-flex items-center gap-1">
                <X className="h-3 w-3" /> Clear all filters
              </button>
            )}
          </div>
        )}

        {hasFilters && (
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 p-3 grid sm:grid-cols-4 gap-3">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-600">Showing</div>
              <div className="font-extrabold text-emerald-700">{filteredStats.count} sales</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-600">Total</div>
              <div className="font-extrabold text-slate-900">{formatPKR(filteredStats.totalAmount)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-600">Avg Order</div>
              <div className="font-extrabold text-blue-700">{formatPKR(filteredStats.avgOrderValue)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-600">Udhaar</div>
              <div className="font-extrabold text-amber-700">{formatPKR(filteredStats.totalCredit)}</div>
            </div>
          </div>
        )}
      </section>

      {/* ═══ SALES LIST ═══ */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">All Sales</h3>
            <p className="text-sm text-slate-500">
              {hasFilters ? `${filteredSales.length} filtered` : `${sales.length} total`} sales
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-slate-100 flex items-center justify-center">
              <Receipt className="h-9 w-9 text-slate-400" />
            </div>
            <h4 className="mt-4 text-lg font-bold text-slate-900">
              {hasFilters ? 'No sales match filters' : 'Abhi koi sale nahi'}
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {hasFilters ? 'Try different filters' : 'POS se sale complete karte hi yahan dikhegi'}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredSales.map((sale) => {
              const PayIcon = paymentConfig[sale.paymentMethod]?.icon || CreditCard;
              const payColor = paymentConfig[sale.paymentMethod]?.color || '#64748b';
              const isVoided = sale.status === 'VOIDED';
              const isReturned = sale.status === 'PARTIALLY_RETURNED' || sale.status === 'FULLY_RETURNED';

              return (
                <Link
                  key={sale.id}
                  to={`/sales/${sale.id}/receipt`}
                  className={`block px-6 py-4 hover:bg-slate-50/80 transition group ${
                    isVoided ? 'opacity-60' : ''
                  } ${isReturned ? 'bg-amber-50/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                        style={{ backgroundColor: `${payColor}15` }}
                      >
                        <PayIcon className="h-5 w-5" style={{ color: payColor }} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 font-mono text-sm">{sale.saleNumber}</span>
                          {isVoided && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">VOIDED</span>
                          )}
                          {isReturned && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold">
                              {sale.status === 'FULLY_RETURNED' ? 'RETURNED' : 'PARTIAL RETURN'}
                            </span>
                          )}
                          {sale.creditAmount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold inline-flex items-center gap-1">
                              <BookOpen className="h-2.5 w-2.5" />
                              UDHAAR
                            </span>
                          )}
                          {!!(sale.serviceCharges && sale.serviceCharges > 0) && (
                            <span
                              className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-extrabold inline-flex items-center gap-1"
                              title={`Service charges: ${formatPKR(sale.serviceCharges)}`}
                            >
                              <Wrench className="h-2.5 w-2.5" />
                              SERVICES +{formatPKR(sale.serviceCharges)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <User className="h-3 w-3" />
                          <span className="font-semibold text-slate-700">{sale.customer?.name || 'Walk-in Customer'}</span>
                          {sale.customer?.phone && (
                            <>
                              <span>•</span>
                              <span>{sale.customer.phone}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(sale.soldAt)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                          </span>
                          {sale.createdBy && <span>by {sale.createdBy.fullName}</span>}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {sale.items.slice(0, 3).map((item) => (
                            <span
                              key={item.id}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 max-w-[180px] truncate inline-flex items-center gap-1"
                            >
                              {item.product.unit === 'sqft' && <Layers className="h-2.5 w-2.5 text-emerald-600" />}
                              {item.product.name} × {formatQty(item.quantity)}
                            </span>
                          ))}
                          {sale.items.length > 3 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                              +{sale.items.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-2xl font-extrabold tabular-nums ${isVoided ? 'text-slate-400 line-through' : 'text-emerald-700'}`}>
                        {formatPKR(sale.total)}
                      </div>
                      {sale.creditAmount > 0 && !isVoided && (
                        <div className="text-[10px] text-amber-700 font-extrabold mt-0.5">
                          Udhaar: {formatPKR(sale.creditAmount)}
                        </div>
                      )}
                      {sale.changeAmount > 0 && !isVoided && (
                        <div className="text-[10px] text-emerald-700 font-extrabold mt-0.5">
                          Change: {formatPKR(sale.changeAmount)}
                        </div>
                      )}
                      <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 group-hover:text-emerald-700">
                        <Eye className="h-3 w-3" />
                        View Receipt
                        <ArrowRight className="h-3 w-3" />
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
  );
}

function StatCard({ label, value, sub, icon: Icon, color, isHighlight }: any) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
  };
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${
      isHighlight ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          <div className="text-xs text-slate-600 font-semibold mt-1">{sub}</div>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
