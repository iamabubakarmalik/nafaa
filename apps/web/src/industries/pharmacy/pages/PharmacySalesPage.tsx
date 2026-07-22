import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Receipt, TrendingUp, Wallet, Pill, FileText, Snowflake,
  Search, X, Calendar, Package, User, ShieldAlert,
  Banknote, CreditCard, Smartphone, Building2, Zap,
  Eye, Download, RefreshCw, Award, ArrowRight, Clock,
  BarChart3, Lock, Unlock, EyeOff, Shield, CalendarRange,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { medicinesApi } from '../api/medicines.api';
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

type View = 'all' | 'rx' | 'otc' | 'narcotic';
type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export default function PharmacySalesPage() {
  const privacy = useSalesPrivacy();
  const [view, setView] = useState<View>('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
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

  const { data: summary } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: () => salesApi.summary(),
    enabled: !privacy.isLocked,
  });

  const { data: medicines = [] } = useQuery({
    queryKey: ['pharmacy-medicines'],
    queryFn: () => medicinesApi.list({}),
    enabled: !privacy.isLocked,
  });

  const medicineMap = useMemo(() => {
    const map = new Map();
    for (const m of medicines) map.set(m.productId, m);
    return map;
  }, [medicines]);

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

  const filteredList = useMemo(() => {
    let list = [...sales];
    const [start, end] = getDateRange();
    list = list.filter((s) => { const d = new Date(s.soldAt); return d >= start && d <= end; });

    if (view === 'rx') {
      list = list.filter((s) => s.items.some((it: any) => medicineMap.get(it.product.id)?.requiresPrescription));
    } else if (view === 'otc') {
      list = list.filter((s) => s.items.every((it: any) => !medicineMap.get(it.product.id)?.requiresPrescription));
    } else if (view === 'narcotic') {
      list = list.filter((s) => s.items.some((it: any) => medicineMap.get(it.product.id)?.isNarcotic));
    }

    if (paymentFilter !== 'all') list = list.filter((s) => s.paymentMethod === paymentFilter);

    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((s) =>
        s.saleNumber.toLowerCase().includes(q) ||
        s.customer?.name?.toLowerCase().includes(q) ||
        s.customer?.phone?.toLowerCase().includes(q) ||
        s.items.some((it: any) => it.product.name.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
  }, [sales, medicineMap, view, dateFilter, customStart, customEnd, paymentFilter, search]);

  const stats = useMemo(() => {
    let rxCount = 0, otcCount = 0, narcoticCount = 0, rxRevenue = 0;
    for (const s of sales) {
      const hasRx = s.items.some((it: any) => medicineMap.get(it.product.id)?.requiresPrescription);
      const hasNarcotic = s.items.some((it: any) => medicineMap.get(it.product.id)?.isNarcotic);
      if (hasRx) { rxCount++; rxRevenue += s.total; }
      else otcCount++;
      if (hasNarcotic) narcoticCount++;
    }
    return { rxCount, otcCount, narcoticCount, rxRevenue };
  }, [sales, medicineMap]);

  const exportCSV = () => {
    if (filteredList.length === 0) return;
    const headers = ['Sale #', 'Date', 'Customer', 'Phone', 'Items', 'Rx', 'Payment', 'Total', 'Paid', 'Credit'];
    const rows = filteredList.map((s) => {
      const hasRx = s.items.some((it: any) => medicineMap.get(it.product.id)?.requiresPrescription);
      return [s.saleNumber, new Date(s.soldAt).toLocaleString('en-PK'), s.customer?.name || 'Walk-in',
        s.customer?.phone || '', s.items.length, hasRx ? 'Yes' : 'No',
        paymentConfig[s.paymentMethod]?.label, s.total.toFixed(2), s.paidAmount.toFixed(2), s.creditAmount.toFixed(2)];
    });
    const csv = [headers, ...rows].map((r) => r.map((c: any) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacy-sales-${new Date().toISOString().slice(0, 10)}.csv`;
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
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-teal-600 to-cyan-700 mx-auto flex items-center justify-center shadow-xl shadow-teal-500/30">
              <Lock className="h-12 w-12 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-slate-900">🔒 Sales Locked</h2>
            <p className="mt-2 text-slate-600 font-semibold">Pharmacy sales data password protected hai.</p>
            <Button size="lg" className="mt-6 bg-gradient-to-r from-teal-600 to-cyan-700" onClick={() => setPrivacyModal('unlock')}>
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-teal-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-semibold">
                <Pill className="h-3.5 w-3.5 text-amber-300" />
                Pharmacy Sales
                {privacy.isEnabled && (<><span className="text-white/40">•</span><Shield className="h-3 w-3 text-emerald-300" /><span className="text-emerald-300">Protected</span></>)}
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Prescription History</h1>
              <p className="mt-2 text-sm text-white/80">Rx dispensed, OTC sales, narcotic tracking</p>
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
                <button onClick={() => setPrivacyModal('setup')} className="inline-flex items-center gap-2 rounded-xl bg-teal-500/30 hover:bg-teal-500/50 px-3 py-2.5 text-sm font-bold border border-teal-300/40">
                  <Shield className="h-4 w-4" /><span className="hidden sm:inline">Enable Privacy</span>
                </button>
              )}
              <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold border border-white/20 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Refresh</span>
              </button>
              <Link to="/pos"><Button className="bg-white text-slate-900 hover:bg-slate-100"><Pill className="h-4 w-4" /> New Sale</Button></Link>
            </div>
          </div>
        </section>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setView('all')} className={`px-5 py-3 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 ${view === 'all' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700'}`}>
            <Receipt className="h-4 w-4" /> All ({sales.length})
          </button>
          <button onClick={() => setView('rx')} className={`px-5 py-3 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 ${view === 'rx' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700'}`}>
            <FileText className="h-4 w-4" /> Rx Sales ({stats.rxCount})
          </button>
          <button onClick={() => setView('otc')} className={`px-5 py-3 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 ${view === 'otc' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700'}`}>
            <Pill className="h-4 w-4" /> OTC ({stats.otcCount})
          </button>
          <button onClick={() => setView('narcotic')} className={`px-5 py-3 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 ${view === 'narcotic' ? 'bg-red-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700'}`}>
            <ShieldAlert className="h-4 w-4" /> Narcotic ({stats.narcoticCount})
          </button>
        </div>

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Aaj ki Sales" value={showValue(formatPKR(summary?.todaySales ?? 0))} sub={`${summary?.todayOrders ?? 0} orders`} icon={TrendingUp} color="emerald" />
          <StatCard label="Rx Revenue" value={showValue(formatPKR(stats.rxRevenue))} sub={`${stats.rxCount} prescriptions`} icon={FileText} color="blue" isHighlight />
          <StatCard label="Is Mahine" value={showValue(formatPKR(summary?.monthSales ?? 0))} sub="Monthly total" icon={Package} color="violet" />
          <StatCard label="Narcotic Sales" value={String(stats.narcoticCount)} sub="Tracked separately" icon={ShieldAlert} color="amber" />
        </section>

        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sale #, patient, medicine..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-teal-500" />
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
                <button key={d.v} onClick={() => setDateFilter(d.v)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${dateFilter === d.v ? 'bg-teal-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {d.l}
                </button>
              ))}
            </div>
            {dateFilter === 'custom' && (
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-teal-50 border-2 border-teal-200 p-3">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-teal-700 mb-1 block">From Date</label>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                    className="h-10 w-full rounded-lg border-2 border-teal-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-teal-700 mb-1 block">To Date</label>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                    className="h-10 w-full rounded-lg border-2 border-teal-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 block">Payment Method</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setPaymentFilter('all')} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${paymentFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>All Payments</button>
              {Object.entries(paymentConfig).map(([k, cfg]) => (
                <button key={k} onClick={() => setPaymentFilter(k as PaymentMethod)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 ${paymentFilter === k ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  <cfg.icon className="h-3 w-3" />{cfg.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />)}</div>
          ) : filteredList.length === 0 ? (
            <div className="p-12 text-center"><Pill className="h-16 w-16 text-slate-400 mx-auto mb-3" /><p className="font-extrabold text-slate-700 text-lg">No sales found</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredList.map((sale) => {
                const hasRx = sale.items.some((it: any) => medicineMap.get(it.product.id)?.requiresPrescription);
                const hasNarcotic = sale.items.some((it: any) => medicineMap.get(it.product.id)?.isNarcotic);
                const hasColdChain = sale.items.some((it: any) => medicineMap.get(it.product.id)?.requiresColdChain);
                const PayIcon = paymentConfig[sale.paymentMethod]?.icon || CreditCard;
                return (
                  <Link key={sale.id} to={`/sales/${sale.id}/receipt`} className="block px-5 py-4 hover:bg-teal-50/50 transition group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0"><Pill className="h-5 w-5" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-extrabold text-slate-900">{sale.saleNumber}</span>
                            {sale.status === 'VOIDED' && <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">VOIDED</span>}
                            {hasRx && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold inline-flex items-center gap-1"><FileText className="h-2.5 w-2.5" />Rx</span>}
                            {hasNarcotic && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold inline-flex items-center gap-1"><ShieldAlert className="h-2.5 w-2.5" />NARCOTIC</span>}
                            {hasColdChain && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold inline-flex items-center gap-1"><Snowflake className="h-2.5 w-2.5" />COLD</span>}
                          </div>
                          <div className="mt-1 text-xs text-slate-600 font-semibold flex items-center gap-2 flex-wrap">
                            <User className="h-3 w-3" />{sale.customer?.name || 'Walk-in Patient'}
                            {sale.customer?.phone && <><span>•</span><span>{sale.customer.phone}</span></>}
                            <span>•</span><Package className="h-3 w-3" />{sale.items.length} medicines
                          </div>
                          <div className="mt-1 text-[10px] text-slate-500 inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{formatDate(sale.soldAt)}</div>
                          {(sale as any).note && (
                            <div className="mt-1 text-[10px] font-mono text-teal-700 bg-teal-50 rounded px-1.5 py-0.5 inline-block">{(sale as any).note}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-extrabold text-teal-700 tabular-nums"><HiddenAmount value={formatPKR(sale.total)} hidden={hideAmounts} /></div>
                        <div className="text-[10px] text-slate-500 inline-flex items-center justify-end gap-1 mt-0.5"><PayIcon className="h-2.5 w-2.5" />{paymentConfig[sale.paymentMethod]?.label}</div>
                        {sale.creditAmount > 0 && <div className="text-[10px] text-amber-700 font-extrabold mt-0.5">Udhaar: <HiddenAmount value={formatPKR(sale.creditAmount)} hidden={hideAmounts} /></div>}
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-teal-600 group-hover:text-teal-700"><Eye className="h-3 w-3" /> Receipt <ArrowRight className="h-3 w-3" /></div>
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
    <div className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${isHighlight ? 'bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-300' : 'bg-white border-slate-200'}`}>
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
