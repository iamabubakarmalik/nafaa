import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Receipt, TrendingUp, Wallet, CalendarDays, ChefHat,
  Search, X, Calendar, Package, User,
  Banknote, CreditCard, Smartphone, Building2, Zap,
  Utensils, Bike, ShoppingBag as Takeaway, Car, Home,
  Sparkles, Eye, Download, RefreshCw, Award, ArrowRight,
  Users, Table as TableIcon, MessageSquare, Clock,
  BarChart3, Lock, Unlock, EyeOff, Shield, CalendarRange,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { salesApi, type PaymentMethod } from '@/api/sales.api';
import { ordersApi } from '../api/orders.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { useSalesPrivacy } from '@/features/sales/hooks/useSalesPrivacy';
import { SalesPrivacyModal } from '@/features/sales/components/SalesPrivacyModal';
import { HiddenAmount } from '@/features/sales/components/HiddenAmount';
import { toast } from 'sonner';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const paymentConfig: Record<string, { label: string; icon: any; color: string; bg: string; hex: string }> = {
  CASH: { label: 'Cash', icon: Banknote, color: '#16a34a', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', hex: '#10b981' },
  CARD: { label: 'Card', icon: CreditCard, color: '#2563eb', bg: 'bg-blue-50 text-blue-700 border-blue-200', hex: '#3b82f6' },
  JAZZCASH: { label: 'JazzCash', icon: Smartphone, color: '#f97316', bg: 'bg-orange-50 text-orange-700 border-orange-200', hex: '#f97316' },
  EASYPAISA: { label: 'EasyPaisa', icon: Zap, color: '#22c55e', bg: 'bg-green-50 text-green-700 border-green-200', hex: '#22c55e' },
  BANK_TRANSFER: { label: 'Bank', icon: Building2, color: '#7c3aed', bg: 'bg-violet-50 text-violet-700 border-violet-200', hex: '#8b5cf6' },
};

const MODE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  DINE_IN: { label: 'Dine-in', icon: Utensils, color: 'text-emerald-700', bg: 'bg-emerald-100' },
  TAKEAWAY: { label: 'Takeaway', icon: Takeaway, color: 'text-blue-700', bg: 'bg-blue-100' },
  DELIVERY: { label: 'Delivery', icon: Bike, color: 'text-violet-700', bg: 'bg-violet-100' },
  DRIVE_THRU: { label: 'Drive-thru', icon: Car, color: 'text-amber-700', bg: 'bg-amber-100' },
  ROOM_SERVICE: { label: 'Room Service', icon: Home, color: 'text-pink-700', bg: 'bg-pink-100' },
  PICKUP: { label: 'Pickup', icon: Package, color: 'text-cyan-700', bg: 'bg-cyan-100' },
};

