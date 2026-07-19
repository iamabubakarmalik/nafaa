import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Receipt, TrendingUp, Wallet, Gem, Scale,
  Search, X, Calendar, Package, User,
  Banknote, CreditCard, Smartphone, Building2, Zap,
  Eye, Download, RefreshCw, Award, ArrowRight, Coins,
  ShieldCheck, Repeat, Clock, BarChart3, Lock, Unlock,
  EyeOff, Shield, CalendarRange, Sparkles,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { salesApi, type PaymentMethod } from '@/api/sales.api';
import { jewelrySalesApi } from '../api/sales.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { useSalesPrivacy } from '@/features/sales/hooks/useSalesPrivacy';
import { SalesPrivacyModal } from '@/features/sales/components/SalesPrivacyModal';
import { HiddenAmount } from '@/features/sales/components/HiddenAmount';
import { toast } from 'sonner';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const paymentConfig: Record<string, { label: string; icon: any; color: string }> = {
  CASH: { label: 'Cash', icon: Banknote, color: '#16a34a' },
  CARD: { label: 'Card', icon: CreditCard, color: '#2563eb' },
  BANK: { label: 'Bank', icon: Building2, color: '#7c3aed' },
  BANK_TRANSFER: { label: 'Bank', icon: Building2, color: '#7c3aed' },
  JAZZCASH: { label: 'JazzCash', icon: Smartphone, color: '#f97316' },
  EASYPAISA: { label: 'EasyPaisa', icon: Zap, color: '#22c55e' },
  MIXED: { label: 'Mixed', icon: Sparkles, color: '#8b5cf6' },
};

const METAL_ICONS: Record<string, string> = {
  GOLD: '🥇', SILVER: '🥈', PLATINUM: '💠',
  ROSE_GOLD: '🌹', WHITE_GOLD: '⚪',
};

