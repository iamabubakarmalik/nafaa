import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Utensils, ChefHat, Bike, ShoppingBag, Car, Home, Timer,
  Users, TrendingUp, TrendingDown, Wallet, Target, Sparkles,
  Package, Award, ArrowRight, Plus, RefreshCw, Clock,
  BookmarkPlus, Star, DollarSign, Activity, AlertTriangle,
  ChevronRight, Flame, ShoppingCart,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@/api/dashboard.api';
import { tablesApi } from '../api/tables.api';
import { ordersApi } from '../api/orders.api';
import { kotApi } from '../api/kot.api';
import { restaurantDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { SubscriptionBanner } from '@/features/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@/components/auth/EmailVerifyBanner';
import {
  DashboardHero, HeroKpiCard, IndustryStatCard, QuickStat, PnLCard,
  formatPercent, formatDate, PAYMENT_COLORS,
} from '@/features/dashboard/components/shared/DashboardShared';

const MODE_ICONS: Record<string, any> = {
  DINE_IN: Utensils, TAKEAWAY: ShoppingBag, DELIVERY: Bike,
  DRIVE_THRU: Car, ROOM_SERVICE: Home,
};

const MODE_COLORS: Record<string, string> = {
  DINE_IN: '#10b981', TAKEAWAY: '#3b82f6', DELIVERY: '#8b5cf6',
  DRIVE_THRU: '#f59e0b', ROOM_SERVICE: '#ec4899',
};

const TABLE_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500',
  OCCUPIED: 'bg-rose-500',
  RESERVED: 'bg-amber-500',
  CLEANING: 'bg-blue-500',
  OUT_OF_SERVICE: 'bg-slate-500',
};

