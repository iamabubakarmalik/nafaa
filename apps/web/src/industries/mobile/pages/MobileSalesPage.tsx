import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Receipt, TrendingUp, Wallet, Smartphone,
  Search, X, Calendar, Package, User,
  Banknote, CreditCard, Building2, Zap,
  Eye, Download, RefreshCw, Award, ArrowRight,
  ShieldCheck, Hash, Palette, Clock,
  BarChart3, Lock, Unlock, EyeOff, Shield, Wrench, CalendarRange,
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

const PTA_LABELS: Record<string, string> = {
  APPROVED: 'PTA Approved', NON_PTA: 'Non-PTA', PATCH: 'PTA Patched',
  PENDING: 'PTA Pending', EXEMPT: 'PTA Exempt',
};
const PTA_COLORS: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  NON_PTA: 'bg-rose-100 text-rose-700 border-rose-300',
  PATCH: 'bg-amber-100 text-amber-700 border-amber-300',
  PENDING: 'bg-blue-100 text-blue-700 border-blue-300',
  EXEMPT: 'bg-slate-100 text-slate-700 border-slate-300',
};

const paymentConfig: Record<string, { label: string; icon: any; color: string }> = {
  CASH: { label: 'Cash', icon: Banknote, color: '#16a34a' },
  CARD: { label: 'Card', icon: CreditCard, color: '#2563eb' },
  JAZZCASH: { label: 'JazzCash', icon: Smartphone, color: '#f97316' },
  EASYPAISA: { label: 'EasyPaisa', icon: Zap, color: '#22c55e' },
  BANK_TRANSFER: { label: 'Bank', icon: Building2, color: '#7c3aed' },
};

