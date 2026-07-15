import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, ShoppingBag, DollarSign, Package,
  AlertTriangle, Sparkles, Award, ArrowRight, RefreshCw,
  Clock, BarChart3, Layers, Scissors, Wrench, Zap,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { retailDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';

export default function RetailDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['retail-dashboard-overview'],
    queryFn: () => retailDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const { data: hourly = [] } = useQuery({
    queryKey: ['retail-dashboard-hourly'],
    queryFn: () => retailDashboardApi.salesByHour(),
  });

  const { data: slowMovers = [] } = useQuery({
    queryKey: ['retail-slow-movers'],
    queryFn: () => retailDashboardApi.slowMovers(30),
  });

  const today = overview?.today ?? { revenue: 0, profit: 0, orders: 0, growthPercent: 0 };
  const week = overview?.week ?? { revenue: 0, profit: 0 };
  const topProducts = overview?.topProducts ?? [];
  const categoryPerf = overview?.categoryPerformance ?? [];
  const alerts = overview?.alerts ?? { lowStockCount: 0, damagesToday: 0, damageLossToday: 0, pendingReorders: 0 };

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Retail Industry
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🛒 Kiryana / Retail Dashboard
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Sab kuch ek jagah — sales, stock, damages, quick actions
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold transition backdrop-blur border border-white/20"
            >
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/pos">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <ShoppingBag className="h-4 w-4" />
                New Sale
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* KPI CARDS */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Aaj ki Sales"
          value={formatPKR(today.revenue)}
          sub={today.orders + ' orders'}
          icon={DollarSign}
          color="emerald"
          growth={today.growthPercent}
        />
        <KpiCard
          label="Aaj ka Profit"
          value={formatPKR(today.profit)}
          sub={'Margin: ' + (today.revenue > 0 ? ((today.profit / today.revenue) * 100).toFixed(1) : 0) + '%'}
          icon={Award}
          color="blue"
          highlight
        />
        <KpiCard
          label="7 Days Revenue"
          value={formatPKR(week.revenue)}
          sub={'Profit: ' + formatPKR(week.profit)}
          icon={TrendingUp}
          color="violet"
        />
        <AlertsCard alerts={alerts} />
      </section>

      {/* CHARTS ROW */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Hourly Sales (Today)</h3>
              <p className="text-xs text-slate-500 font-semibold">Peak hours identify karo</p>
            </div>
            <Clock className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="hour"
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(h) => h + ':00'}
                />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} />
                <Tooltip
                  formatter={(value: any) => formatPKR(Number(value))}
                  labelFormatter={(l) => l + ':00'}
                  contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }}
                />
                <Bar dataKey="total" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Top Categories (7d)</h3>
              <p className="text-xs text-slate-500 font-semibold">Best performing sections</p>
            </div>
            <BarChart3 className="h-5 w-5 text-violet-500" />
          </div>
          <div className="space-y-2">
            {categoryPerf.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">No data yet</div>
            ) : (
              categoryPerf.slice(0, 6).map((cat: any, i: number) => {
                const maxTotal = Math.max(...categoryPerf.map((c: any) => c.total));
                const width = maxTotal > 0 ? (cat.total / maxTotal) * 100 : 0;
                return (
                  <div key={cat.categoryId || i} className="p-2 rounded-xl bg-slate-50 dark:bg-neutral-800/50">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-700 dark:text-slate-300 truncate">
                        {cat.name || 'Uncategorized'}
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {formatPKR(cat.total)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-neutral-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-emerald-500"
                        style={{ width: width + '%' }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <QuickLink to="/retail/product-units" icon={Layers} label="Multi-Units" color="emerald" />
        <QuickLink to="/retail/combos" icon={Sparkles} label="Combos" color="violet" />
        <QuickLink to="/retail/damage" icon={AlertTriangle} label="Damage Log" color="rose" />
        <QuickLink to="/retail/quick-keys" icon={Zap} label="Quick Keys" color="amber" />
        <QuickLink to="/products" icon={Package} label="Products" color="blue" />
        <QuickLink to="/reports" icon={BarChart3} label="Reports" color="slate" />
      </section>

      {/* TOP PRODUCTS + SLOW MOVERS */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">🏆 Top Sellers (Today)</h3>
              <p className="text-xs text-slate-500 font-semibold">Sabse zyada bikay</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {topProducts.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">No sales yet today</div>
            ) : (
              topProducts.slice(0, 8).map((tp: any, i: number) => (
                <div key={tp.productId} className="px-6 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0">
                    {i + 1}
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                    {tp.product?.images?.[0]?.url ? (
                      <img src={tp.product.images[0].url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate text-slate-900 dark:text-white">
                      {tp.product?.name || 'Unknown'}
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">
                      {tp.product?.category?.name || '—'} • {tp._sum?.quantity?.toFixed(0)} sold
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {formatPKR(tp._sum?.total ?? 0)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">🐢 Slow Movers (30d)</h3>
              <p className="text-xs text-slate-500 font-semibold">Discount ya remove karo</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {slowMovers.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                🎉 All products moving well!
              </div>
            ) : (
              slowMovers.slice(0, 8).map((p: any) => (
                <Link
                  key={p.id}
                  to={'/products/' + p.id + '/edit'}
                  className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition"
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                    {p.images?.[0]?.url ? (
                      <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate text-slate-900 dark:text-white">{p.name}</div>
                    <div className="text-xs text-slate-500 font-semibold">
                      {p.category?.name || '—'} • {p.stock} {p.unit} in stock
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color, growth, highlight }: any) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
  };
  return (
    <div className={
      'rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ' +
      (highlight
        ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40 border-blue-300 dark:border-blue-800'
        : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800')
    }>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">
            {value}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1 flex items-center gap-1">
            {sub}
            {typeof growth === 'number' && growth !== 0 && (
              <span className={
                'inline-flex items-center gap-0.5 font-extrabold ' +
                (growth > 0 ? 'text-emerald-600' : 'text-rose-600')
              }>
                {growth > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {Math.abs(growth).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className={
          'h-12 w-12 rounded-2xl bg-gradient-to-br ' +
          colors[color] +
          ' text-white flex items-center justify-center shadow-lg shrink-0'
        }>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function AlertsCard({ alerts }: any) {
  const items = [
    { key: 'lowStockCount', label: 'Low stock', value: alerts.lowStockCount, to: '/low-stock', color: 'amber' },
    { key: 'pendingReorders', label: 'Reorders', value: alerts.pendingReorders, to: '/retail/reorders', color: 'blue' },
    { key: 'damagesToday', label: 'Damages', value: alerts.damagesToday, to: '/retail/damage', color: 'rose' },
  ];
  const total = alerts.lowStockCount + alerts.pendingReorders + alerts.damagesToday;

  return (
    <div className={
      'rounded-2xl border-2 p-5 shadow-sm ' +
      (total > 0
        ? 'bg-gradient-to-br from-amber-50 to-rose-50 dark:from-amber-950/30 dark:to-rose-950/30 border-amber-300 dark:border-amber-800'
        : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800')
    }>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Alerts</div>
        <AlertTriangle className={'h-5 w-5 ' + (total > 0 ? 'text-amber-600' : 'text-slate-400')} />
      </div>
      <div className="space-y-1.5">
        {items.map((it) => (
          <Link
            key={it.key}
            to={it.to}
            className="flex items-center justify-between text-xs group"
          >
            <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900">
              {it.label}
            </span>
            <span className={
              'font-extrabold tabular-nums ' +
              (it.value > 0 ? 'text-' + it.color + '-700 dark:text-' + it.color + '-400' : 'text-slate-500')
            }>
              {it.value}
            </span>
          </Link>
        ))}
        {alerts.damageLossToday > 0 && (
          <div className="pt-2 mt-2 border-t border-slate-200 dark:border-neutral-700 flex justify-between text-xs">
            <span className="font-bold text-rose-700 dark:text-rose-400">Loss today</span>
            <span className="font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">
              {formatPKR(alerts.damageLossToday)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, color }: any) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    slate: 'from-slate-500 to-slate-700 shadow-slate-500/30',
  };
  return (
    <Link
      to={to}
      className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 hover:border-slate-300 dark:hover:border-neutral-700 hover:shadow-lg hover:-translate-y-0.5 transition"
    >
      <div className={
        'h-11 w-11 rounded-xl bg-gradient-to-br ' + colors[color] +
        ' text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-2'
      }>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs font-extrabold text-slate-900 dark:text-white">{label}</div>
    </Link>
  );
}
