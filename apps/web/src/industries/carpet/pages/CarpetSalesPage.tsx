import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Receipt, TrendingUp, Wallet, Layers, Scissors,
  Search, X, Calendar, Package, User, Ruler,
  Banknote, CreditCard, Smartphone, Building2, Zap,
  Eye, Download, RefreshCw, ArrowRight,
  Wrench, Clock, BarChart3, Lock, Unlock, EyeOff, Shield, CalendarRange,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
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

function parseCarpetNote(note?: string | null) {
  if (!note) return { type: null as 'roll' | 'cut-piece' | null, reference: '', dimensions: '', area: '' };
  const rollMatch = note.match(/Cut from ([\w-]+):\s*([\d.]+\s*ft(?:\s+\d+in)?\s*[xX×]\s*[\d.]+\s*ft(?:\s+\d+in)?)(?:\s*=\s*([\d.]+\s*\w+))?/);
  if (rollMatch) return { type: 'roll' as const, reference: rollMatch[1], dimensions: rollMatch[2], area: rollMatch[3] || '' };
  const cutMatch = note.match(/Cut piece ([\w-]+)(?:\s*[•·]\s*([\d.]+\s*ft\s*[xX×]\s*[\d.]+\s*ft))?/);
  if (cutMatch) return { type: 'cut-piece' as const, reference: cutMatch[1], dimensions: cutMatch[2] || '', area: '' };
  return { type: null, reference: '', dimensions: '', area: '' };
}

