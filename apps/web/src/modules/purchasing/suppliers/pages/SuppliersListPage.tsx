import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Plus, Search, MapPin, Phone, X, Mail,
  MessageCircle, Eye, Edit3, Trash2, Download, Wallet,
  TrendingUp, AlertTriangle, Building2, Activity,
  Crown, BarChart3, CreditCard, Banknote, Smartphone, Building,
  Zap, RefreshCw, Calendar, GraduationCap, Printer, CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { suppliersApi } from '@modules/purchasing/suppliers/api/suppliers.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA SUPPLIERS — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 GLOBAL — har industry ka supplier same (khata, phone, due)
   🌙 Dark mode complete
   🎓 Teacher modal — "supplier khata kya hota hai" universal
   ⌨️  / = search • N = naya • 1-2 = tabs • Esc = band
   ⚠️ Smart delete — due ho to warning • 💰 Debt KPI click = filter
   ═════════════════════════════════════════════════════════════ */

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

const formatPercent = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;

export default function SuppliersListPage() {
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [tab, setTab] = useState<Tab>('list');
  const [showTeacher, setShowTeacher] = useState(false);

  const { data, refetch, isRefetching, isLoading } = useQuery({
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
      toast.success('Supplier delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers-summary'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete nahi hua — iska purchase record hai'),
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

  const confirmDelete = (s: any) => {
    const due = Number(s.outstandingDue || 0);
    const msg = due > 0
      ? `⚠️ "${s.name}" ka ${formatPKR(due)} udhaar abhi BAAKI hai!\n\nDelete karo to purchases ka record rahega lekin supplier ka khata gum ho jayega.\n\nPehle hisaab clear karo — phir bhi delete karna hai?`
      : `"${s.name}" delete karein?`;
    if (confirm(msg)) removeMutation.mutate(s.id);
  };

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const summaryRows = [
      ['Suppliers Report'],
      [`Generated: ${new Date().toLocaleString('en-PK')}  •  Total: ${filtered.length}  •  Due: ${(summary?.totalOutstanding ?? 0).toFixed(2)}`],
      [''],
    ];
    const headers = ['Name', 'Contact Person', 'Phone', 'Email', 'City', 'Payment Terms', 'Total Purchased', 'Outstanding Due', 'Status'];
    const rows = filtered.map((s: any) => [
      s.name, s.contactPerson || '', s.phone || '', s.email || '',
      s.city || '', s.paymentTerms || '',
      (s.totalPurchased || 0).toFixed(2),
      (s.outstandingDue || 0).toFixed(2),
      s.isActive ? 'Active' : 'Inactive',
    ]);
    const csv = [...summaryRows, headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suppliers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} suppliers export ho gaye`);
  };

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === '1') setTab('list');
      if (e.key === '2') setTab('analytics');
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); window.location.href = '/suppliers/new'; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  /* Body scroll lock jab teacher khula ho */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  const growthVsLastMonth = summary?.growthVsLastMonth ?? 0;
  const debtCount = items.filter((s: any) => s.outstandingDue > 0).length;
  const hasFilters = !!search || filter !== 'all';

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <SuppliersTeacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 dark:from-slate-950 dark:via-orange-950 dark:to-amber-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-orange-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Truck className="h-3.5 w-3.5 text-amber-300" /> Supply Chain
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">🚚 Suppliers</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-orange-200">{summary?.totalSuppliers ?? items.length}</strong> suppliers
              <span className="opacity-50 mx-1.5">•</span>
              Lifetime <strong className="text-amber-200">{formatPKR(summary?.totalPurchased ?? 0)}</strong>
              {(summary?.totalOutstanding ?? 0) > 0 && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  Due <strong className="text-rose-300">{formatPKR(summary?.totalOutstanding ?? 0)}</strong>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              title="Kaise kaam karta hai?"
            >
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => window.print()}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </button>
            <Link
              to="/suppliers/new"
              className="h-11 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xl transition"
            >
              <Plus className="h-4 w-4" /> Naya Supplier <Kbd>N</Kbd>
            </Link>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>1</Kbd><Kbd>2</Kbd><span className="text-white/60">Tabs</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>N</Kbd><span className="text-white/60">Naya supplier</span>
        </div>
      </section>

      {/* ═══ TABS ═══ */}
      <section className="flex gap-2 overflow-x-auto pb-1">
        {([
          { id: 'list' as Tab, label: 'Sab Suppliers', icon: Truck, count: items.length },
          { id: 'analytics' as Tab, label: 'Analytics', icon: BarChart3 },
        ]).map((t, i) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold whitespace-nowrap transition border-2 ${
                active
                  ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-500/30'
                  : 'bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-500/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && (
                <span className={`px-1.5 rounded-full text-[10px] font-extrabold tabular-nums ${active ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  {t.count}
                </span>
              )}
              <span className={`hidden lg:inline text-[9px] font-mono font-bold ${active ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'}`}>{i + 1}</span>
            </button>
          );
        })}
      </section>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
        <Kpi
          icon={Truck} tone="orange"
          label="Total Suppliers" value={summary?.totalSuppliers ?? 0}
          sub={`${summary?.activeSuppliers ?? 0} active`}
        />
        <Kpi
          icon={TrendingUp} tone="blue"
          label="Total Purchased" value={formatPKR(summary?.totalPurchased ?? 0)}
          sub="Lifetime spending"
        />
        <Kpi
          icon={Calendar} tone="violet"
          label="Is Mahine" value={formatPKR(summary?.monthPurchases ?? 0)}
          sub={`${summary?.monthCount ?? 0} purchases`}
          trend={growthVsLastMonth}
        />
        <Kpi
          icon={AlertTriangle} tone="rose"
          label="Outstanding Due" value={formatPKR(summary?.totalOutstanding ?? 0)}
          sub={`${summary?.suppliersWithDebt ?? debtCount} suppliers pe baaki`}
          isAlert={(summary?.totalOutstanding ?? 0) > 0}
          onClick={debtCount > 0 ? () => { setFilter('with-debt'); setTab('list'); } : undefined}
          active={filter === 'with-debt'}
        />
      </section>

      {/* ═══ ANALYTICS TAB ═══ */}
      {tab === 'analytics' && (
        <>
          <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">7-Day Purchase Trend</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Daily spending pattern</p>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                    <Area type="monotone" dataKey="total" name="Purchases" fill="url(#suppGrad)" stroke="#f97316" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Payment Methods</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">All time breakdown</p>
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
                <div className="h-[260px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 font-semibold">
                  Abhi koi payment data nahi
                </div>
              )}
            </div>
          </section>

          {/* Top Suppliers Leaderboard */}
          <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-orange-200 dark:border-orange-500/30 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 border-b-2 border-orange-200 dark:border-orange-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="font-extrabold text-orange-900 dark:text-orange-200">Top Suppliers</h3>
                  <p className="text-[11px] text-orange-700 dark:text-orange-300/80 font-bold">Sab se valuable supply partners</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-500/20 px-2 py-1 rounded-full">All Time</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {summary?.topSuppliers?.length ? (
                summary.topSuppliers.map((ts, idx) => {
                  const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500', 'bg-cyan-500', 'bg-pink-500', 'bg-emerald-500'];
                  return (
                    <Link
                      key={ts.supplierId}
                      to={`/suppliers/${ts.supplierId}`}
                      className="px-5 py-4 flex items-center gap-3 hover:bg-orange-50/40 dark:hover:bg-orange-500/5 transition"
                    >
                      <div className={`h-10 w-10 rounded-xl ${rankColors[idx] || 'bg-slate-400'} text-white font-extrabold flex items-center justify-center shrink-0 shadow-md`}>
                        {idx < 3 ? <Crown className="h-5 w-5" /> : `#${idx + 1}`}
                      </div>
                      {ts.supplier?.logoUrl ? (
                        <img src={ts.supplier.logoUrl} className="h-12 w-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700" alt={ts.supplier.name} />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-extrabold shrink-0 shadow">
                          {ts.supplier?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-900 dark:text-white truncate">{ts.supplier?.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex flex-wrap items-center gap-2">
                          {ts.supplier?.phone && (
                            <span className="inline-flex items-center gap-0.5">
                              <Phone className="h-2.5 w-2.5" /> {ts.supplier.phone}
                            </span>
                          )}
                          {ts.supplier?.city && (
                            <span className="inline-flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" /> {ts.supplier.city}
                            </span>
                          )}
                          <span className="text-orange-700 dark:text-orange-400 font-extrabold">{ts.orderCount} orders</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-orange-700 dark:text-orange-400 tabular-nums">{formatPKR(ts.totalSpent)}</div>
                        {ts.outstanding > 0 && (
                          <div className="text-[10px] text-rose-700 dark:text-rose-400 font-extrabold mt-0.5">
                            Due: {formatPKR(ts.outstanding)}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400 font-semibold">Abhi koi supplier data nahi</div>
              )}
            </div>
          </section>

          {/* Recent Purchases */}
          <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Recent Supplier Activity
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {summary?.recentPurchases?.length ? (
                summary.recentPurchases.map((p) => {
                  const PayIcon = paymentConfig[p.paymentMethod]?.icon || CreditCard;
                  return (
                    <Link
                      key={p.id}
                      to={`/purchases/${p.id}`}
                      className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <PayIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-900 dark:text-white font-mono text-xs">{p.purchaseNumber}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold inline-flex items-center gap-1 mt-0.5">
                          <Building2 className="h-2.5 w-2.5" />
                          {p.supplier?.name}
                          <span className="text-slate-400 dark:text-slate-600">•</span>
                          {formatDate(p.purchasedAt)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-orange-700 dark:text-orange-400 text-sm tabular-nums">{formatPKR(p.total)}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{paymentConfig[p.paymentMethod]?.label}</div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400 font-semibold">Koi recent activity nahi</div>
              )}
            </div>
          </section>
        </>
      )}

      {/* ═══ LIST TAB ═══ */}
      {tab === 'list' && (
        <>
          {/* Search + Filters */}
          <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Naam, contact, NTN, phone, city... (/ shortcut)"
                  className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30 transition"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
              <button
                onClick={exportCSV}
                className="h-12 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-500/50 bg-white dark:bg-slate-800 text-sm font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition"
              >
                <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
              </button>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                {([
                  { v: 'all' as Filter, l: 'Sab', c: items.length },
                  { v: 'active' as Filter, l: 'Active', c: items.filter((s: any) => s.isActive).length },
                  { v: 'with-debt' as Filter, l: '💰 Udhaar', c: debtCount },
                  { v: 'inactive' as Filter, l: 'Band', c: items.filter((s: any) => !s.isActive).length },
                ]).map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setFilter(o.v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                      filter === o.v ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {o.l} <span className={`ml-0.5 tabular-nums ${filter === o.v ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>{o.c}</span>
                  </button>
                ))}
              </div>

              {hasFilters && (
                <button
                  onClick={() => { setSearch(''); setFilter('all'); }}
                  className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition"
                >
                  <X className="h-3 w-3" /> Filter hatao
                </button>
              )}

              <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
                {filtered.length} suppliers
              </div>
            </div>
          </section>

          {/* Suppliers Grid */}
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 sm:p-16 text-center">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-500/20 dark:to-amber-500/20 flex items-center justify-center">
                <Truck className="h-9 w-9 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
                {hasFilters ? 'Kuch nahi mila' : 'Abhi koi supplier nahi'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto">
                {hasFilters
                  ? 'Filter change kar ke dekho'
                  : 'Supplier woh hai jis se maal kharidte ho. Naam + phone likho — phir har purchase ka hisaab aur udhaar ka khata khud chalega!'}
              </p>
              <div className="mt-5 flex gap-2 justify-center flex-wrap">
                {hasFilters ? (
                  <Button variant="secondary" onClick={() => { setSearch(''); setFilter('all'); }}>
                    <X className="h-4 w-4" /> Filter hatao
                  </Button>
                ) : (
                  <>
                    <button
                      onClick={() => setShowTeacher(true)}
                      className="h-11 px-4 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-extrabold inline-flex items-center gap-1.5 border-2 border-amber-300 dark:border-amber-500/40 transition"
                    >
                      <GraduationCap className="h-4 w-4" /> Pehle Seekh Lo
                    </button>
                    <Link to="/suppliers/new">
                      <Button className="bg-gradient-to-r from-orange-600 to-amber-600 font-extrabold">
                        <Plus className="h-4 w-4" /> Naya Supplier
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </section>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((s: any) => (
                <SupplierCard key={s.id} supplier={s} onDelete={() => confirmDelete(s)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SUPPLIERS TEACHER — Universal guide (35+ industries)
   ═════════════════════════════════════════════════════════════ */
function SuppliersTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-orange-300 dark:border-orange-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-orange-200 dark:border-orange-500/30 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/15 dark:to-amber-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-orange-900 dark:text-orange-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Suppliers — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Supplier = jis se maal kharidte ho.</strong> Ek dafa naam + phone likho — phir
            har purchase ka hisaab, udhaar ka khata, sab automatic.
          </p>

          <div className="rounded-2xl border-2 border-orange-200 dark:border-orange-500/30 bg-orange-50/60 dark:bg-orange-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>💰 Udhaar ka khata</strong> — har supplier ka "kitna dena baaki" apne aap chalta hai</TipRow>
            <TipRow><strong>📱 WhatsApp button</strong> — card pe green icon se seedha supplier ko message</TipRow>
            <TipRow><strong>💳 Payment terms</strong> — "Cash" / "15 din" / "30 din" likh do, yaad rahega</TipRow>
            <TipRow><strong>🏆 Analytics tab</strong> — kaunsa supplier sab se sasta/zyada, 7-din ka trend</TipRow>
            <TipRow><strong>Low Stock se juda</strong> — Low Stock page se reminder bhejo, maal aaye to Purchase banao</TipRow>
            <TipRow><strong>🗑️ Delete se pehle</strong> — udhaar baaki ho to warning milegi, hisaab pehle clear karo</TipRow>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            💡 <strong>Roz ka chakkar:</strong> Maal aaya → <strong>Purchase</strong> banao (supplier select) →
            stock khud barh jayega → udhaar khud likha jayega. Payment do → khata clear!
          </div>

          <Button
            className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 font-extrabold shadow-lg shadow-orange-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </Button>
        </div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm">
      {children}
    </kbd>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, trend, isAlert, onClick, active }: any) {
  const tones: Record<string, string> = {
    orange: 'from-orange-500 to-orange-700 shadow-orange-500/40',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/40',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={[
        'rounded-2xl border-2 p-3 sm:p-4 shadow-sm text-left w-full transition-all',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : '',
        isAlert
          ? 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 border-rose-300 dark:border-rose-500/40'
          : active
            ? 'border-orange-500 dark:border-orange-500/60 ring-2 ring-orange-200 dark:ring-orange-500/20 bg-white dark:bg-slate-900/80'
            : 'bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-slate-200 dark:border-slate-800',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
          {trend !== undefined && trend !== 0 && (
            <div className={`mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
              trend >= 0
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
            }`}>
              <TrendingUp className="h-2.5 w-2.5" />
              {formatPercent(trend)} vs pichla mahina
            </div>
          )}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}

function SupplierCard({ supplier: s, onDelete }: { supplier: any; onDelete: () => void }) {
  const whatsappLink = s.phone
    ? `https://wa.me/${s.phone.replace(/[^0-9]/g, '').replace(/^0/, '92')}`
    : null;
  const hasDue = Number(s.outstandingDue || 0) > 0;

  return (
    <div className="group rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-500/50 hover:shadow-xl dark:hover:shadow-orange-500/10 hover:-translate-y-1 transition-all overflow-hidden">
      <Link to={`/suppliers/${s.id}`} className="block p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            {s.logoUrl ? (
              <img src={s.logoUrl} className="h-14 w-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow" alt={s.name} />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center text-lg font-extrabold shadow">
                {s.name.charAt(0).toUpperCase()}
              </div>
            )}
            {!s.isActive && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-slate-400 border-2 border-white dark:border-slate-900" title="Inactive" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 dark:text-white truncate group-hover:text-orange-700 dark:group-hover:text-orange-400 transition text-sm">
              {s.name}
            </h3>
            {s.contactPerson && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold truncate">{s.contactPerson}</div>
            )}
            {s.phone && (
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
                <Phone className="h-3 w-3" /> {s.phone}
              </div>
            )}
            {s.city && (
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <MapPin className="h-3 w-3" /> {s.city}{s.area && `, ${s.area}`}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {s.paymentTerms && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/30 text-[10px] font-bold text-orange-700 dark:text-orange-300">
              <Wallet className="h-2.5 w-2.5" /> {s.paymentTerms}
            </div>
          )}
          {s.bankName && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              <CreditCard className="h-2.5 w-2.5" /> {s.bankName}
            </div>
          )}
          {s.ntn && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 text-[10px] font-bold text-blue-700 dark:text-blue-300">
              NTN
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-2 py-1.5">
            <div className="text-[9px] text-blue-700 dark:text-blue-400 font-extrabold uppercase">Purchased</div>
            <div className="font-extrabold text-blue-700 dark:text-blue-300 truncate tabular-nums">{formatPKR(s.totalPurchased || 0)}</div>
          </div>
          <div className={`rounded-lg px-2 py-1.5 border ${
            hasDue
              ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
          }`}>
            <div className={`text-[9px] font-extrabold uppercase ${hasDue ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>Due</div>
            <div className={`font-extrabold truncate tabular-nums ${hasDue ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'}`}>
              {formatPKR(s.outstandingDue || 0)}
            </div>
          </div>
        </div>
      </Link>

      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between opacity-0 group-hover:opacity-100 transition">
        <div className="flex items-center gap-1">
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="h-7 w-7 rounded-lg bg-green-100 dark:bg-green-500/20 hover:bg-green-200 dark:hover:bg-green-500/30 text-green-700 dark:text-green-300 flex items-center justify-center transition"
              title="WhatsApp"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          )}
          {s.phone && (
            <a
              href={`tel:${s.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 flex items-center justify-center transition"
              title="Call"
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
          )}
          {s.email && (
            <a
              href={`mailto:${s.email}`}
              onClick={(e) => e.stopPropagation()}
              className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-500/20 hover:bg-violet-200 dark:hover:bg-violet-500/30 text-violet-700 dark:text-violet-300 flex items-center justify-center transition"
              title="Email"
            >
              <Mail className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link
            to={`/suppliers/${s.id}`}
            className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition"
            title="View"
          >
            <Eye className="h-3.5 w-3.5" />
          </Link>
          <Link
            to={`/suppliers/${s.id}/edit`}
            className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 flex items-center justify-center transition"
            title="Edit"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-7 w-7 rounded-lg bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center justify-center transition"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
