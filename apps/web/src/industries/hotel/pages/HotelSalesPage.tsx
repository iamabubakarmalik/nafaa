import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bed, Calendar, Users, TrendingUp, Wallet, Search, X,
  Banknote, CreditCard, Smartphone, Building2, Zap,
  Sparkles, Eye, Download, RefreshCw, Award, ArrowRight,
  Clock, BarChart3, Lock, Unlock, EyeOff, Shield, CalendarRange,
  User, Home, MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { bookingsApi } from '../api/bookings.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useSalesPrivacy } from '@modules/sales/sales/hooks/useSalesPrivacy';
import { SalesPrivacyModal } from '@modules/sales/sales/components/SalesPrivacyModal';
import { HiddenAmount } from '@modules/sales/sales/components/HiddenAmount';
import { toast } from 'sonner';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const paymentConfig: Record<string, { label: string; icon: any; color: string }> = {
  CASH: { label: 'Cash', icon: Banknote, color: '#16a34a' },
  CARD: { label: 'Card', icon: CreditCard, color: '#2563eb' },
  JAZZCASH: { label: 'JazzCash', icon: Smartphone, color: '#f97316' },
  EASYPAISA: { label: 'EasyPaisa', icon: Zap, color: '#22c55e' },
  BANK_TRANSFER: { label: 'Bank', icon: Building2, color: '#7c3aed' },
};

