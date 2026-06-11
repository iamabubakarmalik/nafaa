import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Receipt, TrendingUp, Wallet, CalendarDays, ArrowUpRight,
  Search, Filter, X, Calendar, Package, User, Phone,
  Banknote, CreditCard, Smartphone, Building2, Zap,
  CheckCircle2, XCircle, AlertTriangle, ShoppingCart,
  Sparkles, BookOpen, Eye, Download, RefreshCw,
} from 'lucide-react';
import { salesApi, type PaymentMethod } from '@/api/sales.api';
import { formatPKR } from '@/lib/format';
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
  }).format(new Date(value));

const formatQty = (qty: number) =>
  qty.toFixed(qty % 1 === 0 ? 0 : 2);

const paymentConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  CASH: { label: 'Cash', icon: Banknote, color: '#16a34a', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CARD: { label: 'Card', icon: CreditCard, color: '#2563eb', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  JAZZCASH: { label: 'JazzCash', icon: Smartphone, color: '#f97316', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  EASYPAISA: { label: 'EasyPaisa', icon: Zap, color: '#22c55e', bg: 'bg-green-50 text-green-700 border-green-200' },
  BANK_TRANSFER: { label: 'Bank', icon: Building2, color: '#7c3aed', bg: 'bg-violet-50 text-violet-700 border-violet-200' },
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
    queryFn: salesApi.list,
  });

  const { data: summary } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: salesApi.summary,
  });

  // Filtered sales
  const filteredSales = useMemo(() => {
    let result = [...sales];

    // Search
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

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      if (dateFilter === 'today') {
        cutoff.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'week') {
        cutoff.setDate(now.getDate() - 7);
      } else if (dateFilter === 'month') {
        cutoff.setMonth(now.getMonth() - 1);
      }
      result = result.filter((s) => new Date(s.soldAt) >= cutoff);
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      result = result.filter((s) => s.paymentMethod === paymentFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    return result;
  }, [sales, search, dateFilter, paymentFilter, statusFilter]);

  // Calculate filtered totals
  const filteredStats = useMemo(() => {
    const totalAmount = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalPaid = filteredSales.reduce((sum, s) => sum + s.paidAmount, 0);
    const totalCredit = filteredSales.reduce((sum, s) => sum + s.creditAmount, 0);
    return { totalAmount, totalPaid, totalCredit, count: filteredSales.length };
  }, [filteredSales]);

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

    const csv = [headers, ...rows].map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-brand-800 text-white p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Sales Intelligence
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Sales History</h2>
            <p className="mt-2 text-sm text-white/75">
              Aap ki tamam sales, totals, payments aur printable receipts ek hi jagah.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold transition disabled:opacity-50"
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

      {/* STATS CARDS */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Aaj ki Sales</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">
                {formatPKR(summary?.todaySales ?? 0)}
              </div>
              <div className="text-xs text-emerald-700 font-semibold mt-1">
                {summary?.todayOrders ?? 0} orders
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Aaj ka Profit</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">
                {formatPKR(summary?.todayProfit ?? 0)}
              </div>
              <div className="text-xs text-blue-700 font-semibold mt-1">
                Today's earning
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Receipt className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Is Mahine ki Sales</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">
                {formatPKR(summary?.monthSales ?? 0)}
              </div>
              <div className="text-xs text-violet-700 font-semibold mt-1">
                Monthly total
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
              <CalendarDays className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Revenue</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">
                {formatPKR(summary?.totalSales ?? 0)}
              </div>
              <div className="text-xs text-amber-700 font-semibold mt-1">
                {summary?.totalOrders ?? 0} total orders
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH + FILTERS */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              placeholder="Search sale #, customer, phone, product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`h-11 px-4 rounded-xl border-2 font-bold text-sm inline-flex items-center gap-2 transition ${
              showFilters || hasFilters
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasFilters && (
              <span className="h-5 w-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
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
              Export CSV
            </button>
          )}
        </div>

        {showFilters && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
            {/* Date filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                Date Range
              </label>
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
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:border-brand-300'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                Payment Method
              </label>
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
                        active
                          ? cfg.bg + ' border-2'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="h-3 w-3" style={{ color: active ? cfg.color : undefined }} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                Status
              </label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { v: 'all' as StatusFilter, l: 'All', c: 'slate' },
                  { v: 'COMPLETED' as StatusFilter, l: 'Completed', c: 'emerald' },
                  { v: 'VOIDED' as StatusFilter, l: 'Voided', c: 'rose' },
                  { v: 'PARTIALLY_RETURNED' as StatusFilter, l: 'Partial Return', c: 'amber' },
                  { v: 'FULLY_RETURNED' as StatusFilter, l: 'Fully Returned', c: 'rose' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setStatusFilter(opt.v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      statusFilter === opt.v
                        ? `bg-${opt.c}-600 text-white shadow-sm`
                        : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {hasFilters && (
              <div className="pt-2 border-t border-slate-200">
                <button
                  onClick={clearFilters}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Filtered stats */}
        {hasFilters && (
          <div className="rounded-xl bg-gradient-to-br from-brand-50 to-emerald-50 border border-brand-200 p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-bold text-slate-900">
              Showing <span className="text-brand-700">{filteredStats.count}</span> sales
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-slate-600">
                Total: <span className="font-extrabold text-slate-900">{formatPKR(filteredStats.totalAmount)}</span>
              </span>
              {filteredStats.totalCredit > 0 && (
                <span className="font-semibold text-amber-700">
                  Udhaar: <span className="font-extrabold">{formatPKR(filteredStats.totalCredit)}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* SALES LIST + PAYMENT BREAKDOWN */}
      <section className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Recent Sales</h3>
              <p className="text-sm text-slate-500">
                {hasFilters ? `${filteredSales.length} filtered` : `${sales.length} total`} sales
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
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
                {hasFilters ? 'Try different filters or clear them' : 'POS se sale complete karte hi yahan dikhegi'}
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold"
                >
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
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Payment icon */}
                        <div
                          className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                          style={{ backgroundColor: `${payColor}15` }}
                        >
                          <PayIcon className="h-5 w-5" style={{ color: payColor }} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 font-mono text-sm">
                              {sale.saleNumber}
                            </span>
                            {isVoided && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                                VOIDED
                              </span>
                            )}
                            {isReturned && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                                {sale.status === 'FULLY_RETURNED' ? 'RETURNED' : 'PARTIAL RETURN'}
                              </span>
                            )}
                            {sale.creditAmount > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold inline-flex items-center gap-1">
                                <BookOpen className="h-2.5 w-2.5" />
                                UDHAAR
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <User className="h-3 w-3" />
                            <span className="font-semibold text-slate-700">
                              {sale.customer?.name || 'Walk-in Customer'}
                            </span>
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
                            {sale.createdBy && (
                              <span>by {sale.createdBy.fullName}</span>
                            )}
                          </div>

                          {/* Item preview */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {sale.items.slice(0, 3).map((item) => (
                              <span
                                key={item.id}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 max-w-[180px] truncate"
                              >
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
                        <div className={`text-xl font-extrabold ${
                          isVoided ? 'text-slate-400 line-through' : 'text-emerald-700'
                        }`}>
                          {formatPKR(sale.total)}
                        </div>
                        {sale.creditAmount > 0 && !isVoided && (
                          <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                            Udhaar: {formatPKR(sale.creditAmount)}
                          </div>
                        )}
                        {sale.changeAmount > 0 && !isVoided && (
                          <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                            Change: {formatPKR(sale.changeAmount)}
                          </div>
                        )}
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 group-hover:text-brand-700">
                          <Eye className="h-3 w-3" />
                          View
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Breakdown Sidebar */}
        <div className="space-y-4">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900">Payment Breakdown</h3>
            <p className="text-xs text-slate-500 mt-1">Method-wise transactions</p>

            <div className="mt-4 space-y-2">
              {summary?.paymentBreakdown?.length ? (
                summary.paymentBreakdown.map((item) => {
                  const cfg = paymentConfig[item.paymentMethod];
                  const Icon = cfg?.icon || CreditCard;
                  const totalAll = summary.paymentBreakdown.reduce(
                    (sum, p) => sum + (p._sum.total ?? 0),
                    0,
                  );
                  const pct = totalAll > 0 ? ((item._sum.total ?? 0) / totalAll) * 100 : 0;

                  return (
                    <div
                      key={item.paymentMethod}
                      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                    >
                      <div className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-9 w-9 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${cfg?.color || '#64748b'}15` }}
                          >
                            <Icon className="h-4 w-4" style={{ color: cfg?.color || '#64748b' }} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {cfg?.label || item.paymentMethod}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item._count._all} transaction{item._count._all !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-slate-900 text-sm">
                            {formatPKR(item._sum.total ?? 0)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold">
                            {pct.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1 bg-slate-100">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: cfg?.color || '#64748b',
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
                  Abhi payment data available nahi
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-3xl bg-gradient-to-br from-brand-50 to-emerald-50 border-2 border-brand-200 p-5">
            <div className="font-bold text-slate-900 mb-3">Quick Actions</div>
            <div className="space-y-2">
              <Link
                to="/pos"
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-brand-400 hover:shadow-md transition group"
              >
                <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900 text-sm">New Sale</div>
                  <div className="text-[11px] text-slate-500">Open POS</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600" />
              </Link>

              <Link
                to="/khata"
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-brand-400 hover:shadow-md transition group"
              >
                <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900 text-sm">View Khata</div>
                  <div className="text-[11px] text-slate-500">Customer credits</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600" />
              </Link>

              <Link
                to="/returns"
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-brand-400 hover:shadow-md transition group"
              >
                <div className="h-9 w-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center group-hover:scale-110 transition">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900 text-sm">Returns</div>
                  <div className="text-[11px] text-slate-500">Process refunds</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
