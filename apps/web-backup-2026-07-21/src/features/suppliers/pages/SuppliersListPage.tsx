import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Plus, Search, MapPin, Phone, ArrowRight, X, Mail,
  MessageCircle, Eye, Edit3, Trash2, Sparkles, Download, Wallet,
  TrendingUp, CheckCircle2, AlertTriangle, Building2, Activity,
  Crown, BarChart3, CreditCard, Banknote, Smartphone, Building,
  Zap, RefreshCw, Star, Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { suppliersApi } from '@/api/suppliers.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

type Filter = 'all' | 'active' | 'with-debt' | 'inactive';
type Tab = 'list' | 'analytics';

const paymentConfig: Record<string, { label: string; icon: any; color: string; hex: string }> = {
  CASH: { label: 'Cash', icon: Banknote, color: '#16a34a', hex: '#10b981' },
  CARD: { label: 'Card', icon: CreditCard, color: '#2563eb', hex: '#3b82f6' },
  JAZZCASH: { label: 'JazzCash', icon: Smartphone, color: '#f97316', hex: '#f97316' },
  EASYPAISA: { label: 'EasyPaisa', icon: Zap, color: '#22c55e', hex: '#22c55e' },
  BANK_TRANSFER: { label: 'Bank', icon: Building, color: '#7c3aed', hex: '#8b5cf6' },
};

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));

const formatPercent = (n: number) => {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
};