type View = 'bookings' | 'sales';
type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export default function HotelSalesPage() {
  const privacy = useSalesPrivacy();
  const [view, setView] = useState<View>('bookings');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
  const [privacyModal, setPrivacyModal] = useState<'unlock' | 'setup' | 'disable' | null>(null);

  useEffect(() => {
    if (privacy.isLocked && !privacyModal) setPrivacyModal('unlock');
  }, [privacy.isLocked, privacyModal]);

  const { data: bookings = [], isLoading: bookingsLoading, refetch: refetchBookings, isRefetching: refetchingB } = useQuery({
    queryKey: ['hotel-bookings-list'],
    queryFn: () => bookingsApi.list(),
    enabled: !privacy.isLocked && view === 'bookings',
  });

  const { data: sales = [], isLoading: salesLoading, refetch: refetchSales, isRefetching: refetchingS } = useQuery({
    queryKey: ['sales-list'],
    queryFn: () => salesApi.list(),
    enabled: !privacy.isLocked && view === 'sales',
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
    else if (dateFilter === 'all') start = new Date(0);
    return [start, end];
  };

  const filteredBookings = useMemo(() => {
    let list = [...bookings];
    if (statusFilter !== 'all') list = list.filter((b: any) => b.status === statusFilter);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((b: any) =>
        b.bookingNumber?.toLowerCase().includes(q) ||
        b.guestName?.toLowerCase().includes(q) ||
        b.guestPhone?.toLowerCase().includes(q),
      );
    }
    const [start, end] = getDateRange();
    list = list.filter((b: any) => {
      const d = new Date(b.createdAt);
      return d >= start && d <= end;
    });
    return list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bookings, search, statusFilter, dateFilter, customStart, customEnd]);

  const filteredSales = useMemo(() => {
    let list = [...sales];
    if (paymentFilter !== 'all') list = list.filter((s) => s.paymentMethod === paymentFilter);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((s) =>
        s.saleNumber.toLowerCase().includes(q) ||
        s.customer?.name?.toLowerCase().includes(q),
      );
    }
    const [start, end] = getDateRange();
    list = list.filter((s) => { const d = new Date(s.soldAt); return d >= start && d <= end; });
    return list.sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
  }, [sales, search, paymentFilter, dateFilter, customStart, customEnd]);

  const bookingStats = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter((b: any) => b.status === 'CONFIRMED').length;
    const checkedIn = bookings.filter((b: any) => b.status === 'CHECKED_IN').length;
    const checkedOut = bookings.filter((b: any) => b.status === 'CHECKED_OUT').length;
    const cancelled = bookings.filter((b: any) => b.status === 'CANCELLED').length;
    const revenue = bookings.reduce((s: number, b: any) => s + Number(b.grandTotal || 0), 0);
    const totalNights = bookings.reduce((s: number, b: any) => s + Number(b.nights || 0), 0);
    const avgADR = totalNights > 0 ? revenue / totalNights : 0;
    return { total, confirmed, checkedIn, checkedOut, cancelled, revenue, totalNights, avgADR };
  }, [bookings]);

  const modeBreakdown = useMemo(() => {
    const modes: Record<string, number> = {};
    bookings.forEach((b: any) => {
      const src = b.source || 'DIRECT';
      modes[src] = (modes[src] || 0) + Number(b.grandTotal || 0);
    });
    return Object.entries(modes).map(([source, revenue]) => ({ source, revenue })).sort((a, b) => b.revenue - a.revenue);
  }, [bookings]);

  const exportCSV = () => {
    const list = view === 'bookings' ? filteredBookings : filteredSales;
    if (list.length === 0) return;
    const headers = view === 'bookings'
      ? ['Booking #', 'Date', 'Guest', 'Phone', 'Check-in', 'Check-out', 'Nights', 'Rooms', 'Status', 'Total', 'Paid']
      : ['Sale #', 'Date', 'Customer', 'Phone', 'Items', 'Payment', 'Total', 'Paid', 'Credit'];
    const rows = view === 'bookings'
      ? filteredBookings.map((b: any) => [b.bookingNumber, new Date(b.createdAt).toLocaleString('en-PK'), b.guestName, b.guestPhone, b.checkInDate, b.checkOutDate, b.nights, b.bookedRooms?.length || 0, b.status, b.grandTotal.toFixed(2), (b.advancePaid || 0).toFixed(2)])
      : filteredSales.map((s) => [s.saleNumber, new Date(s.soldAt).toLocaleString('en-PK'), s.customer?.name || 'Walk-in', s.customer?.phone || '', s.items.length, paymentConfig[s.paymentMethod]?.label || s.paymentMethod, s.total.toFixed(2), s.paidAmount.toFixed(2), s.creditAmount.toFixed(2)]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hotel-${view}-${new Date().toISOString().slice(0, 10)}.csv`;
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
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/30">
              <Lock className="h-12 w-12 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-slate-900">🔒 Sales Locked</h2>
            <p className="mt-2 text-slate-600 font-semibold">Hotel data password protected hai. Owner only.</p>
            <Button size="lg" className="mt-6 bg-gradient-to-r from-indigo-600 to-purple-700" onClick={() => setPrivacyModal('unlock')}>
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-purple-800 text-white p-6 sm:p-8 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-semibold">
                <Bed className="h-3.5 w-3.5 text-amber-300" />
                Hotel Sales
                {privacy.isEnabled && (<><span className="text-white/40">•</span><Shield className="h-3 w-3 text-emerald-300" /><span className="text-emerald-300">Protected</span></>)}
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Bookings & Revenue</h1>
              <p className="mt-2 text-sm text-white/80">Har booking, har payment, ADR & occupancy analytics</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={privacy.toggleHideStats} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold backdrop-blur border ${hideAmounts ? 'bg-amber-500/30 border-amber-300/40' : 'bg-white/10 border-white/20'}`}>
                {hideAmounts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="hidden sm:inline">{hideAmounts ? 'Show' : 'Hide'}</span>
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
                <button onClick={() => setPrivacyModal('setup')} className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/30 hover:bg-indigo-500/50 px-3 py-2.5 text-sm font-bold border border-indigo-300/40">
                  <Shield className="h-4 w-4" /><span className="hidden sm:inline">Enable Privacy</span>
                </button>
              )}
              <button onClick={() => view === 'bookings' ? refetchBookings() : refetchSales()} disabled={refetchingB || refetchingS} className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold border border-white/20 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${(refetchingB || refetchingS) ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <Link to="/pos"><Button className="bg-white text-slate-900 hover:bg-slate-100"><Bed className="h-4 w-4" /> New Booking</Button></Link>
            </div>
          </div>
        </section>

        <div className="flex gap-2">
          <button onClick={() => setView('bookings')} className={`px-5 py-3 rounded-xl text-sm font-extrabold transition inline-flex items-center gap-2 ${view === 'bookings' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700'}`}>
            <Bed className="h-4 w-4" /> Bookings ({bookingStats.total})
          </button>
          <button onClick={() => setView('sales')} className={`px-5 py-3 rounded-xl text-sm font-extrabold transition inline-flex items-center gap-2 ${view === 'sales' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700'}`}>
            <Wallet className="h-4 w-4" /> Direct Sales ({sales.length})
          </button>
        </div>

        {view === 'bookings' && (
          <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total Revenue" value={showValue(formatPKR(bookingStats.revenue))} sub={`${bookingStats.total} bookings`} icon={TrendingUp} color="emerald" isHighlight />
            <StatCard label="Occupied" value={String(bookingStats.checkedIn)} sub={`${bookingStats.confirmed} upcoming`} icon={Bed} color="blue" />
            <StatCard label="Avg Daily Rate" value={showValue(formatPKR(bookingStats.avgADR))} sub={`${bookingStats.totalNights} nights sold`} icon={Award} color="violet" />
            <StatCard label="Cancellations" value={String(bookingStats.cancelled)} sub={`${bookingStats.checkedOut} completed`} icon={Home} color="amber" />
          </section>
        )}

        {view === 'bookings' && !hideAmounts && modeBreakdown.length > 0 && (
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="text-lg font-bold text-slate-900">Revenue by Booking Source</h3><p className="text-xs text-slate-500">Direct, OTAs, walk-in breakdown</p></div>
              <BarChart3 className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modeBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="source" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={view === 'bookings' ? 'Search booking #, guest...' : 'Search sale #, customer...'} className="h-11 w-full rounded-xl border-2 border-slate-200 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-indigo-500" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-slate-400" /></button>}
            </div>
            {(view === 'bookings' ? filteredBookings : filteredSales).length > 0 && (
              <button onClick={exportCSV} className="h-11 px-4 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 font-bold text-sm text-slate-700 inline-flex items-center gap-2">
                <Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span>
              </button>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 inline-flex items-center gap-1"><CalendarRange className="h-3 w-3" />Date Range</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {([
                { v: 'today', l: 'Today' }, { v: 'yesterday', l: 'Yesterday' },
                { v: 'week', l: 'Last 7 Days' }, { v: 'month', l: 'Last 30 Days' },
                { v: 'year', l: 'Last Year' }, { v: 'all', l: 'All Time' },
                { v: 'custom', l: '📅 Custom Range' },
              ] as { v: DateFilter; l: string }[]).map((d) => (
                <button key={d.v} onClick={() => setDateFilter(d.v)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${dateFilter === d.v ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {d.l}
                </button>
              ))}
            </div>
            {dateFilter === 'custom' && (
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-indigo-50 border-2 border-indigo-200 p-3">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-indigo-700 mb-1 block">From Date</label>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-10 w-full rounded-lg border-2 border-indigo-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-indigo-700 mb-1 block">To Date</label>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-10 w-full rounded-lg border-2 border-indigo-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
            )}
          </div>

          {view === 'bookings' && (
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 block">Status</label>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {['all', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${statusFilter === s ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-700'}`}>
                    {s === 'all' ? 'All Status' : s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {view === 'bookings' ? (
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            {bookingsLoading ? (
              <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />)}</div>
            ) : filteredBookings.length === 0 ? (
              <div className="p-12 text-center">
                <Bed className="h-16 w-16 text-slate-400 mx-auto mb-3" />
                <p className="font-extrabold text-slate-700 text-lg">No bookings found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredBookings.map((b: any) => {
                  const statusColor = b.status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-700' :
                    b.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                    b.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' :
                    b.status === 'CHECKED_OUT' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700';
                  return (
                    <Link key={b.id} to={`/hotel/bookings/${b.id}`} className="block px-5 py-4 hover:bg-indigo-50/50 transition group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                            <Bed className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-extrabold text-slate-900">{b.bookingNumber}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${statusColor}`}>{b.status.replace('_', ' ')}</span>
                              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-extrabold">
                                {b.bookedRooms?.length || 0} room{(b.bookedRooms?.length || 0) !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-slate-600 font-semibold flex items-center gap-2 flex-wrap">
                              <User className="h-3 w-3" />{b.guestName}
                              {b.guestPhone && <><span>•</span><span>{b.guestPhone}</span></>}
                              <span>•</span><Users className="h-3 w-3" />{b.totalAdults}A {b.totalChildren}C
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-bold inline-flex items-center gap-2 flex-wrap">
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(b.checkInDate).toLocaleDateString('en-PK')} → {new Date(b.checkOutDate).toLocaleDateString('en-PK')}
                              <span>•</span>
                              <Clock className="h-2.5 w-2.5" />
                              {b.nights} nights
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-extrabold text-emerald-700 tabular-nums"><HiddenAmount value={formatPKR(b.grandTotal)} hidden={hideAmounts} /></div>
                          {b.advancePaid > 0 && <div className="text-[10px] text-emerald-700 font-extrabold mt-0.5">Advance: <HiddenAmount value={formatPKR(b.advancePaid)} hidden={hideAmounts} /></div>}
                          <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-600 group-hover:text-indigo-700"><Eye className="h-3 w-3" />View <ArrowRight className="h-3 w-3" /></div>
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
              <div className="p-12 text-center"><Wallet className="h-16 w-16 text-slate-400 mx-auto mb-3" /><p className="font-extrabold text-slate-700 text-lg">No sales found</p></div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredSales.map((sale) => {
                  const PayIcon = paymentConfig[sale.paymentMethod]?.icon || CreditCard;
                  return (
                    <Link key={sale.id} to={`/sales/${sale.id}/receipt`} className="block px-5 py-4 hover:bg-slate-50 transition group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0"><PayIcon className="h-5 w-5" /></div>
                          <div className="min-w-0 flex-1">
                            <span className="font-mono font-extrabold text-slate-900">{sale.saleNumber}</span>
                            <div className="mt-1 text-xs text-slate-600 font-semibold flex items-center gap-2">
                              <User className="h-3 w-3" />{sale.customer?.name || 'Walk-in'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-extrabold text-emerald-700 tabular-nums"><HiddenAmount value={formatPKR(sale.total)} hidden={hideAmounts} /></div>
                          <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-600 group-hover:text-indigo-700"><Eye className="h-3 w-3" />Receipt<ArrowRight className="h-3 w-3" /></div>
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
    emerald: 'from-emerald-500 to-green-600',
    blue: 'from-blue-500 to-indigo-700',
    violet: 'from-violet-500 to-purple-600',
    amber: 'from-amber-500 to-orange-600',
  };
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm ${isHighlight ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          <div className="text-xs text-slate-600 font-semibold mt-1">{sub}</div>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