type View = 'rolls' | 'pieces' | 'services' | 'all';
type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export default function CarpetSalesPage() {
  const privacy = useSalesPrivacy();
  const [view, setView] = useState<View>('rolls');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
  const [privacyModal, setPrivacyModal] = useState<'unlock' | 'setup' | 'disable' | null>(null);

  useEffect(() => {
    if (privacy.isLocked && !privacyModal) setPrivacyModal('unlock');
  }, [privacy.isLocked, privacyModal]);

  const { data: sales = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sales-list'],
    queryFn: () => salesApi.list(),
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

  const rollSales = useMemo(() => sales.filter((s) => s.items.some((it: any) => parseCarpetNote(it.note).type === 'roll')), [sales]);
  const pieceSales = useMemo(() => sales.filter((s) => s.items.some((it: any) => parseCarpetNote(it.note).type === 'cut-piece')), [sales]);
  const serviceSales = useMemo(() => sales.filter((s) => (s.serviceCharges ?? 0) > 0), [sales]);

  const carpetStats = useMemo(() => {
    let totalSqft = 0, rollCuts = 0, pieceSold = 0, servicesTotal = 0, carpetRevenue = 0;
    sales.forEach((s) => {
      s.items.forEach((it: any) => {
        const carpet = parseCarpetNote(it.note);
        if (['sqft', 'sqm', 'sqyd'].includes(it.product.unit)) { totalSqft += Number(it.quantity || 0); carpetRevenue += Number(it.total || 0); }
        if (carpet.type === 'roll') rollCuts++;
        if (carpet.type === 'cut-piece') pieceSold++;
      });
      servicesTotal += Number(s.serviceCharges || 0);
    });
    return { totalSqft, rollCuts, pieceSold, servicesTotal, carpetRevenue };
  }, [sales]);

  const filteredList = useMemo(() => {
    let list = view === 'rolls' ? [...rollSales] : view === 'pieces' ? [...pieceSales] : view === 'services' ? [...serviceSales] : [...sales];
    const [start, end] = getDateRange();
    list = list.filter((s) => { const d = new Date(s.soldAt); return d >= start && d <= end; });
    if (paymentFilter !== 'all') list = list.filter((s) => s.paymentMethod === paymentFilter);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((s) =>
        s.saleNumber.toLowerCase().includes(q) ||
        s.customer?.name?.toLowerCase().includes(q) ||
        s.customer?.phone?.toLowerCase().includes(q) ||
        s.items.some((it: any) => it.product.name.toLowerCase().includes(q) || (it.note || '').toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
  }, [sales, rollSales, pieceSales, serviceSales, view, dateFilter, customStart, customEnd, paymentFilter, search]);

  const sqftTrend = useMemo(() => {
    const buckets: Record<string, { date: string; label: string; sqft: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { date: key, label: d.toLocaleDateString('en-PK', { weekday: 'short' }), sqft: 0 };
    }
    sales.forEach((s) => {
      const key = new Date(s.soldAt).toISOString().slice(0, 10);
      if (buckets[key]) {
        s.items.forEach((it: any) => {
          if (['sqft', 'sqm', 'sqyd'].includes(it.product.unit)) buckets[key].sqft += Number(it.quantity || 0);
        });
      }
    });
    return Object.values(buckets);
  }, [sales]);

  const exportCSV = () => {
    if (filteredList.length === 0) return;
    const headers = ['Sale #', 'Date', 'Customer', 'Phone', 'Product', 'Type', 'Reference', 'Dimensions', 'Sqft', 'Rate', 'Total'];
    const rows: any[] = [];
    filteredList.forEach((s) => {
      s.items.forEach((it: any) => {
        const carpet = parseCarpetNote(it.note);
        rows.push([s.saleNumber, new Date(s.soldAt).toLocaleString('en-PK'), s.customer?.name || 'Walk-in', s.customer?.phone || '', it.product.name, carpet.type || 'accessory', carpet.reference || '', carpet.dimensions || '', it.quantity.toFixed(2), it.price.toFixed(2), it.total.toFixed(2)]);
      });
    });
    const csv = [headers, ...rows].map((r) => r.map((c: any) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carpet-sales-${new Date().toISOString().slice(0, 10)}.csv`;
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
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <Lock className="h-12 w-12 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-slate-900">🔒 Sales Locked</h2>
            <p className="mt-2 text-slate-600 font-semibold">Carpet sales data password protected hai.</p>
            <Button size="lg" className="mt-6 bg-gradient-to-r from-emerald-600 to-teal-700" onClick={() => setPrivacyModal('unlock')}>
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 sm:p-8 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-semibold">
                <Layers className="h-3.5 w-3.5 text-amber-300" />
                Carpet Sales & Roll Traceability
                {privacy.isEnabled && (<><span className="text-white/40">•</span><Shield className="h-3 w-3 text-emerald-300" /><span className="text-emerald-300">Protected</span></>)}
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Carpet Cut Certificates</h1>
              <p className="mt-2 text-sm text-white/80">Har roll cut, har piece, har service — full traceability</p>
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
                <button onClick={() => setPrivacyModal('setup')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/50 px-3 py-2.5 text-sm font-bold border border-emerald-300/40">
                  <Shield className="h-4 w-4" /><span className="hidden sm:inline">Enable Privacy</span>
                </button>
              )}
              <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold border border-white/20 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Refresh</span>
              </button>
              <Link to="/pos"><Button className="bg-white text-slate-900 hover:bg-slate-100"><Layers className="h-4 w-4" /> New Sale</Button></Link>
            </div>
          </div>
        </section>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setView('rolls')} className={`px-5 py-3 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 ${view === 'rolls' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700'}`}>
            <Layers className="h-4 w-4" /> Roll Cuts ({rollSales.length})
          </button>
          <button onClick={() => setView('pieces')} className={`px-5 py-3 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 ${view === 'pieces' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700'}`}>
            <Scissors className="h-4 w-4" /> Cut Pieces ({pieceSales.length})
          </button>
          <button onClick={() => setView('services')} className={`px-5 py-3 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 ${view === 'services' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700'}`}>
            <Wrench className="h-4 w-4" /> Services ({serviceSales.length})
          </button>
          <button onClick={() => setView('all')} className={`px-5 py-3 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 ${view === 'all' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700'}`}>
            <Receipt className="h-4 w-4" /> All ({sales.length})
          </button>
        </div>

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total Sqft Sold" value={`${carpetStats.totalSqft.toFixed(0)} sqft`} sub={`${carpetStats.rollCuts} roll cuts`} icon={Ruler} color="emerald" />
          <StatCard label="Cut Pieces Sold" value={String(carpetStats.pieceSold)} sub="From inventory" icon={Scissors} color="violet" />
          <StatCard label="Service Revenue" value={showValue(formatPKR(carpetStats.servicesTotal))} sub="Installation, glue, etc." icon={Wrench} color="amber" />
          <StatCard label="Carpet Revenue" value={showValue(formatPKR(carpetStats.carpetRevenue))} sub="From sqft sales" icon={Wallet} color="blue" />
        </section>

        {!hideAmounts && (
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="text-lg font-bold text-slate-900">Last 7 Days — Sqft Sold</h3><p className="text-xs text-slate-500">Daily carpet cut volume</p></div>
              <BarChart3 className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sqftTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)} sqft`} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Bar dataKey="sqft" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sale #, roll #, piece code, customer..." className="h-11 w-full rounded-xl border-2 border-slate-200 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-slate-400" /></button>}
            </div>
            {filteredList.length > 0 && <button onClick={exportCSV} className="h-11 px-4 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 font-bold text-sm text-slate-700 inline-flex items-center gap-2"><Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span></button>}
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
                <button key={d.v} onClick={() => setDateFilter(d.v)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${dateFilter === d.v ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {d.l}
                </button>
              ))}
            </div>
            {dateFilter === 'custom' && (
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">From Date</label>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-10 w-full rounded-lg border-2 border-emerald-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">To Date</label>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-10 w-full rounded-lg border-2 border-emerald-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                </div>
                {customStart && customEnd && (
                  <div className="col-span-2 text-xs font-bold text-emerald-800 inline-flex items-center gap-1"><Calendar className="h-3 w-3" />
                    Showing {new Date(customStart).toLocaleDateString('en-PK')} to {new Date(customEnd).toLocaleDateString('en-PK')}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 block">Payment Method</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setPaymentFilter('all')} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${paymentFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>All Payments</button>
              {Object.entries(paymentConfig).map(([k, cfg]) => (
                <button key={k} onClick={() => setPaymentFilter(k as PaymentMethod)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 ${paymentFilter === k ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  <cfg.icon className="h-3 w-3" />{cfg.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />)}</div>
          ) : filteredList.length === 0 ? (
            <div className="p-12 text-center"><Layers className="h-16 w-16 text-slate-400 mx-auto mb-3" /><p className="font-extrabold text-slate-700 text-lg">No carpet sales found</p><p className="text-xs text-slate-500 mt-1">Try different date range or filters</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredList.map((sale) => {
                const carpetItems = sale.items.filter((it: any) => parseCarpetNote(it.note).type !== null || ['sqft', 'sqm', 'sqyd'].includes(it.product.unit));
                const totalSqft = sale.items.reduce((sum: number, it: any) => ['sqft', 'sqm', 'sqyd'].includes(it.product.unit) ? sum + Number(it.quantity || 0) : sum, 0);
                const PayIcon = paymentConfig[sale.paymentMethod]?.icon || CreditCard;
                return (
                  <Link key={sale.id} to={`/sales/${sale.id}/receipt`} className="block px-5 py-4 hover:bg-emerald-50/50 transition group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><Layers className="h-5 w-5" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-extrabold text-slate-900">{sale.saleNumber}</span>
                            {sale.status === 'VOIDED' && <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">VOIDED</span>}
                            {totalSqft > 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold inline-flex items-center gap-1"><Ruler className="h-2.5 w-2.5" />{totalSqft.toFixed(2)} sqft</span>}
                            {(sale.serviceCharges ?? 0) > 0 && <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-extrabold inline-flex items-center gap-1"><Wrench className="h-2.5 w-2.5" />Services +<HiddenAmount value={formatPKR(sale.serviceCharges ?? 0)} hidden={hideAmounts} /></span>}
                          </div>
                          <div className="mt-1 text-xs text-slate-600 font-semibold flex items-center gap-2 flex-wrap">
                            <User className="h-3 w-3" />{sale.customer?.name || 'Walk-in'}
                            {sale.customer?.phone && <><span>•</span><span>{sale.customer.phone}</span></>}
                          </div>
                          <div className="mt-1 text-[10px] text-slate-500 inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{formatDate(sale.soldAt)}</div>
                          <div className="mt-2 space-y-1">
                            {carpetItems.slice(0, 3).map((it: any) => {
                              const carpet = parseCarpetNote(it.note);
                              return (
                                <div key={it.id} className={`pl-3 border-l-2 ${carpet.type === 'roll' ? 'border-emerald-300' : carpet.type === 'cut-piece' ? 'border-violet-300' : 'border-slate-200'}`}>
                                  <div className="flex items-center gap-2 flex-wrap text-xs">
                                    {carpet.type === 'roll' && <Layers className="h-3 w-3 text-emerald-600" />}
                                    {carpet.type === 'cut-piece' && <Scissors className="h-3 w-3 text-violet-600" />}
                                    <span className="font-extrabold text-slate-900">{it.product.name}</span>
                                    {carpet.reference && <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">{carpet.type === 'roll' ? 'Roll' : 'Piece'}: {carpet.reference}</span>}
                                    {carpet.dimensions && <span className="text-[10px] font-bold text-slate-600 inline-flex items-center gap-0.5"><Ruler className="h-2.5 w-2.5" />{carpet.dimensions}</span>}
                                    <span className="text-[10px] font-bold text-emerald-700">{it.quantity.toFixed(2)} {it.product.unit} × {formatPKR(it.price)}</span>
                                  </div>
                                </div>
                              );
                            })}
                            {carpetItems.length > 3 && <div className="text-[10px] font-bold text-slate-500 pl-3">+{carpetItems.length - 3} more items</div>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-extrabold text-emerald-700 tabular-nums"><HiddenAmount value={formatPKR(sale.total)} hidden={hideAmounts} /></div>
                        <div className="text-[10px] text-slate-500 inline-flex items-center justify-end gap-1 mt-0.5"><PayIcon className="h-2.5 w-2.5" />{paymentConfig[sale.paymentMethod]?.label}</div>
                        {sale.creditAmount > 0 && <div className="text-[10px] text-amber-700 font-extrabold mt-0.5">Udhaar: <HiddenAmount value={formatPKR(sale.creditAmount)} hidden={hideAmounts} /></div>}
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 group-hover:text-emerald-700"><Eye className="h-3 w-3" /> Certificate <ArrowRight className="h-3 w-3" /></div>
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

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600', blue: 'from-blue-500 to-blue-700',
    violet: 'from-violet-500 to-purple-600', amber: 'from-amber-500 to-orange-600',
  };
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
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