export default function SuppliersListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [tab, setTab] = useState<Tab>('list');

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => suppliersApi.list({ search, page: 1, limit: 100 }),
  });

  const { data: summary } = useQuery({
    queryKey: ['suppliers-summary'],
    queryFn: suppliersApi.summary,
  });

  const removeMutation = useMutation({
    mutationFn: suppliersApi.remove,
    onSuccess: () => {
      toast.success('Supplier deleted');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers-summary'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cannot delete'),
  });

  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    if (filter === 'active') return items.filter((s: any) => s.isActive);
    if (filter === 'inactive') return items.filter((s: any) => !s.isActive);
    if (filter === 'with-debt') return items.filter((s: any) => s.outstandingDue > 0);
    return items;
  }, [items, filter]);

  const trendData = useMemo(() => {
    if (!summary?.trend7Days) return [];
    return summary.trend7Days.map((p: any) => {
      const d = new Date(p.date);
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      return { ...p, label: dayName };
    });
  }, [summary]);

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('No data');
    const headers = ['Name', 'Contact Person', 'Phone', 'Email', 'City', 'Payment Terms', 'Total Purchased', 'Outstanding Due', 'Status'];
    const rows = filtered.map((s: any) => [
      s.name, s.contactPerson || '', s.phone || '', s.email || '',
      s.city || '', s.paymentTerms || '',
      (s.totalPurchased || 0).toFixed(2),
      (s.outstandingDue || 0).toFixed(2),
      s.isActive ? 'Active' : 'Inactive',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suppliers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  const growthVsLastMonth = summary?.growthVsLastMonth ?? 0;

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between flex-wrap gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <Truck className="h-3.5 w-3.5 text-amber-300" />
              Supply Chain Intelligence
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Suppliers</h2>
            <p className="mt-2 text-sm text-white/80">
              Bank info, payment terms, purchase history, top performers — sab ek jagah
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
            <Link to="/suppliers/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" /> New Supplier
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ TABS ═══ */}
      <section className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'list' as Tab, label: 'All Suppliers', icon: Truck },
          { id: 'analytics' as Tab, label: 'Analytics', icon: BarChart3 },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold whitespace-nowrap transition border-2 ${
                active
                  ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </section>

      {/* ═══ STATS CARDS ═══ */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Suppliers"
          value={String(summary?.totalSuppliers ?? 0)}
          sub={`${summary?.activeSuppliers ?? 0} active`}
          icon={Truck}
          color="orange"
        />
        <StatCard
          label="Total Purchased"
          value={formatPKR(summary?.totalPurchased ?? 0)}
          sub="Lifetime spending"
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          label="This Month"
          value={formatPKR(summary?.monthPurchases ?? 0)}
          sub={`${summary?.monthCount ?? 0} purchases`}
          icon={Calendar}
          color="violet"
          trend={growthVsLastMonth}
        />
        <StatCard
          label="Outstanding Due"
          value={formatPKR(summary?.totalOutstanding ?? 0)}
          sub={`${summary?.suppliersWithDebt ?? 0} suppliers`}
          icon={AlertTriangle}
          color="rose"
          isAlert={(summary?.totalOutstanding ?? 0) > 0}
        />
      </section>

      {/* ═══ ANALYTICS TAB ═══ */}
      {tab === 'analytics' && (
        <>
          {/* Charts */}
          <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">7-Day Purchase Trend</h3>
                  <p className="text-xs text-slate-500">Daily spending pattern</p>
                </div>
                <BarChart3 className="h-5 w-5 text-orange-500" />
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="suppGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                    <Area type="monotone" dataKey="total" name="Purchases" fill="url(#suppGrad)" stroke="#f97316" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Payment Methods</h3>
                  <p className="text-xs text-slate-500">All time breakdown</p>
                </div>
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
              {summary?.paymentBreakdown && summary.paymentBreakdown.length > 0 ? (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.paymentBreakdown.map((p) => ({
                          name: paymentConfig[p.paymentMethod]?.label || p.paymentMethod,
                          value: p.total,
                          method: p.paymentMethod,
                        }))}
                        cx="50%" cy="45%" outerRadius={80} innerRadius={40}
                        dataKey="value"
                        label={(entry: any) => {
                          const total = summary.paymentBreakdown.reduce((s, p) => s + p.total, 0);
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
                  No payment data
                </div>
              )}
            </div>
          </section>

          {/* Top Suppliers Leaderboard */}
          <section className="rounded-3xl bg-white border-2 border-orange-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="font-extrabold text-orange-900">Top Suppliers Leaderboard</h3>
                  <p className="text-[11px] text-orange-700 font-bold">Most valuable supply partners</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase text-orange-700 bg-orange-100 px-2 py-1 rounded-full">All Time</span>
            </div>
            <div className="divide-y divide-slate-100">
              {summary?.topSuppliers?.length ? (
                summary.topSuppliers.map((ts, idx) => {
                  const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500', 'bg-cyan-500', 'bg-pink-500', 'bg-emerald-500'];
                  return (
                    <Link
                      key={ts.supplierId}
                      to={`/suppliers/${ts.supplierId}`}
                      className="px-5 py-4 flex items-center gap-3 hover:bg-slate-50 transition"
                    >
                      <div className={`h-10 w-10 rounded-xl ${rankColors[idx] || 'bg-slate-400'} text-white font-extrabold flex items-center justify-center shrink-0 shadow-md`}>
                        {idx < 3 ? <Crown className="h-5 w-5" /> : `#${idx + 1}`}
                      </div>
                      {ts.supplier?.logoUrl ? (
                        <img src={ts.supplier.logoUrl} className="h-12 w-12 rounded-xl object-cover shrink-0 border" alt={ts.supplier.name} />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-extrabold shrink-0 shadow">
                          {ts.supplier?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-900 truncate">{ts.supplier?.name}</div>
                        <div className="text-[11px] text-slate-500 font-semibold flex flex-wrap items-center gap-2">
                          {ts.supplier?.phone && (
                            <span className="inline-flex items-center gap-0.5">
                              <Phone className="h-2.5 w-2.5" />
                              {ts.supplier.phone}
                            </span>
                          )}
                          {ts.supplier?.city && (
                            <span className="inline-flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" />
                              {ts.supplier.city}
                            </span>
                          )}
                          <span className="text-orange-700 font-extrabold">{ts.orderCount} orders</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-orange-700 tabular-nums">{formatPKR(ts.totalSpent)}</div>
                        {ts.outstanding > 0 && (
                          <div className="text-[10px] text-rose-700 font-extrabold mt-0.5">
                            Due: {formatPKR(ts.outstanding)}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="px-5 py-12 text-center text-sm text-slate-500">No supplier data yet</div>
              )}
            </div>
          </section>

          {/* Recent Purchases */}
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                Recent Supplier Activity
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {summary?.recentPurchases?.length ? (
                summary.recentPurchases.map((p) => {
                  const PayIcon = paymentConfig[p.paymentMethod]?.icon || CreditCard;
                  return (
                    <Link
                      key={p.id}
                      to={`/purchases/${p.id}`}
                      className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition"
                    >
                      <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <PayIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 font-mono text-xs">{p.purchaseNumber}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold inline-flex items-center gap-1 mt-0.5">
                          <Building2 className="h-2.5 w-2.5" />
                          {p.supplier?.name}
                          <span className="text-slate-400">•</span>
                          {formatDate(p.purchasedAt)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-orange-700 text-sm tabular-nums">{formatPKR(p.total)}</div>
                        <div className="text-[10px] text-slate-500 font-bold">{paymentConfig[p.paymentMethod]?.label}</div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="px-5 py-12 text-center text-sm text-slate-500">No recent activity</div>
              )}
            </div>
          </section>
        </>
      )}

      {/* ═══ LIST TAB ═══ */}
      {tab === 'list' && (
        <>
          {/* Search + Filters */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-[240px] relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  placeholder="Search by name, contact, NTN, phone, city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
              {filtered.length > 0 && (
                <button
                  onClick={exportCSV}
                  className="h-11 px-4 rounded-xl border-2 border-slate-200 hover:border-orange-300 bg-white text-sm font-bold text-slate-700 inline-flex items-center gap-1.5 transition"
                >
                  <Download className="h-4 w-4" /> Export CSV
                </button>
              )}
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
              {[
                { v: 'all' as Filter, l: 'All', count: items.length, c: 'bg-slate-900' },
                { v: 'active' as Filter, l: 'Active', count: items.filter((s: any) => s.isActive).length, c: 'bg-emerald-600' },
                { v: 'with-debt' as Filter, l: 'With Debt', count: items.filter((s: any) => s.outstandingDue > 0).length, c: 'bg-rose-600' },
                { v: 'inactive' as Filter, l: 'Inactive', count: items.filter((s: any) => !s.isActive).length, c: 'bg-slate-500' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setFilter(opt.v)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-2 ${
                    filter === opt.v ? `${opt.c} text-white shadow-sm` : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.l}
                  <span className={`px-1.5 py-0 rounded-full text-[9px] font-extrabold ${
                    filter === opt.v ? 'bg-white/20' : 'bg-slate-200'
                  }`}>{opt.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Suppliers Grid */}
          {filtered.length === 0 ? (
            <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                <Truck className="h-9 w-9 text-orange-600" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-slate-900">
                {search || filter !== 'all' ? 'No matches' : 'No suppliers yet'}
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                {search || filter !== 'all' ? 'Try different search or filter' : 'Pehla supplier add karein'}
              </p>
              {!search && filter === 'all' && (
                <Link to="/suppliers/new">
                  <Button className="mt-5">
                    <Plus className="h-4 w-4" /> Add Supplier
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((s: any) => (
                <SupplierCard key={s.id} supplier={s} onDelete={() => {
                  if (confirm(`Delete ${s.name}?`)) removeMutation.mutate(s.id);
                }} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, trend, isAlert }: any) {
  const colors: Record<string, string> = {
    orange: 'from-orange-500 to-orange-700 shadow-orange-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
  };
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${
      isAlert ? 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-300' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          <div className="text-xs text-slate-600 font-semibold mt-1">{sub}</div>
          {trend !== undefined && trend !== 0 && (
            <div className={`mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
              trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              <TrendingUp className="h-2.5 w-2.5" />
              {formatPercent(trend)} vs last month
            </div>
          )}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0 ml-2`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function SupplierCard({ supplier: s, onDelete }: { supplier: any; onDelete: () => void }) {
  const whatsappLink = s.phone
    ? `https://wa.me/${s.phone.replace(/[^0-9]/g, '').replace(/^0/, '92')}`
    : null;

  return (
    <div className="group rounded-2xl bg-white border-2 border-slate-200 hover:border-orange-300 hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden">
      <Link to={`/suppliers/${s.id}`} className="block p-5">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            {s.logoUrl ? (
              <img src={s.logoUrl} className="h-14 w-14 rounded-2xl object-cover border shadow" alt={s.name} />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center text-lg font-extrabold shadow">
                {s.name.charAt(0).toUpperCase()}
              </div>
            )}
            {!s.isActive && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-slate-400 border-2 border-white" title="Inactive" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 truncate group-hover:text-orange-700 transition">
              {s.name}
            </h3>
            {s.contactPerson && (
              <div className="text-xs text-slate-500 mt-0.5 font-semibold truncate">{s.contactPerson}</div>
            )}
            {s.phone && (
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 font-semibold">
                <Phone className="h-3 w-3" /> {s.phone}
              </div>
            )}
            {s.city && (
              <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                <MapPin className="h-3 w-3" /> {s.city}{s.area && `, ${s.area}`}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {s.paymentTerms && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[10px] font-bold text-orange-700">
              <Wallet className="h-2.5 w-2.5" />
              {s.paymentTerms}
            </div>
          )}
          {s.bankName && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
              <CreditCard className="h-2.5 w-2.5" />
              {s.bankName}
            </div>
          )}
          {s.ntn && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-700">
              NTN
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-2 py-1.5">
            <div className="text-[9px] text-blue-700 font-bold uppercase">Purchased</div>
            <div className="font-extrabold text-blue-700 truncate tabular-nums">{formatPKR(s.totalPurchased || 0)}</div>
          </div>
          <div className={`rounded-lg px-2 py-1.5 border ${(s.outstandingDue || 0) > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`text-[9px] font-bold uppercase ${(s.outstandingDue || 0) > 0 ? 'text-rose-700' : 'text-slate-500'}`}>Due</div>
            <div className={`font-extrabold truncate tabular-nums ${(s.outstandingDue || 0) > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
              {formatPKR(s.outstandingDue || 0)}
            </div>
          </div>
        </div>
      </Link>

      <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition">
        <div className="flex items-center gap-1">
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="h-7 w-7 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center"
              title="WhatsApp"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          )}
          {s.phone && (
            <a
              href={`tel:${s.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="h-7 w-7 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center"
              title="Call"
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
          )}
          {s.email && (
            <a
              href={`mailto:${s.email}`}
              onClick={(e) => e.stopPropagation()}
              className="h-7 w-7 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 flex items-center justify-center"
              title="Email"
            >
              <Mail className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link
            to={`/suppliers/${s.id}`}
            onClick={(e) => e.stopPropagation()}
            className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
            title="View"
          >
            <Eye className="h-3.5 w-3.5" />
          </Link>
          <Link
            to={`/suppliers/${s.id}/edit`}
            onClick={(e) => e.stopPropagation()}
            className="h-7 w-7 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center"
            title="Edit"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-7 w-7 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
