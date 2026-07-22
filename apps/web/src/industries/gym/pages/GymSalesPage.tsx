import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Receipt, TrendingUp, Wallet, Dumbbell, Search, X, Calendar, User, Award, Banknote, CreditCard, Smartphone, Building2, Zap, Eye, Download, RefreshCw, ArrowRight, Clock, Lock, Unlock, EyeOff, Shield } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useSalesPrivacy } from '@modules/sales/sales/hooks/useSalesPrivacy';
import { SalesPrivacyModal } from '@modules/sales/sales/components/SalesPrivacyModal';
import { HiddenAmount } from '@modules/sales/sales/components/HiddenAmount';
import { toast } from 'sonner';

const paymentConfig: Record<string, { label: string; icon: any; hex: string }> = {
  CASH: { label: 'Cash', icon: Banknote, hex: '#10b981' },
  CARD: { label: 'Card', icon: CreditCard, hex: '#3b82f6' },
  JAZZCASH: { label: 'JazzCash', icon: Smartphone, hex: '#f97316' },
  EASYPAISA: { label: 'EasyPaisa', icon: Zap, hex: '#22c55e' },
  BANK_TRANSFER: { label: 'Bank', icon: Building2, hex: '#8b5cf6' },
};

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year';

export default function GymSalesPage() {
  const privacy = useSalesPrivacy();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
  const [privacyModal, setPrivacyModal] = useState<'unlock' | 'setup' | 'disable' | null>(null);

  useEffect(() => { if (privacy.isLocked && !privacyModal) setPrivacyModal('unlock'); }, [privacy.isLocked, privacyModal]);

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

  const filteredSales = useMemo(() => {
    let list = [...sales];
    const now = new Date();
    let start = new Date();
    if (dateFilter === 'today') start.setHours(0, 0, 0, 0);
    else if (dateFilter === 'week') start.setDate(now.getDate() - 7);
    else if (dateFilter === 'month') start.setMonth(now.getMonth() - 1);
    else if (dateFilter === 'year') start.setFullYear(now.getFullYear() - 1);
    else start = new Date(0);
    list = list.filter((s) => new Date(s.soldAt) >= start);
    if (paymentFilter !== 'all') list = list.filter((s) => s.paymentMethod === paymentFilter);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((s) =>
        s.saleNumber.toLowerCase().includes(q) ||
        s.customer?.name?.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
  }, [sales, dateFilter, paymentFilter, search]);

  const exportCSV = () => {
    if (filteredSales.length === 0) return;
    const headers = ['Sale #', 'Date', 'Member', 'Payment', 'Total', 'Paid'];
    const rows = filteredSales.map((s) => [s.saleNumber, new Date(s.soldAt).toLocaleString('en-PK'), s.customer?.name || 'Walk-in', paymentConfig[s.paymentMethod]?.label || s.paymentMethod, s.total.toFixed(2), s.paidAmount.toFixed(2)]);
    const csv = [headers, ...rows].map((r) => r.map((c) => '"' + c + '"').join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'gym-sales-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click(); URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  if (privacy.isLocked) {
    return (
      <>
        {privacyModal && <SalesPrivacyModal mode={privacyModal} onClose={() => setPrivacyModal(null)} />}
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="max-w-md text-center">
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-red-600 to-orange-700 mx-auto flex items-center justify-center shadow-xl">
              <Lock className="h-12 w-12 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold">🔒 Sales Locked</h2>
            <Button size="lg" className="mt-6 bg-gradient-to-r from-red-600 to-orange-700" onClick={() => setPrivacyModal('unlock')}>
              <Unlock className="h-5 w-5" /> Unlock
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-red-900 to-orange-700 text-white p-6 sm:p-8 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-red-400/20 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-semibold">
                <Dumbbell className="h-3.5 w-3.5 text-amber-300" /> Gym Sales
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold">Sales History 💪</h1>
              <p className="mt-2 text-sm text-white/80">Memberships, PT sessions, retail products</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={privacy.toggleHideStats} className={'inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold backdrop-blur border ' + (hideAmounts ? 'bg-amber-500/30 border-amber-300/40' : 'bg-white/10 border-white/20')}>
                {hideAmounts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {privacy.isEnabled ? (
                <button onClick={privacy.lock} className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2.5 text-sm font-bold border border-white/20"><Lock className="h-4 w-4" /></button>
              ) : (
                <button onClick={() => setPrivacyModal('setup')} className="inline-flex items-center gap-2 rounded-xl bg-red-500/30 hover:bg-red-500/50 px-3 py-2.5 text-sm font-bold border border-red-300/40"><Shield className="h-4 w-4" /></button>
              )}
              <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold border border-white/20"><RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} /></button>
              <Link to="/pos"><Button className="bg-white text-slate-900"><Dumbbell className="h-4 w-4" /> POS</Button></Link>
            </div>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Today Sales" value={showValue(formatPKR(summary?.todaySales ?? 0))} sub={(summary?.todayOrders ?? 0) + ' orders'} icon={TrendingUp} color="red" />
          <StatCard label="Today Profit" value={showValue(formatPKR(summary?.todayProfit ?? 0))} sub="Earning" icon={Award} color="orange" highlight />
          <StatCard label="This Month" value={showValue(formatPKR(summary?.monthSales ?? 0))} sub="Monthly total" icon={Calendar} color="fuchsia" />
          <StatCard label="Total" value={filteredSales.length} sub="Filtered" icon={Receipt} color="blue" />
        </section>

        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sale #, member..." className="h-11 w-full rounded-xl border-2 border-slate-200 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-red-500" />
            </div>
            {filteredSales.length > 0 && <button onClick={exportCSV} className="h-11 px-4 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 font-bold text-sm inline-flex items-center gap-2"><Download className="h-4 w-4" /> Export</button>}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(['today', 'week', 'month', 'year', 'all'] as DateFilter[]).map((d) => (
              <button key={d} onClick={() => setDateFilter(d)} className={'px-3 py-1.5 rounded-lg text-xs font-extrabold ' + (dateFilter === d ? 'bg-red-600 text-white shadow' : 'bg-slate-100 text-slate-700')}>{d}</button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}</div>
          ) : filteredSales.length === 0 ? (
            <div className="p-12 text-center"><Dumbbell className="h-16 w-16 text-slate-400 mx-auto mb-3" /><p className="font-extrabold">No sales</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredSales.map((sale) => {
                const PayIcon = paymentConfig[sale.paymentMethod]?.icon || CreditCard;
                const payColor = paymentConfig[sale.paymentMethod]?.hex || '#64748b';
                return (
                  <Link key={sale.id} to={'/sales/' + sale.id + '/receipt'} className="block px-5 py-4 hover:bg-red-50/50 transition group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: payColor + '20' }}>
                          <PayIcon className="h-5 w-5" style={{ color: payColor }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold">{sale.saleNumber}</span>
                            {sale.status === 'VOIDED' && <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">VOIDED</span>}
                          </div>
                          <div className="mt-1 text-xs text-slate-600 font-semibold flex items-center gap-2">
                            <User className="h-3 w-3" />{sale.customer?.name || 'Walk-in'}
                            <span>•</span>
                            <Clock className="h-3 w-3" />{new Date(sale.soldAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-extrabold text-red-700 tabular-nums"><HiddenAmount value={formatPKR(sale.total)} hidden={hideAmounts} /></div>
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-red-600"><Eye className="h-3 w-3" /> View <ArrowRight className="h-3 w-3" /></div>
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

function StatCard({ label, value, sub, icon: Icon, color, highlight }: any) {
  const colors: Record<string, string> = {
    red: 'from-red-500 to-orange-600', orange: 'from-orange-500 to-red-600',
    fuchsia: 'from-fuchsia-500 to-pink-600', blue: 'from-blue-500 to-cyan-600',
  };
  return (
    <div className={'rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ' + (highlight ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-300' : 'bg-white border-slate-200')}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums truncate">{value}</div>
          <div className="text-xs text-slate-600 font-semibold mt-1">{sub}</div>
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg shrink-0'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