export default function RestaurantDashboardV2() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['restaurant-tables-dash'],
    queryFn: () => tablesApi.list(),
    refetchInterval: 30_000,
  });

  const { data: activeOrders = [] } = useQuery({
    queryKey: ['restaurant-orders-active'],
    queryFn: () => ordersApi.list({}),
    refetchInterval: 20_000,
  });

  const { data: activeKots = [] } = useQuery({
    queryKey: ['kot-active-dash'],
    queryFn: () => kotApi.list({}),
    refetchInterval: 15_000,
  });

  const { data: rDash } = useQuery({
    queryKey: ['restaurant-dashboard-overview'],
    queryFn: () => restaurantDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const stats = data?.stats;
  const tenant = data?.tenant;

  // ─── Restaurant-specific stats ──────────────────────
  const tableStats = {
    total: tables.length,
    available: tables.filter((t) => t.status === 'AVAILABLE').length,
    occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
    reserved: tables.filter((t) => t.status === 'RESERVED').length,
    cleaning: tables.filter((t) => t.status === 'CLEANING').length,
  };

  const orderStats = {
    pending: activeOrders.filter((o: any) => ['PLACED', 'CONFIRMED', 'COOKING'].includes(o.status)).length,
    ready: activeOrders.filter((o: any) => o.status === 'READY').length,
    dineIn: activeOrders.filter((o: any) => o.mode === 'DINE_IN' && !['COMPLETED', 'CANCELLED'].includes(o.status)).length,
    delivery: activeOrders.filter((o: any) => o.mode === 'DELIVERY' && !['DELIVERED', 'CANCELLED'].includes(o.status)).length,
    takeaway: activeOrders.filter((o: any) => o.mode === 'TAKEAWAY' && !['COMPLETED', 'CANCELLED'].includes(o.status)).length,
  };

  const kotStats = {
    active: activeKots.filter((k: any) => !['SERVED', 'CANCELLED'].includes(k.status)).length,
    cooking: activeKots.filter((k: any) => k.status === 'COOKING').length,
    ready: activeKots.filter((k: any) => k.status === 'READY').length,
  };

  // Orders by mode breakdown
  const modeBreakdown = ['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'DRIVE_THRU', 'ROOM_SERVICE'].map((mode) => ({
    mode,
    label: mode.replace('_', ' '),
    count: activeOrders.filter((o: any) => o.mode === mode).length,
    revenue: activeOrders.filter((o: any) => o.mode === mode).reduce((s: number, o: any) => s + Number(o.total || 0), 0),
    color: MODE_COLORS[mode],
  })).filter((m) => m.count > 0);

  const trendData = (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { ...p, label: dayName };
  });

  const hourlyData = (data?.hourlySalesToday ?? [])
    .filter((h) => h.sales > 0 || (h.hour >= 8 && h.hour <= 23))
    .map((h) => ({
      ...h,
      label: h.hour === 0 ? '12 AM' : h.hour < 12 ? `${h.hour} AM` : h.hour === 12 ? '12 PM' : `${h.hour - 12} PM`,
    }));

  const growthVsYesterday = stats?.salesGrowthVsYesterday ?? 0;
  const growthVsLastMonth = stats?.salesGrowthVsLastMonth ?? 0;

  return (
    <div className="space-y-6">
      <SubscriptionBanner />
      <EmailVerifyBanner />

      {/* HERO */}
      <DashboardHero
        gradient="from-slate-950 via-orange-900 to-red-700"
        emoji="🍽️"
        industryLabel="Restaurant"
        industryBadgeColor="bg-orange-500/30 border border-orange-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="Open Restaurant POS"
        posLink="/pos"
      />

      {/* ═══ RESTAURANT LIVE OPERATIONS ═══ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Live Orders"
          value={orderStats.pending + orderStats.ready}
          subtitle={`${orderStats.pending} cooking • ${orderStats.ready} ready`}
          icon={ChefHat}
          color="from-orange-500 to-red-600"
          isHighlight
        />
        <HeroKpiCard
          title="Tables Occupied"
          value={`${tableStats.occupied}/${tableStats.total}`}
          subtitle={`${tableStats.available} available • ${tableStats.reserved} reserved`}
          icon={Utensils}
          color="from-emerald-500 to-teal-600"
        />
        <HeroKpiCard
          title="Kitchen Queue"
          value={kotStats.active}
          subtitle={`${kotStats.cooking} cooking • ${kotStats.ready} ready`}
          icon={Timer}
          color="from-amber-500 to-orange-600"
        />
        <HeroKpiCard
          title="Aaj ka Profit"
          value={formatPKR(stats?.netProfitToday ?? 0)}
          subtitle={`${stats?.ordersToday ?? 0} orders • AOV ${formatPKR(stats?.aovToday ?? 0)}`}
          icon={Target}
          color="from-violet-500 to-purple-600"
          trend={growthVsYesterday}
        />
      </section>

      {/* ═══ ORDER MODE BREAKDOWN ═══ */}
      <section className="rounded-3xl bg-gradient-to-br from-orange-50 via-red-50 to-amber-50 border-2 border-orange-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/30">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-orange-900">Live Operations</h3>
              <p className="text-xs text-orange-700">Active orders by mode</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/restaurant/orders">
              <Button variant="secondary" size="sm">
                <ShoppingBag className="h-3.5 w-3.5" /> All Orders
              </Button>
            </Link>
            <Link to="/restaurant/kot">
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                <Timer className="h-3.5 w-3.5" /> KOT Display
              </Button>
            </Link>
          </div>
        </div>

        {modeBreakdown.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {modeBreakdown.map((m) => {
              const Icon = MODE_ICONS[m.mode] || ChefHat;
              return (
                <div key={m.mode} className="rounded-2xl bg-white border-2 p-3" style={{ borderColor: m.color + '60' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 rounded-lg text-white flex items-center justify-center shrink-0" style={{ backgroundColor: m.color }}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-[10px] uppercase font-extrabold" style={{ color: m.color }}>{m.label}</div>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{m.count}</div>
                  <div className="text-[10px] font-bold text-slate-500">{formatPKR(m.revenue)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-white border-2 border-dashed border-orange-200 p-6 text-center">
            <ChefHat className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="font-extrabold text-slate-700 text-sm">No active orders</p>
            <p className="text-xs text-slate-500 mt-1">POS pe naya order banayen</p>
          </div>
        )}
      </section>

      {/* ═══ TABLE FLOOR VIEW ═══ */}
      {tables.length > 0 && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <h3 className="text-xl font-bold text-slate-900">🪑 Table Floor</h3>
              <p className="text-sm text-slate-500">Live table status — click for details</p>
            </div>
            <Link to="/restaurant/tables" className="text-orange-700 text-sm font-bold inline-flex items-center gap-1">
              Manage <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2">
            {tables.slice(0, 30).map((table) => {
              const cfg = TABLE_STATUS_COLORS[table.status] || 'bg-slate-500';
              return (
                <Link
                  key={table.id}
                  to={`/restaurant/tables`}
                  className="relative rounded-xl border-2 border-slate-200 hover:border-orange-400 bg-white p-2 text-center transition group"
                >
                  <div className={`absolute -top-1 -right-1 h-3 w-3 rounded-full ring-2 ring-white ${cfg} ${table.status === 'OCCUPIED' ? 'animate-pulse' : ''}`} />
                  <div className="text-lg font-extrabold text-slate-900 tabular-nums">{table.tableNumber}</div>
                  <div className="text-[9px] font-bold text-slate-500 flex items-center justify-center gap-0.5 mt-0.5">
                    <Users className="h-2 w-2" />
                    {table.capacity}
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-4 flex-wrap text-xs">
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /><span className="font-bold text-slate-700">Available ({tableStats.available})</span></div>
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /><span className="font-bold text-slate-700">Occupied ({tableStats.occupied})</span></div>
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /><span className="font-bold text-slate-700">Reserved ({tableStats.reserved})</span></div>
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /><span className="font-bold text-slate-700">Cleaning ({tableStats.cleaning})</span></div>
          </div>
        </section>
      )}

      {/* ═══ 7-DAY TREND + HOURLY ═══ */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">7-Day Restaurant Sales</h3>
              <p className="text-sm text-slate-500">Revenue & profit trend</p>
            </div>
            <Link to="/reports" className="text-orange-700 text-sm font-bold inline-flex items-center gap-1">
              Reports <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {trendData.length >= 2 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="rSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#f97316" fill="url(#rSales)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#rProfit)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">Need more data</div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Peak Hours Today</h3>
              <p className="text-sm text-slate-500">Rush time identify karein</p>
            </div>
            <Clock className="h-5 w-5 text-orange-500" />
          </div>
          {hourlyData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={9} interval={1} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="sales" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">No sales yet today</div>
          )}
        </div>
      </section>

      {/* ═══ P&L THIS MONTH ═══ */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — Is Mahina</h3>
            <p className="text-sm text-slate-500">Restaurant monthly performance</p>
          </div>
          {growthVsLastMonth !== 0 && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold ${
              growthVsLastMonth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {growthVsLastMonth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {formatPercent(growthVsLastMonth)} vs last month
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <PnLCard label="Revenue" value={formatPKR(stats?.salesMonth ?? 0)} sub={`${stats?.ordersMonth ?? 0} orders`} color="emerald" />
          <PnLCard label="Food Cost" value={formatPKR(stats?.cogsMonth ?? 0)} sub="COGS" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, utilities, staff" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="orange" isHighlight />
        </div>
      </section>

      {/* ═══ QUICK STATS ═══ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Menu Items" value={stats?.totalProducts ?? 0} icon={ChefHat} tone="orange" link="/restaurant/menu" />
        <QuickStat title="Tables" value={tableStats.total} icon={Utensils} tone="emerald" link="/restaurant/tables" />
        <QuickStat title="Modifiers" value={stats?.totalCategories ?? 0} icon={Sparkles} tone="pink" link="/restaurant/modifiers" />
        <QuickStat title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} tone="blue" link="/customers" />
        <QuickStat title="Low Stock" value={stats?.lowStockCount ?? 0} icon={AlertTriangle} tone="amber" link="/low-stock" alert />
        <QuickStat title="Riders" value={0} icon={Bike} tone="violet" link="/restaurant/riders" />
      </section>

      {/* ═══ ACTIVE ORDERS LIVE FEED ═══ */}
      {activeOrders.length > 0 && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">Live Orders Feed</h3>
                <p className="text-sm text-slate-500">Latest active orders</p>
              </div>
            </div>
            <Link to="/restaurant/orders" className="text-orange-700 text-sm font-bold inline-flex items-center gap-1">
              All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {activeOrders.slice(0, 8).map((order: any) => {
              const ModeIcon = MODE_ICONS[order.mode] || ChefHat;
              const statusColor =
                order.status === 'READY' ? 'bg-emerald-100 text-emerald-700' :
                order.status === 'COOKING' ? 'bg-amber-100 text-amber-700' :
                order.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' :
                'bg-blue-100 text-blue-700';
              return (
                <Link
                  key={order.id}
                  to={`/restaurant/orders/${order.id}`}
                  className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                      <ModeIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-slate-900 text-sm">{order.orderNumber}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${statusColor}`}>{order.status}</span>
                        {order.table && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">
                            T-{order.table.tableNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 font-semibold mt-0.5">
                        {order.customerName || 'Walk-in'} • {order.items?.length || 0} items
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(order.total)}</div>
                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">{formatDate(order.createdAt)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ TOP MENU ITEMS ═══ */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">Best Selling Items</h3>
                <p className="text-sm text-slate-500">This month top menu items</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.topProducts?.length ? (
              data.topProducts.slice(0, 5).map((p, idx) => {
                const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
                return (
                  <div key={p.productId} className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0`}>
                        {idx < 3 ? <Star className="h-4 w-4 fill-white" /> : idx + 1}
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {p.product?.images?.[0]?.url ? (
                          <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ChefHat className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate text-sm">{p.product?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{p.quantitySold} sold • {p.orderCount} orders</div>
                      </div>
                    </div>
                    <div className="font-extrabold text-emerald-700 text-sm">{formatPKR(p.revenue)}</div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center text-sm text-slate-500">No sales data yet</div>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Payment Methods</h3>
              <p className="text-sm text-slate-500">This month breakdown</p>
            </div>
          </div>
          {data?.paymentBreakdown?.length ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.paymentBreakdown}
                    cx="50%" cy="45%" outerRadius={80} innerRadius={40} dataKey="total"
                    label={(entry: any) => {
                      const sum = data.paymentBreakdown.reduce((s, p) => s + p.total, 0);
                      const pct = sum > 0 ? ((entry.total / sum) * 100).toFixed(0) : '0';
                      return `${pct}%`;
                    }}
                    labelLine={false}
                  >
                    {data.paymentBreakdown.map((p) => (
                      <Cell key={p.method} fill={PAYMENT_COLORS[p.method] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">No payment data</div>
          )}
        </div>
      </section>
    </div>
  );
}
