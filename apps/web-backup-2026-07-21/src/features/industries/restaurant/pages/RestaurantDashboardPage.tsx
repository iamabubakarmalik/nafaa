import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ChefHat, ShoppingBag, DollarSign, TrendingUp, TrendingDown,
  Clock, Users, Package, Utensils, Bike, MapPin, Sparkles,
  RefreshCw, ArrowRight, Award, BarChart3, Timer, CheckCircle2,
  AlertCircle, Coffee, Home, Car, Truck, Building, Zap,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { restaurantDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';

const MODE_CONFIG: Record<string, { label: string; icon: any; color: string; hex: string }> = {
  DINE_IN: { label: 'Dine-in', icon: Utensils, color: 'emerald', hex: '#10b981' },
  TAKEAWAY: { label: 'Takeaway', icon: ShoppingBag, color: 'blue', hex: '#3b82f6' },
  DELIVERY: { label: 'Delivery', icon: Bike, color: 'violet', hex: '#8b5cf6' },
  DRIVE_THRU: { label: 'Drive-thru', icon: Car, color: 'amber', hex: '#f59e0b' },
  ROOM_SERVICE: { label: 'Room Service', icon: Home, color: 'pink', hex: '#ec4899' },
  PICKUP: { label: 'Pickup', icon: Package, color: 'cyan', hex: '#06b6d4' },
};

const TABLE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  AVAILABLE: { label: 'Available', color: 'text-emerald-700', bg: 'bg-emerald-500' },
  OCCUPIED: { label: 'Occupied', color: 'text-rose-700', bg: 'bg-rose-500' },
  RESERVED: { label: 'Reserved', color: 'text-amber-700', bg: 'bg-amber-500' },
  CLEANING: { label: 'Cleaning', color: 'text-blue-700', bg: 'bg-blue-500' },
  OUT_OF_SERVICE: { label: 'Out of Service', color: 'text-slate-700', bg: 'bg-slate-500' },
};

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PLACED: { label: 'Placed', color: 'bg-blue-500', icon: CheckCircle2 },
  CONFIRMED: { label: 'Confirmed', color: 'bg-cyan-500', icon: CheckCircle2 },
  COOKING: { label: 'Cooking', color: 'bg-amber-500', icon: ChefHat },
  READY: { label: 'Ready', color: 'bg-emerald-500', icon: Award },
  OUT_FOR_DELIVERY: { label: 'On the way', color: 'bg-violet-500', icon: Bike },
};