type View = 'imei' | 'emi' | 'sales';
type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export default function MobileSalesPage() {
  const privacy = useSalesPrivacy();
  const [view, setView] = useState<View>('imei');
  const [search, setSearch] = useState('');
  const [ptaFilter, setPtaFilter] = useState<string>('all');
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

  const imeiSales = useMemo(() => sales.filter((s) => s.items.some((it: any) => (it.imeis?.length ?? 0) > 0)), [sales]);
  const emiSales = useMemo(() => sales.filter((s) => s.creditAmount > 0 && s.items.some((it: any) => (it.imeis?.length ?? 0) > 0)), [sales]);

  const imeiStats = useMemo(() => {
    let devicesSold = 0, ptaApproved = 0, nonPta = 0, warrantyMonths = 0;
    imeiSales.forEach((s) => {
      s.items.forEach((it: any) => {
        (it.imeis || []).forEach((imei: any) => {
          devicesSold++;
          if (imei.ptaStatus === 'APPROVED') ptaApproved++;
          if (imei.ptaStatus === 'NON_PTA') nonPta++;
          warrantyMonths += imei.warrantyMonths || 0;
        });
      });
    });
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
    if (q) {
      list = list.filter((s) =>
        s.saleNumber.toLowerCase().includes(q) ||
        s.customer?.name?.toLowerCase().includes(q) ||
        s.customer?.phone?.toLowerCase().includes(q) ||
        s.items.some((it: any) =>
          it.product.name.toLowerCase().includes(q) ||
          (it.imeis || []).some((imei: any) => imei.imei1?.toLowerCase().includes(q) || imei.imei2?.toLowerCase().includes(q))
        )
      );
    }
    return list.sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
  }, [sales, imeiSales, emiSales, view, dateFilter, customStart, customEnd, paymentFilter, ptaFilter, search]);

  const ptaBreakdown = useMemo(() => {
    const counts: Record<string, number> = { APPROVED: 0, NON_PTA: 0, PATCH: 0, PENDING: 0, EXEMPT: 0 };
    imeiSales.forEach((s) => {
      s.items.forEach((it: any) => {
        (it.imeis || []).forEach((imei: any) => {
          if (imei.ptaStatus && counts[imei.ptaStatus] !== undefined) counts[imei.ptaStatus]++;
        });
      });
    });
    return Object.entries(counts).filter(([_, v]) => v > 0).map(([k, v]) => ({ status: PTA_LABELS[k] || k, count: v }));
  }, [imeiSales]);

  const exportCSV = () => {
    if (filteredList.length === 0) return;
    const headers = ['Sale #', 'Date', 'Customer', 'Phone', 'Device', 'IMEI 1', 'IMEI 2', 'PTA', 'Warranty', 'Amount', 'Paid', 'Credit'];
    const rows: any[] = [];
    filteredList.forEach((s) => {
      s.items.forEach((it: any) => {
        const imeis = it.imeis || [];
        if (imeis.length > 0) {
          imeis.forEach((imei: any) => {
            rows.push([s.saleNumber, new Date(s.soldAt).toLocaleString('en-PK'), s.customer?.name || 'Walk-in', s.customer?.phone || '', it.product.name, imei.imei1, imei.imei2 || '', PTA_LABELS[imei.ptaStatus] || '', imei.warrantyMonths || 0, s.total.toFixed(2), s.paidAmount.toFixed(2), s.creditAmount.toFixed(2)]);
          });
        }
      });
    });
    const csv = [headers, ...rows].map((r) => r.map((c: any) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-sales-${new Date().toISOString().slice(0, 10)}.csv`;
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
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 mx-auto flex items-center justify-center shadow-xl shadow-blue-500/30">
              <Lock className="h-12 w-12 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-slate-900">🔒 Sales Locked</h2>
            <p className="mt-2 text-slate-600 font-semibold">Mobile sales data password protected hai.</p>
            <Button size="lg" className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-700" onClick={() => setPrivacyModal('unlock')}>
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-white p-6 sm:p-8 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-400/15 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-semibold">
                <Smartphone className="h-3.5 w-3.5 text-amber-300" />
                Mobile Sales & IMEI Tracker
                {privacy.isEnabled && (<><span className="text-white/40">•</span><Shield className="h-3 w-3 text-emerald-300" /><span className="text-emerald-300">Protected</span></>)}
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Device Sales History</h1>
              <p className="mt-2 text-sm text-white/80">Har IMEI, har warranty, har EMI plan — sab track</p>
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
                <button onClick={() => setPrivacyModal('setup')} className="inline-flex items-center gap-2 rounded-xl bg-blue-500/30 hover:bg-blue-500/50 px-3 py-2.5 text-sm font-bold border border-blue-300/40">
                  <Shield className="h-4 w-4" /><span className="hidden sm:inline">Enable Privacy</span>
                </button>
              )}
              <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold border border-white/20 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Refresh</span>
              </button>
              <Link to="/pos"><Button className="bg-white text-slate-900 hover:bg-slate-100"><Smartphone className="h-4 w-4" /> New Sale</Button></Link>
            </div>
          </div>
        </section>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setView('imei')} className={`px-5 py-3 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 ${view === 'imei' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700'}`}>
            <Smartphone className="h-4 w-4" /> IMEI Sales ({imeiSales.length})
          </button>
          <button onClick={() => setView('emi')} className={`px-5 py-3 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 ${view === 'emi' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700'}`}>
            <Wrench className="h-4 w-4" /> EMI Sales ({emiSales.length})
          </button>
          <button onClick={() => setView('sales')} className={`px-5 py-3 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 ${view === 'sales' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700'}`}>
            <Receipt className="h-4 w-4" /> All Sales ({sales.length})
          </button>
        </div>

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Devices Sold" value={String(imeiStats.devicesSold)} sub={`${imeiSales.length} sales`} icon={Smartphone} color="blue" />
          <StatCard label="PTA Approved" value={String(imeiStats.ptaApproved)} sub={`${imeiStats.nonPta} non-PTA`} icon={ShieldCheck} color="emerald" />
          <StatCard label="Avg Warranty" value={`${imeiStats.avgWarranty.toFixed(1)}m`} sub="Per device" icon={Award} color="violet" />
          <StatCard label="Device Revenue" value={showValue(formatPKR(imeiStats.revenue))} sub="From IMEI sales" icon={Wallet} color="amber" />
        </section>

        {!hideAmounts && ptaBreakdown.length > 0 && (
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="text-lg font-bold text-slate-900">PTA Status Breakdown</h3><p className="text-xs text-slate-500">Devices by PTA compliance</p></div>
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ptaBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="status" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search IMEI, customer, device..." className="h-11 w-full rounded-xl border-2 border-slate-200 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-slate-400" /></button>}
            </div>
            {filteredList.length > 0 && <button onClick={exportCSV} className="h-11 px-4 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 font-bold text-sm text-slate-700 inline-flex items-center gap-2"><Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span></button>}
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
                <button key={d.v} onClick={() => setDateFilter(d.v)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${dateFilter === d.v ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {d.l}
                </button>
              ))}
            </div>
            {dateFilter === 'custom' && (
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-blue-50 border-2 border-blue-200 p-3">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">From Date</label>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-10 w-full rounded-lg border-2 border-blue-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">To Date</label>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-10 w-full rounded-lg border-2 border-blue-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                </div>
                {customStart && customEnd && (
                  <div className="col-span-2 text-xs font-bold text-blue-800 inline-flex items-center gap-1"><Calendar className="h-3 w-3" />
                    Showing {new Date(customStart).toLocaleDateString('en-PK')} to {new Date(customEnd).toLocaleDateString('en-PK')}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 block">PTA Status</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setPtaFilter('all')} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${ptaFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>All PTA</button>
              {Object.entries(PTA_LABELS).map(([k, l]) => (
                <button key={k} onClick={() => setPtaFilter(k)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 border-2 ${ptaFilter === k ? PTA_COLORS[k] : 'bg-white border-slate-200 text-slate-700'}`}>
                  <ShieldCheck className="h-3 w-3" />{l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 block">Payment Method</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setPaymentFilter('all')} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${paymentFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>All Payments</button>
              {Object.entries(paymentConfig).map(([k, cfg]) => (
                <button key={k} onClick={() => setPaymentFilter(k as PaymentMethod)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 ${paymentFilter === k ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
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
            <div className="p-12 text-center"><Smartphone className="h-16 w-16 text-slate-400 mx-auto mb-3" /><p className="font-extrabold text-slate-700 text-lg">No sales found</p><p className="text-xs text-slate-500 mt-1">Try different date range or filters</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredList.map((sale) => {
                const imeiItems = sale.items.filter((it: any) => (it.imeis?.length ?? 0) > 0);
                const totalImeis = imeiItems.reduce((sum: number, it: any) => sum + (it.imeis?.length ?? 0), 0);
                const PayIcon = paymentConfig[sale.paymentMethod]?.icon || CreditCard;
                return (
                  <Link key={sale.id} to={`/sales/${sale.id}/receipt`} className="block px-5 py-4 hover:bg-blue-50/50 transition group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0"><Smartphone className="h-5 w-5" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-extrabold text-slate-900">{sale.saleNumber}</span>
                            {sale.status === 'VOIDED' && <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">VOIDED</span>}
                            {totalImeis > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold inline-flex items-center gap-1"><Hash className="h-2.5 w-2.5" />{totalImeis} device{totalImeis !== 1 ? 's' : ''}</span>}
                            {sale.creditAmount > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold inline-flex items-center gap-1"><Wrench className="h-2.5 w-2.5" />EMI/Udhaar</span>}
                          </div>
                          <div className="mt-1 text-xs text-slate-600 font-semibold flex items-center gap-2 flex-wrap">
                            <User className="h-3 w-3" />{sale.customer?.name || 'Walk-in'}
                            {sale.customer?.phone && <><span>•</span><span>{sale.customer.phone}</span></>}
                          </div>
                          <div className="mt-1 text-[10px] text-slate-500 inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{formatDate(sale.soldAt)}</div>

                          {imeiItems.map((it: any) => (
                            <div key={it.id} className="mt-2 pl-3 border-l-2 border-blue-200 space-y-1">
                              <div className="font-extrabold text-sm text-slate-900">{it.product.name}</div>
                              {(it.imeis || []).map((imei: any) => {
                                const ptaCfg = PTA_COLORS[imei.ptaStatus] || PTA_COLORS.PENDING;
                                return (
                                  <div key={imei.id} className="flex items-center gap-2 flex-wrap text-[10px]">
                                    <span className="font-mono font-extrabold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">IMEI: {imei.imei1}</span>
                                    {imei.ptaStatus && <span className={`px-1.5 py-0.5 rounded border-2 font-extrabold uppercase ${ptaCfg}`}><ShieldCheck className="h-2.5 w-2.5 inline mr-0.5" />{PTA_LABELS[imei.ptaStatus]}</span>}
                                    {imei.warrantyMonths > 0 && <span className="text-teal-700 font-bold inline-flex items-center gap-0.5"><Award className="h-2.5 w-2.5" />{imei.warrantyMonths}m</span>}
                                    {imei.color && <span className="text-violet-700 font-bold inline-flex items-center gap-0.5"><Palette className="h-2.5 w-2.5" />{imei.color}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-extrabold text-blue-700 tabular-nums"><HiddenAmount value={formatPKR(sale.total)} hidden={hideAmounts} /></div>
                        <div className="text-[10px] text-slate-500 inline-flex items-center justify-end gap-1 mt-0.5"><PayIcon className="h-2.5 w-2.5" />{paymentConfig[sale.paymentMethod]?.label}</div>
                        {sale.creditAmount > 0 && <div className="text-[10px] text-amber-700 font-extrabold mt-0.5">Balance: <HiddenAmount value={formatPKR(sale.creditAmount)} hidden={hideAmounts} /></div>}
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-600 group-hover:text-blue-700"><Eye className="h-3 w-3" /> Invoice <ArrowRight className="h-3 w-3" /></div>
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