type View = 'orders' | 'sales';
type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export default function RestaurantSalesPage() {
  const privacy = useSalesPrivacy();
  const [view, setView] = useState<View>('orders');
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
  const [privacyModal, setPrivacyModal] = useState<'unlock' | 'setup' | 'disable' | null>(null);

  useEffect(() => {
    if (privacy.isLocked && !privacyModal) setPrivacyModal('unlock');
  }, [privacy.isLocked, privacyModal]);

  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders, isRefetching: refetchingOrders } = useQuery({
    queryKey: ['restaurant-orders-list'],
    queryFn: () => ordersApi.list({}),
    enabled: !privacy.isLocked && view === 'orders',
    refetchInterval: 30_000,
  });

  const { data: sales = [], isLoading: salesLoading, refetch: refetchSales, isRefetching: refetchingSales } = useQuery({
    queryKey: ['sales-list'],
    queryFn: () => salesApi.list(),
    enabled: !privacy.isLocked && view === 'sales',
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
    else if (dateFilter === 'yesterday') { start.setDate(now.getDate() - 1); start.setHours(0, 0, 0, 0); end = new Date(start); end.setHours(23, 59, 59, 999); }
    else if (dateFilter === 'week') start.setDate(now.getDate() - 7);
    else if (dateFilter === 'month') start.setMonth(now.getMonth() - 1);
    else if (dateFilter === 'year') start.setFullYear(now.getFullYear() - 1);
    else if (dateFilter === 'custom') {
      if (customStart) { start = new Date(customStart); start.setHours(0, 0, 0, 0); }
      if (customEnd) { end = new Date(customEnd); end.setHours(23, 59, 59, 999); }
    }
    else if (dateFilter === 'all') { start = new Date(0); }
    return [start, end];
  };

  const orderStats = useMemo(() => {
    const total = orders.length;
    const dineIn = orders.filter((o: any) => o.mode === 'DINE_IN').length;
    const takeaway = orders.filter((o: any) => o.mode === 'TAKEAWAY').length;
    const delivery = orders.filter((o: any) => o.mode === 'DELIVERY').length;
    const revenue = orders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
    const avgOrder = total > 0 ? revenue / total : 0;
    const completed = orders.filter((o: any) => o.status === 'COMPLETED' || o.status === 'SERVED' || o.status === 'DELIVERED').length;
    const cooking = orders.filter((o: any) => o.status === 'COOKING' || o.status === 'CONFIRMED' || o.status === 'PLACED').length;
    return { total, dineIn, takeaway, delivery, revenue, avgOrder, completed, cooking };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = [...orders];
    if (modeFilter !== 'all') list = list.filter((o: any) => o.mode === modeFilter);
    if (statusFilter !== 'all') list = list.filter((o: any) => o.status === statusFilter);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((o: any) =>
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerPhone?.toLowerCase().includes(q) ||
        o.table?.tableNumber?.toLowerCase().includes(q),
      );
    }
    const [start, end] = getDateRange();
    list = list.filter((o: any) => {
      const d = new Date(o.createdAt);
      return d >= start && d <= end;
    });
    return list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, search, modeFilter, statusFilter, dateFilter, customStart, customEnd]);

  const filteredSales = useMemo(() => {
    let list = [...sales];
    if (paymentFilter !== 'all') list = list.filter((s) => s.paymentMethod === paymentFilter);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((s) =>
        s.saleNumber.toLowerCase().includes(q) ||
        s.customer?.name?.toLowerCase().includes(q) ||
        s.customer?.phone?.toLowerCase().includes(q),
      );
    }
    const [start, end] = getDateRange();
    list = list.filter((s) => {
      const d = new Date(s.soldAt);
      return d >= start && d <= end;
    });
    return list.sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
  }, [sales, search, paymentFilter, dateFilter, customStart, customEnd]);

  const modeBreakdown = useMemo(() => {
    return Object.entries(MODE_CONFIG).map(([mode, cfg]) => ({
      mode: cfg.label,
      count: orders.filter((o: any) => o.mode === mode).length,
      revenue: orders.filter((o: any) => o.mode === mode).reduce((s: number, o: any) => s + Number(o.total || 0), 0),
    })).filter((m) => m.count > 0);
  }, [orders]);

  const exportCSV = () => {
    const list = view === 'orders' ? filteredOrders : filteredSales;
    if (list.length === 0) return;
    const headers = view === 'orders'
      ? ['Order #', 'Date', 'Mode', 'Table', 'Customer', 'Phone', 'Items', 'Guests', 'Status', 'Total']
      : ['Sale #', 'Date', 'Customer', 'Phone', 'Items', 'Payment', 'Subtotal', 'Discount', 'Total', 'Paid', 'Credit'];
    const rows = view === 'orders'
      ? filteredOrders.map((o: any) => [o.orderNumber, new Date(o.createdAt).toLocaleString('en-PK'), MODE_CONFIG[o.mode]?.label || o.mode, o.table?.tableNumber || '-', o.customerName || 'Walk-in', o.customerPhone || '', o.items?.length || 0, o.numberOfGuests || '-', o.status, o.total.toFixed(2)])
      : filteredSales.map((s) => [s.saleNumber, new Date(s.soldAt).toLocaleString('en-PK'), s.customer?.name || 'Walk-in', s.customer?.phone || '', s.items.length, paymentConfig[s.paymentMethod]?.label || s.paymentMethod, s.subtotal.toFixed(2), s.discount.toFixed(2), s.total.toFixed(2), s.paidAmount.toFixed(2), s.creditAmount.toFixed(2)]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restaurant-${view}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  if (privacy.isLocked) {
    return (
      <>
        {privacyModal && <SalesPrivacyModal mode={privacyModal} onClose={() => setPrivacyModal(null)} />}
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="max-w-md w-full text-center">
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-orange-600 to-red-700 mx-auto flex items-center justify-center shadow-xl shadow-orange-500/30">
              <Lock className="h-12 w-12 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-slate-900">🔒 Sales Locked</h2>
            <p className="mt-2 text-slate-600 font-semibold">Restaurant sales data password protected hai. Owner only.</p>
            <Button size="lg" className="mt-6 bg-gradient-to-r from-orange-600 to-red-700" onClick={() => setPrivacyModal('unlock')}>
              <Unlock className="h-5 w-5" /> Unlock with Password
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {privacyModal && <SalesPrivacyModal mode={privacyModal} onClose={() => setPrivacyModal(null)} />}

      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white p-6 sm:p-8 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-semibold">
                <ChefHat className="h-3.5 w-3.5 text-amber-300" />
                Restaurant Sales
                {privacy.isEnabled && (<><span className="text-white/40">•</span><Shield className="h-3 w-3 text-emerald-300" /><span className="text-emerald-300">Protected</span></>)}
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Kitchen Orders & Sales</h1>
              <p className="mt-2 text-sm text-white/80">Har order, har table, har mode — sab ek jagah</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={privacy.toggleHideStats} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold backdrop-blur border ${hideAmounts ? 'bg-amber-500/30 border-amber-300/40' : 'bg-white/10 hover:bg-white/20 border-white/20'}`}>
                {hideAmounts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="hidden sm:inline">{hideAmounts ? 'Show $' : 'Hide $'}</span>
              </button>
              {privacy.isEnabled ? (
                <>
                  <button onClick={privacy.lock} className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2.5 text-sm font-bold border border-white/20">
                    <Lock className="h-4 w-4" /> Lock
                  </button>
                  <button onClick={() => setPrivacyModal('disable')} className="inline-flex items-center gap-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 px-3 py-2.5 text-sm font-bold border border-rose-300/30">
                    <Shield className="h-4 w-4" /><span className="hidden sm:inline">Disable</span>
                  </button>
                </>
              ) : (
                <button onClick={() => setPrivacyModal('setup')} className="inline-flex items-center gap-2 rounded-xl bg-orange-500/30 hover:bg-orange-500/50 px-3 py-2.5 text-sm font-bold border border-orange-300/40">
                  <Shield className="h-4 w-4" /><span className="hidden sm:inline">Enable Privacy</span>
                </button>
              )}
              <button onClick={() => view === 'orders' ? refetchOrders() : refetchSales()} disabled={refetchingOrders || refetchingSales} className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold border border-white/20 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${(refetchingOrders || refetchingSales) ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <Link to="/pos"><Button className="bg-white text-slate-900 hover:bg-slate-100"><ChefHat className="h-4 w-4" /> New Order</Button></Link>
            </div>
          </div>
        </section>

        <div className="flex gap-2">
          <button onClick={() => setView('orders')} className={`px-5 py-3 rounded-xl text-sm font-extrabold transition inline-flex items-center gap-2 ${view === 'orders' ? 'bg-orange-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700'}`}>
            <ChefHat className="h-4 w-4" /> Restaurant Orders ({orderStats.total})
          </button>
          <button onClick={() => setView('sales')} className={`px-5 py-3 rounded-xl text-sm font-extrabold transition inline-flex items-center gap-2 ${view === 'sales' ? 'bg-orange-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700'}`}>
            <Receipt className="h-4 w-4" /> All Sales ({sales.length})
          </button>
        </div>

        {view === 'orders' ? (
          <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Dine-in Orders" value={String(orderStats.dineIn)} sub={`${orderStats.total} total`} icon={Utensils} color="emerald" />
            <StatCard label="Delivery Orders" value={String(orderStats.delivery)} sub="Bike deliveries" icon={Bike} color="violet" />
            <StatCard label="Avg Order Value" value={showValue(formatPKR(orderStats.avgOrder))} sub={`${orderStats.cooking} cooking now`} icon={TrendingUp} color="amber" />
            <StatCard label="Total Revenue" value={showValue(formatPKR(orderStats.revenue))} sub={`${orderStats.completed} completed`} icon={Wallet} color="blue" />
          </section>
        ) : (
          <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Aaj ki Sales" value={showValue(formatPKR(summary?.todaySales ?? 0))} sub={`${summary?.todayOrders ?? 0} orders`} icon={TrendingUp} color="emerald" />
            <StatCard label="Aaj ka Profit" value={showValue(formatPKR(summary?.todayProfit ?? 0))} sub="Today's earning" icon={Award} color="blue" isHighlight />
            <StatCard label="Is Mahine" value={showValue(formatPKR(summary?.monthSales ?? 0))} sub="Monthly total" icon={CalendarDays} color="violet" />
            <StatCard label="Total Revenue" value={showValue(formatPKR(summary?.totalSales ?? 0))} sub={`${summary?.totalOrders ?? 0} orders`} icon={Wallet} color="amber" />
          </section>
        )}

        {view === 'orders' && !hideAmounts && modeBreakdown.length > 0 && (
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="text-lg font-bold text-slate-900">Order Mode Breakdown</h3><p className="text-xs text-slate-500">Revenue by dine-in / takeaway / delivery</p></div>
              <BarChart3 className="h-5 w-5 text-orange-500" />
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modeBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mode" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Bar dataKey="revenue" fill="#ea580c" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={view === 'orders' ? 'Search order #, table, customer...' : 'Search sale #, customer...'} className="h-11 w-full rounded-xl border-2 border-slate-200 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-orange-500" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-slate-400" /></button>}
            </div>
            {(view === 'orders' ? filteredOrders : filteredSales).length > 0 && (
              <button onClick={exportCSV} className="h-11 px-4 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 font-bold text-sm text-slate-700 inline-flex items-center gap-2">
                <Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span>
              </button>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 block inline-flex items-center gap-1"><CalendarRange className="h-3 w-3" />Date Range</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {([
                { v: 'today', l: 'Today' }, { v: 'yesterday', l: 'Yesterday' },
                { v: 'week', l: 'Last 7 Days' }, { v: 'month', l: 'Last 30 Days' },
                { v: 'year', l: 'Last Year' }, { v: 'all', l: 'All Time' },
                { v: 'custom', l: '📅 Custom Range' },
              ] as { v: DateFilter; l: string }[]).map((d) => (
                <button key={d.v} onClick={() => setDateFilter(d.v)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${dateFilter === d.v ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {d.l}
                </button>
              ))}
            </div>
            {dateFilter === 'custom' && (
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-orange-50 border-2 border-orange-200 p-3">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-orange-700 mb-1 block">From Date</label>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-10 w-full rounded-lg border-2 border-orange-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-orange-700 mb-1 block">To Date</label>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-10 w-full rounded-lg border-2 border-orange-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                </div>
                {customStart && customEnd && (
                  <div className="col-span-2 text-xs font-bold text-orange-800 inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Showing {new Date(customStart).toLocaleDateString('en-PK')} to {new Date(customEnd).toLocaleDateString('en-PK')}
                  </div>
                )}
              </div>
            )}
          </div>

          {view === 'orders' && (
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 block">Order Mode</label>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button onClick={() => setModeFilter('all')} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 ${modeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  <Sparkles className="h-3 w-3" /> All Modes
                </button>
                {Object.entries(MODE_CONFIG).map(([mode, cfg]) => (
                  <button key={mode} onClick={() => setModeFilter(mode)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 ${modeFilter === mode ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    <cfg.icon className="h-3 w-3" />{cfg.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === 'sales' && (
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 block">Payment Method</label>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button onClick={() => setPaymentFilter('all')} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${paymentFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>All Payments</button>
                {Object.entries(paymentConfig).map(([k, cfg]) => (
                  <button key={k} onClick={() => setPaymentFilter(k as PaymentMethod)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 ${paymentFilter === k ? cfg.bg + ' border-2' : 'bg-slate-100 text-slate-700'}`}>
                    <cfg.icon className="h-3 w-3" style={{ color: paymentFilter === k ? cfg.color : undefined }} />{cfg.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {view === 'orders' ? (
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            {ordersLoading ? (
              <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />)}</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center">
                <ChefHat className="h-16 w-16 text-slate-400 mx-auto mb-3" />
                <p className="font-extrabold text-slate-700 text-lg">No orders found</p>
                <p className="text-xs text-slate-500 mt-1">Try different filters or date range</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredOrders.map((order: any) => {
                  const modeCfg = MODE_CONFIG[order.mode] || MODE_CONFIG.DINE_IN;
                  const ModeIcon = modeCfg.icon;
                  const statusColor = order.status === 'COMPLETED' || order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' : order.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' : order.status === 'COOKING' ? 'bg-amber-100 text-amber-700' : order.status === 'READY' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700';
                  return (
                    <Link key={order.id} to={`/restaurant/orders/${order.id}`} className="block px-5 py-4 hover:bg-orange-50/50 transition group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`h-12 w-12 rounded-2xl ${modeCfg.bg} ${modeCfg.color} flex items-center justify-center shrink-0`}>
                            <ModeIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-extrabold text-slate-900">{order.orderNumber}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${statusColor}`}>{order.status}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${modeCfg.bg} ${modeCfg.color}`}>{modeCfg.label}</span>
                              {order.table && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold inline-flex items-center gap-1"><TableIcon className="h-2.5 w-2.5" />Table {order.table.tableNumber}</span>}
                              {order.kots?.length > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold">KOT: {order.kots[0].kotNumber}</span>}
                            </div>
                            <div className="mt-1 text-xs text-slate-600 font-semibold flex items-center gap-2 flex-wrap">
                              <User className="h-3 w-3" />{order.customerName || 'Walk-in'}
                              {order.customerPhone && <><span>•</span><span>{order.customerPhone}</span></>}
                              <span>•</span><Package className="h-3 w-3" />{order.items?.length || 0} items
                              {order.numberOfGuests && <><span>•</span><Users className="h-3 w-3" />{order.numberOfGuests} guests</>}
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-bold inline-flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />{formatDate(order.createdAt)}
                            </div>
                            {order.specialRequests && <div className="mt-1.5 text-[11px] italic text-amber-700 inline-flex items-start gap-1"><MessageSquare className="h-3 w-3 mt-0.5" />{order.specialRequests}</div>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-extrabold text-emerald-700 tabular-nums"><HiddenAmount value={formatPKR(order.total)} hidden={hideAmounts} /></div>
                          {order.paidAmount < order.total && <div className="text-[10px] text-amber-700 font-extrabold mt-0.5">Due: <HiddenAmount value={formatPKR(order.total - order.paidAmount)} hidden={hideAmounts} /></div>}
                          <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-orange-600 group-hover:text-orange-700"><Eye className="h-3 w-3" />View Order<ArrowRight className="h-3 w-3" /></div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            {salesLoading ? (
              <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />)}</div>
            ) : filteredSales.length === 0 ? (
              <div className="p-12 text-center"><Receipt className="h-16 w-16 text-slate-400 mx-auto mb-3" /><p className="font-extrabold text-slate-700 text-lg">No sales found</p></div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredSales.map((sale) => {
                  const PayIcon = paymentConfig[sale.paymentMethod]?.icon || CreditCard;
                  const payColor = paymentConfig[sale.paymentMethod]?.color || '#64748b';
                  return (
                    <Link key={sale.id} to={`/sales/${sale.id}/receipt`} className="block px-5 py-4 hover:bg-slate-50 transition group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: payColor + '20' }}>
                            <PayIcon className="h-5 w-5" style={{ color: payColor }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-extrabold text-slate-900">{sale.saleNumber}</span>
                              {sale.status === 'VOIDED' && <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">VOIDED</span>}
                            </div>
                            <div className="mt-1 text-xs text-slate-600 font-semibold flex items-center gap-2 flex-wrap">
                              <User className="h-3 w-3" />{sale.customer?.name || 'Walk-in'}
                              <span>•</span><Package className="h-3 w-3" />{sale.items.length} items
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 inline-flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{formatDate(sale.soldAt)}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-extrabold text-emerald-700 tabular-nums"><HiddenAmount value={formatPKR(sale.total)} hidden={hideAmounts} /></div>
                          {sale.creditAmount > 0 && <div className="text-[10px] text-amber-700 font-extrabold mt-0.5">Udhaar: <HiddenAmount value={formatPKR(sale.creditAmount)} hidden={hideAmounts} /></div>}
                          <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-orange-600 group-hover:text-orange-700"><Eye className="h-3 w-3" />Receipt<ArrowRight className="h-3 w-3" /></div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </>
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
    <div className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${isHighlight ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300' : 'bg-white border-slate-200'}`}>
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