export default function RestaurantDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['restaurant-dashboard-overview'],
    queryFn: () => restaurantDashboardApi.overview(),
    refetchInterval: 30_000,
  });

  const { data: hourly = [] } = useQuery({
    queryKey: ['restaurant-dashboard-hourly'],
    queryFn: () => restaurantDashboardApi.ordersByHour(),
  });

  const { data: kitchenPerf } = useQuery({
    queryKey: ['restaurant-kitchen-perf'],
    queryFn: () => restaurantDashboardApi.kitchenPerformance(),
    refetchInterval: 60_000,
  });

  const today = overview?.today ?? { revenue: 0, orders: 0, tips: 0, growthPercent: 0 };
  const week = overview?.week ?? { revenue: 0, orders: 0 };
  const activeOrders = overview?.activeOrders ?? [];
  const byMode = overview?.byMode ?? [];
  const tables = overview?.tables ?? [];
  const topItems = overview?.topItems ?? [];
  const activeDeliveries = overview?.activeDeliveries ?? 0;

  const tableSummary = tables.reduce((acc: any, t: any) => {
    acc[t.status] = t._count._all;
    return acc;
  }, {} as Record<string, number>);
  const totalTables = Object.values(tableSummary).reduce((s: any, v: any) => s + v, 0) as number;

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-rose-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-rose-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Restaurant Command Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🍽️ Kitchen Live View
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Real-time orders, tables, kitchen — sab kuch ek jagah
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
            <Link to="/restaurant/orders/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <ShoppingBag className="h-4 w-4" />
                New Order
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* KPI CARDS */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Aaj ki Revenue"
          value={formatPKR(today.revenue)}
          sub={today.orders + ' orders'}
          icon={DollarSign}
          color="emerald"
          growth={today.growthPercent}
        />
        <KpiCard
          label="Aaj ki Tips"
          value={formatPKR(today.tips)}
          sub="Servers ke liye"
          icon={Award}
          color="amber"
          highlight
        />
        <KpiCard
          label="Active Orders"
          value={activeOrders.length}
          sub="Kitchen mein"
          icon={ChefHat}
          color="rose"
        />
        <KpiCard
          label="Active Deliveries"
          value={activeDeliveries}
          sub="On the way"
          icon={Bike}
          color="violet"
        />
      </section>

      {/* TABLES OVERVIEW */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Utensils className="h-5 w-5 text-orange-600" />
              Tables Status
            </h3>
            <p className="text-xs text-slate-500 font-semibold">{totalTables} total tables</p>
          </div>
          <Link to="/restaurant/tables" className="text-xs font-extrabold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1">
            Manage Tables <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE'] as const).map((status) => {
            const cfg = TABLE_STATUS_CONFIG[status];
            const count = tableSummary[status] ?? 0;
            const pct = totalTables > 0 ? (count / totalTables) * 100 : 0;
            return (
              <div key={status} className="rounded-2xl bg-slate-50 dark:bg-neutral-800/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={'h-3 w-3 rounded-full ' + cfg.bg} />
                  <span className={'text-[10px] uppercase font-extrabold ' + cfg.color}>{cfg.label}</span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{count}</div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-neutral-700 overflow-hidden">
                  <div className={'h-full ' + cfg.bg} style={{ width: pct + '%' }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CHARTS */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Hourly Orders</h3>
              <p className="text-xs text-slate-500 font-semibold">Peak hours identify karo</p>
            </div>
            <Clock className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickFormatter={(h) => h + ':00'} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  formatter={(value: any, name: any) => name === 'revenue' ? formatPKR(Number(value)) : value}
                  labelFormatter={(l) => l + ':00'}
                  contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }}
                />
                <Bar dataKey="count" fill="#f97316" radius={[8, 8, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Order Modes</h3>
              <p className="text-xs text-slate-500 font-semibold">Aaj ka breakdown</p>
            </div>
            <BarChart3 className="h-5 w-5 text-violet-500" />
          </div>
          {byMode.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500 font-semibold">No orders yet</div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byMode.map((m: any) => ({
                      name: MODE_CONFIG[m.mode]?.label || m.mode,
                      value: m._sum.total ?? 0,
                      mode: m.mode,
                    }))}
                    cx="50%" cy="45%" outerRadius={80} innerRadius={40} dataKey="value"
                    label={(entry: any) => {
                      const total = byMode.reduce((s: number, m: any) => s + (m._sum.total ?? 0), 0);
                      const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
                      return pct + '%';
                    }}
                    labelLine={false}
                  >
                    {byMode.map((m: any) => (
                      <Cell key={m.mode} fill={MODE_CONFIG[m.mode]?.hex || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <QuickLink to="/restaurant/orders" icon={ShoppingBag} label="Orders" color="orange" />
        <QuickLink to="/restaurant/tables" icon={Utensils} label="Tables" color="emerald" />
        <QuickLink to="/restaurant/menu" icon={ChefHat} label="Menu" color="violet" />
        <QuickLink to="/restaurant/modifiers" icon={Sparkles} label="Modifiers" color="pink" />
        <QuickLink to="/restaurant/kot" icon={Timer} label="KOT" color="amber" />
        <QuickLink to="/restaurant/riders" icon={Bike} label="Riders" color="blue" />
        <QuickLink to="/restaurant/happy-hours" icon={Zap} label="Happy Hours" color="rose" />
      </section>

      {/* ACTIVE ORDERS + TOP ITEMS */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">🔥 Live Orders</h3>
              <p className="text-xs text-slate-500 font-semibold">Currently in progress</p>
            </div>
            <Link to="/restaurant/orders" className="text-xs font-extrabold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {activeOrders.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">No active orders</div>
            ) : (
              activeOrders.slice(0, 8).map((order: any) => {
                const statusCfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PLACED;
                const modeCfg = MODE_CONFIG[order.mode];
                const ModeIcon = modeCfg?.icon || ShoppingBag;
                return (
                  <Link
                    key={order.id}
                    to={'/restaurant/orders/' + order.id}
                    className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition"
                  >
                    <div className={'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ' + statusCfg.color + ' text-white'}>
                      <ModeIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">{order.orderNumber}</span>
                        <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + statusCfg.color}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-semibold mt-0.5">
                        {order.table ? 'Table ' + order.table.tableNumber : modeCfg?.label || order.mode}
                        {' • '}
                        {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {formatPKR(order.total)}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">🏆 Top Selling Items (7d)</h3>
              <p className="text-xs text-slate-500 font-semibold">Best sellers</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {topItems.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">No data yet</div>
            ) : (
              topItems.slice(0, 8).map((it: any, i: number) => (
                <div key={it.productId} className="px-6 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0">
                    {i + 1}
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                    {it.product?.images?.[0]?.url ? (
                      <img src={it.product.images[0].url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate text-slate-900 dark:text-white">
                      {it.product?.name || 'Unknown'}
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">
                      {it._sum?.quantity?.toFixed(0)} sold
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {formatPKR(it._sum?.total ?? 0)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* KITCHEN PERFORMANCE */}
      {kitchenPerf && (
        <section className="rounded-3xl bg-gradient-to-br from-slate-950 to-orange-900 text-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <ChefHat className="h-3.5 w-3.5 text-amber-300" />
                Kitchen Performance (Today)
              </div>
              <h3 className="mt-2 text-2xl font-extrabold">Cooking Speed</h3>
            </div>
            <Timer className="h-8 w-8 text-amber-300" />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Avg Prep Time</div>
              <div className="mt-1 text-3xl font-extrabold tabular-nums">
                {kitchenPerf.avgPrepMinutes?.toFixed(1) || '0'}
                <span className="text-sm font-bold ml-1 text-white/70">min</span>
              </div>
              <div className="text-xs text-white/60 font-semibold mt-1">Cooking se ready tak</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Avg Serve Time</div>
              <div className="mt-1 text-3xl font-extrabold tabular-nums">
                {kitchenPerf.avgServeMinutes?.toFixed(1) || '0'}
                <span className="text-sm font-bold ml-1 text-white/70">min</span>
              </div>
              <div className="text-xs text-white/60 font-semibold mt-1">Ready se serve tak</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Completed Today</div>
              <div className="mt-1 text-3xl font-extrabold tabular-nums">
                {kitchenPerf.totalCompleted || 0}
              </div>
              <div className="text-xs text-white/60 font-semibold mt-1">Kitchen se paas</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color, growth, highlight }: any) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
  };
  return (
    <div className={
      'rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ' +
      (highlight
        ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-amber-300 dark:border-amber-800'
        : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800')
    }>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
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
          'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] +
          ' text-white flex items-center justify-center shadow-lg shrink-0'
        }>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, color }: any) {
  const colors: Record<string, string> = {
    orange: 'from-orange-500 to-red-600',
    emerald: 'from-emerald-500 to-green-600',
    violet: 'from-violet-500 to-purple-600',
    pink: 'from-pink-500 to-rose-600',
    amber: 'from-amber-500 to-yellow-600',
    blue: 'from-blue-500 to-blue-700',
    rose: 'from-rose-500 to-red-700',
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