const METAL_COLORS: Record<string, string> = {
  GOLD: 'bg-amber-100 text-amber-700 border-amber-300',
  SILVER: 'bg-slate-100 text-slate-700 border-slate-300',
  PLATINUM: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  ROSE_GOLD: 'bg-rose-100 text-rose-700 border-rose-300',
  WHITE_GOLD: 'bg-slate-200 text-slate-800 border-slate-400',
};

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export default function JewelrySalesPage() {
  const privacy = useSalesPrivacy();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [metalFilter, setMetalFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [exchangeOnly, setExchangeOnly] = useState(false);
  const [hallmarkOnly, setHallmarkOnly] = useState(false);
  const [privacyModal, setPrivacyModal] = useState<'unlock' | 'setup' | 'disable' | null>(null);

  useEffect(() => {
    if (privacy.isLocked && !privacyModal) setPrivacyModal('unlock');
  }, [privacy.isLocked, privacyModal]);

  const { data: jewelrySales = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['jewelry-sales-list'],
    queryFn: () => jewelrySalesApi.list({}),
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
    else if (dateFilter === 'all') start = new Date(0);
    return [start, end];
  };

  const filteredSales = useMemo(() => {
    let list = [...(jewelrySales as any[])];
    const [start, end] = getDateRange();
    list = list.filter((s) => { const d = new Date(s.soldAt || s.createdAt); return d >= start && d <= end; });
    if (metalFilter !== 'all') {
      list = list.filter((s) => (s.items || []).some((it: any) => it.metalType === metalFilter));
    }
    if (paymentFilter !== 'all') list = list.filter((s) => s.paymentMethod === paymentFilter);
    if (exchangeOnly) list = list.filter((s) => s.exchangeValue > 0);
    if (hallmarkOnly) list = list.filter((s) => s.hallmarkVerified);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((s) =>
        s.invoiceNumber?.toLowerCase().includes(q) ||
        s.customerName?.toLowerCase().includes(q) ||
        s.customerPhone?.toLowerCase().includes(q) ||
        s.customerCnic?.toLowerCase().includes(q) ||
        (s.items || []).some((it: any) => it.productName?.toLowerCase().includes(q) || it.hallmarkNumber?.toLowerCase().includes(q)),
      );
    }
    return list.sort((a: any, b: any) => new Date(b.soldAt || b.createdAt).getTime() - new Date(a.soldAt || a.createdAt).getTime());
  }, [jewelrySales, dateFilter, customStart, customEnd, metalFilter, paymentFilter, exchangeOnly, hallmarkOnly, search]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((s: number, x: any) => s + Number(x.total || 0), 0);
    const totalWeight = filteredSales.reduce((s: number, x: any) => {
      return s + (x.items || []).reduce((ws: number, it: any) => ws + Number(it.netWeight || 0) * Number(it.quantity || 0), 0);
    }, 0);
    const exchangeCount = filteredSales.filter((s: any) => s.exchangeValue > 0).length;
    const totalExchange = filteredSales.reduce((s: number, x: any) => s + Number(x.exchangeValue || 0), 0);
    return { totalRevenue, totalWeight, exchangeCount, totalExchange, count: filteredSales.length };
  }, [filteredSales]);

  const metalBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; weight: number; revenue: number }>();
    filteredSales.forEach((s: any) => {
      (s.items || []).forEach((it: any) => {
        const key = it.metalType || 'OTHER';
        const existing = map.get(key) ?? { count: 0, weight: 0, revenue: 0 };
        existing.count += 1;
        existing.weight += Number(it.netWeight || 0) * Number(it.quantity || 0);
        existing.revenue += (Number(it.netWeight || 0) * Number(it.ratePerGram || 0)) * Number(it.quantity || 0);
        map.set(key, existing);
      });
    });
    return Array.from(map.entries()).map(([metal, data]) => ({ metal, ...data }));
  }, [filteredSales]);

  const exportCSV = () => {
    if (filteredSales.length === 0) return;
    const headers = ['Invoice #', 'Date', 'Customer', 'Phone', 'CNIC', 'Metal', 'Purity', 'Net Weight (g)', 'Rate/g', 'Making %', 'Wastage %', 'GST', 'Discount', 'Exchange', 'Total', 'Paid', 'Balance'];
    const rows: any[] = [];
    filteredSales.forEach((s: any) => {
      (s.items || []).forEach((it: any) => {
        rows.push([
          s.invoiceNumber, new Date(s.soldAt || s.createdAt).toLocaleString('en-PK'),
          s.customerName || 'Walk-in', s.customerPhone || '', s.customerCnic || '',
          it.metalType, it.purity, Number(it.netWeight || 0).toFixed(3),
          it.ratePerGram, it.makingChargePct, it.wastagePct,
          s.gstAmount, s.discount, s.exchangeValue,
          s.total, s.paidAmount, ((s.total || 0) - (s.paidAmount || 0)),
        ]);
      });
    });
    const csv = [headers, ...rows].map((r) => r.map((c: any) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jewelry-sales-${new Date().toISOString().slice(0, 10)}.csv`;
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
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-amber-600 to-yellow-700 mx-auto flex items-center justify-center shadow-xl shadow-amber-500/30">
              <Lock className="h-12 w-12 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-slate-900">🔒 Sales Locked</h2>
            <p className="mt-2 text-slate-600 font-semibold">Jewelry sales data password protected hai.</p>
            <Button size="lg" className="mt-6 bg-gradient-to-r from-amber-600 to-yellow-700" onClick={() => setPrivacyModal('unlock')}>
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-700 text-white p-6 sm:p-8 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-yellow-400/15 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-semibold">
                <Gem className="h-3.5 w-3.5 text-amber-300" />
                Jewelry Sales
                {privacy.isEnabled && (<><span className="text-white/40">•</span><Shield className="h-3 w-3 text-emerald-300" /><span className="text-emerald-300">Protected</span></>)}
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Jewelry Sales History</h1>
              <p className="mt-2 text-sm text-white/80">Hallmark tracking, live rates, exchange history — sab yahan</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={privacy.toggleHideStats} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold backdrop-blur border ${hideAmounts ? 'bg-amber-500/30 border-amber-300/40' : 'bg-white/10 border-white/20'}`}>
                {hideAmounts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}<span className="hidden sm:inline">{hideAmounts ? 'Show' : 'Hide'}</span>
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
                <button onClick={() => setPrivacyModal('setup')} className="inline-flex items-center gap-2 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 px-3 py-2.5 text-sm font-bold border border-amber-300/40">
                  <Shield className="h-4 w-4" /><span className="hidden sm:inline">Enable Privacy</span>
                </button>
              )}
              <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold border border-white/20 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Refresh</span>
              </button>
              <Link to="/pos"><Button className="bg-white text-slate-900 hover:bg-slate-100"><Gem className="h-4 w-4" /> New Sale</Button></Link>
            </div>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total Revenue" value={showValue(formatPKR(stats.totalRevenue))} sub={`${stats.count} sales`} icon={TrendingUp} color="emerald" />
          <StatCard label="Total Weight" value={`${stats.totalWeight.toFixed(2)}g`} sub="Metal sold" icon={Scale} color="amber" isHighlight />
          <StatCard label="Exchanges" value={String(stats.exchangeCount)} sub={showValue(formatPKR(stats.totalExchange))} icon={Repeat} color="violet" />
          <StatCard label="Metals Sold" value={String(metalBreakdown.length)} sub="Different metal types" icon={Coins} color="blue" />
        </section>

        {!hideAmounts && metalBreakdown.length > 0 && (
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="text-lg font-bold text-slate-900">Metal Type Breakdown</h3><p className="text-xs text-slate-500">Revenue by metal</p></div>
              <BarChart3 className="h-5 w-5 text-amber-500" />
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metalBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="metal" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="revenue" fill="#d97706" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice #, customer, hallmark, CNIC..." className="h-11 w-full rounded-xl border-2 border-slate-200 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-amber-500" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-slate-400" /></button>}
            </div>
            <button onClick={() => setExchangeOnly(!exchangeOnly)}
              className={`h-11 px-4 rounded-xl border-2 font-bold text-sm inline-flex items-center gap-2 ${exchangeOnly ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-700'}`}>
              <Repeat className="h-4 w-4" /> Exchange only
            </button>
            <button onClick={() => setHallmarkOnly(!hallmarkOnly)}
              className={`h-11 px-4 rounded-xl border-2 font-bold text-sm inline-flex items-center gap-2 ${hallmarkOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'}`}>
              <ShieldCheck className="h-4 w-4" /> Hallmark
            </button>
            {filteredSales.length > 0 && <button onClick={exportCSV} className="h-11 px-4 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 font-bold text-sm text-slate-700 inline-flex items-center gap-2"><Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span></button>}
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
                <button key={d.v} onClick={() => setDateFilter(d.v)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${dateFilter === d.v ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {d.l}
                </button>
              ))}
            </div>
            {dateFilter === 'custom' && (
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-amber-50 border-2 border-amber-200 p-3">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">From Date</label>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-10 w-full rounded-lg border-2 border-amber-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">To Date</label>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-10 w-full rounded-lg border-2 border-amber-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 block">Metal Type</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setMetalFilter('all')} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${metalFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>All Metals</button>
              {['GOLD', 'SILVER', 'PLATINUM', 'ROSE_GOLD', 'WHITE_GOLD'].map((m) => (
                <button key={m} onClick={() => setMetalFilter(m)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold border-2 ${metalFilter === m ? METAL_COLORS[m] : 'bg-white border-slate-200 text-slate-700'}`}>
                  {METAL_ICONS[m]} {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 block">Payment Method</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setPaymentFilter('all')} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${paymentFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>All Payments</button>
              {Object.entries(paymentConfig).map(([k, cfg]) => (
                <button key={k} onClick={() => setPaymentFilter(k)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 ${paymentFilter === k ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  <cfg.icon className="h-3 w-3" />{cfg.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />)}</div>
          ) : filteredSales.length === 0 ? (
            <div className="p-12 text-center"><Gem className="h-16 w-16 text-slate-400 mx-auto mb-3" /><p className="font-extrabold text-slate-700 text-lg">No jewelry sales found</p><p className="text-xs text-slate-500 mt-1">Try different date range or filters</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredSales.map((sale: any) => {
                const PayIcon = paymentConfig[sale.paymentMethod]?.icon || CreditCard;
                const itemCount = (sale.items || []).length;
                const totalItemWeight = (sale.items || []).reduce((s: number, it: any) => s + Number(it.netWeight || 0) * Number(it.quantity || 0), 0);
                return (
                  <Link key={sale.id} to={`/jewelry/sales/${sale.id}/receipt`} className="block px-5 py-4 hover:bg-amber-50/50 transition group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><Gem className="h-5 w-5" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-extrabold text-slate-900">{sale.invoiceNumber}</span>
                            {sale.hallmarkVerified && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold inline-flex items-center gap-1"><ShieldCheck className="h-2.5 w-2.5" />HALLMARK</span>}
                            {sale.exchangeValue > 0 && <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-extrabold inline-flex items-center gap-1"><Repeat className="h-2.5 w-2.5" />EXCHANGE</span>}
                            {sale.customerCnic && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold">CNIC</span>}
                          </div>
                          <div className="mt-1 text-xs text-slate-600 font-semibold flex items-center gap-2 flex-wrap">
                            <User className="h-3 w-3" />{sale.customerName || 'Walk-in'}
                            {sale.customerPhone && <><span>•</span><span>{sale.customerPhone}</span></>}
                            <span>•</span><Package className="h-3 w-3" />{itemCount} items • {totalItemWeight.toFixed(2)}g
                          </div>
                          <div className="mt-1 text-[10px] text-slate-500 inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{formatDate(sale.soldAt || sale.createdAt)}</div>

                          <div className="mt-2 flex flex-wrap gap-1">
                            {(sale.items || []).slice(0, 3).map((it: any, i: number) => (
                              <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${METAL_COLORS[it.metalType] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                {METAL_ICONS[it.metalType]} {it.productName} • {Number(it.netWeight).toFixed(2)}g
                              </span>
                            ))}
                            {itemCount > 3 && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">+{itemCount - 3} more</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-extrabold text-amber-700 tabular-nums"><HiddenAmount value={formatPKR(sale.total)} hidden={hideAmounts} /></div>
                        <div className="text-[10px] text-slate-500 inline-flex items-center justify-end gap-1 mt-0.5"><PayIcon className="h-2.5 w-2.5" />{paymentConfig[sale.paymentMethod]?.label}</div>
                        {(sale.total - sale.paidAmount) > 0 && <div className="text-[10px] text-amber-700 font-extrabold mt-0.5">Balance: <HiddenAmount value={formatPKR(sale.total - sale.paidAmount)} hidden={hideAmounts} /></div>}
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-600 group-hover:text-amber-700"><Eye className="h-3 w-3" /> Invoice <ArrowRight className="h-3 w-3" /></div>
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

function StatCard({ label, value, sub, icon: Icon, color, isHighlight }: any) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600', blue: 'from-blue-500 to-blue-700',
    violet: 'from-violet-500 to-purple-600', amber: 'from-amber-500 to-orange-600',
  };
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${isHighlight ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300' : 'bg-white border-slate-200'}`}>
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
