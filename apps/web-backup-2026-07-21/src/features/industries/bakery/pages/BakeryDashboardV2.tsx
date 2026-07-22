import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Cake, Cookie, ChefHat, Calendar, Wheat, Timer, ShoppingBag, RefreshCw,
  TrendingUp, TrendingDown, Package, DollarSign, Clock, ArrowRight, Award,
  Users, Star, Zap, CreditCard, AlertTriangle, CheckCircle2, Heart,
  Sparkles, BarChart3, Activity, Flame,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { dashboardApi } from '@/api/dashboard.api';
import { bakeryDashboardApi } from '../api/dashboard.api';
import { cakeOrdersApi } from '../api/cake-orders.api';
import { productionApi } from '../api/production.api';
import { ingredientsApi } from '../api/ingredients.api';
import { freshnessApi } from '../api/freshness.api';
import { formatPKR } from '@/lib/format';
import { SubscriptionBanner } from '@/features/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@/components/auth/EmailVerifyBanner';
import {
  DashboardHero, HeroKpiCard, QuickStat, PnLCard,
  formatPercent,
} from '@/features/dashboard/components/shared/DashboardShared';
import { differenceInDays, differenceInHours } from 'date-fns';

const CAKE_STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-blue-500', DEPOSIT_PAID: 'bg-cyan-500', IN_PRODUCTION: 'bg-orange-500',
  BAKING: 'bg-red-500', DECORATING: 'bg-fuchsia-500', QUALITY_CHECK: 'bg-violet-500',
  READY: 'bg-emerald-600', OUT_FOR_DELIVERY: 'bg-amber-500', DELIVERED: 'bg-emerald-700',
};

export default function BakeryDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
  });

  const { data: bDash } = useQuery({
    queryKey: ['bakery-dashboard'],
    queryFn: () => bakeryDashboardApi.overview().catch(() => null),
    refetchInterval: 60_000,
  });

  const { data: cakeOrders = [] } = useQuery({
    queryKey: ['cake-orders-dashboard'],
    queryFn: () => cakeOrdersApi.list({}),
  });

  const { data: todayProduction = [] } = useQuery({
    queryKey: ['production-today'],
    queryFn: () => productionApi.today(),
  });

  const { data: lowIngredients = [] } = useQuery({
    queryKey: ['ingredients-low'],
    queryFn: () => ingredientsApi.lowStock(),
  });

  const { data: freshnessSummary } = useQuery({
    queryKey: ['freshness-summary'],
    queryFn: () => freshnessApi.summary().catch(() => null),
  });

  const stats = data?.stats;
  const tenant = data?.tenant;

  const cakeOrderStats = (() => {
    const active = cakeOrders.filter((o: any) => ['CONFIRMED', 'DEPOSIT_PAID', 'IN_PRODUCTION', 'BAKING', 'DECORATING', 'QUALITY_CHECK', 'READY'].includes(o.status));
    const today = cakeOrders.filter((o: any) => {
      if (!o.eventDate && !o.deliveryDate) return false;
      const d = new Date(o.deliveryDate || o.eventDate);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    });
    const upcoming = cakeOrders.filter((o: any) => {
      if (!o.eventDate && !o.deliveryDate) return false;
      const d = new Date(o.deliveryDate || o.eventDate);
      const now = new Date();
      const days = differenceInDays(d, now);
      return days >= 0 && days <= 3 && !['DELIVERED', 'CANCELLED'].includes(o.status);
    });
    const pendingRevenue = active.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
    const collected = active.reduce((s: number, o: any) => s + Number(o.paidAmount || 0), 0);
    return { active: active.length, today: today.length, upcoming: upcoming.length, pendingRevenue, collected, pending: pendingRevenue - collected };
  })();

  const productionStats = (() => {
    const active = todayProduction.filter((p: any) => ['IN_PROGRESS', 'BAKING', 'DECORATING'].includes(p.status));
    const totalItems = todayProduction.reduce((s: number, p: any) => s + Number(p.totalItems || 0), 0);
    const completedItems = todayProduction.reduce((s: number, p: any) => s + Number(p.completedItems || 0), 0);
    return { active: active.length, totalItems, completedItems, plans: todayProduction.length };
  })();

  const trendData = (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { ...p, label: dayName };
  });

  const growthVsYesterday = stats?.salesGrowthVsYesterday ?? 0;
  const growthVsLastMonth = stats?.salesGrowthVsLastMonth ?? 0;

  return (
    <div className="space-y-6">
      <SubscriptionBanner />
      <EmailVerifyBanner />

      <DashboardHero
        gradient="from-slate-950 via-pink-900 to-fuchsia-700"
        emoji="🍰"
        industryLabel="Bakery"
        industryBadgeColor="bg-pink-500/30 border border-pink-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="Open Bakery POS"
        posLink="/pos"
      />

      {/* CAKE ORDERS ALERT */}
      {cakeOrderStats.active > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-pink-100 via-fuchsia-50 to-purple-100 border-2 border-pink-300 shadow-lg p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white flex items-center justify-center shadow-lg animate-pulse">
                <Cake className="h-7 w-7" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-pink-700">Active Cake Orders</div>
                <div className="text-2xl font-extrabold text-slate-900">{cakeOrderStats.active} custom orders in production</div>
                <div className="text-sm text-slate-700 font-semibold mt-0.5">
                  Today: <span className="font-extrabold text-red-700">{cakeOrderStats.today}</span> •
                  Next 3 days: <span className="font-extrabold text-amber-700">{cakeOrderStats.upcoming}</span> •
                  Revenue: <span className="font-extrabold text-emerald-700">{formatPKR(cakeOrderStats.pendingRevenue)}</span>
                </div>
              </div>
            </div>
            <Link to="/bakery/cake-orders">
              <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-700 text-white font-extrabold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition">
                Manage Orders <ArrowRight className="h-3.5 w-3.5 inline ml-1" />
              </button>
            </Link>
          </div>
        </section>
      )}

      {/* KPIs */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard title="Cake Orders" value={cakeOrderStats.active} subtitle={`${cakeOrderStats.today} today`} icon={Cake} color="from-pink-500 to-fuchsia-600" isHighlight />
        <HeroKpiCard title="Today Production" value={productionStats.plans} subtitle={`${productionStats.completedItems}/${productionStats.totalItems} items`} icon={ChefHat} color="from-orange-500 to-amber-600" />
        <HeroKpiCard title="Low Ingredients" value={lowIngredients.length} subtitle="Need restocking" icon={Wheat} color="from-amber-500 to-orange-700" />
        <HeroKpiCard title="Fresh Stock" value={freshnessSummary?.fresh ?? 0} subtitle={`${freshnessSummary?.expiring ?? 0} expiring soon`} icon={Timer} color="from-emerald-500 to-green-600" trend={growthVsYesterday} />
      </section>

      {/* TREND */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">7-Day Bakery Sales</h3>
            <p className="text-sm text-slate-500">Revenue & profit trend</p>
          </div>
          <Link to="/reports" className="text-pink-700 text-sm font-bold inline-flex items-center gap-1">
            Reports <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {trendData.length >= 2 ? (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="bSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="#ec4899" fill="url(#bSales)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#bProfit)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">Need more data</div>}
      </section>

      {/* P&L */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — Is Mahina</h3>
            <p className="text-sm text-slate-500">Bakery monthly performance</p>
          </div>
          {growthVsLastMonth !== 0 && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold ${growthVsLastMonth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {growthVsLastMonth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {formatPercent(growthVsLastMonth)} vs last month
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <PnLCard label="Revenue" value={formatPKR(stats?.salesMonth ?? 0)} sub={`${stats?.ordersMonth ?? 0} orders`} color="emerald" />
          <PnLCard label="Ingredient Cost" value={formatPKR(stats?.cogsMonth ?? 0)} sub="COGS" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, staff, gas" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="violet" isHighlight />
        </div>
      </section>

      {/* QUICK ACCESS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/bakery/cake-orders/new" icon={Cake} label="New Cake Order" color="pink" badge="HOT" />
        <QuickLink to="/bakery/cake-orders" icon={Calendar} label="Cake Orders" color="fuchsia" />
        <QuickLink to="/bakery/products" icon={Cookie} label="Products" color="amber" />
        <QuickLink to="/bakery/production" icon={ChefHat} label="Production" color="orange" />
        <QuickLink to="/bakery/ingredients" icon={Wheat} label="Ingredients" color="yellow" />
        <QuickLink to="/bakery/freshness" icon={Timer} label="Freshness" color="cyan" />
        <QuickLink to="/bakery/bulk-orders" icon={ShoppingBag} label="Bulk Orders" color="violet" />
        <QuickLink to="/bakery/products/new" icon={Sparkles} label="+ Add Product" color="rose" />
      </section>

      {/* UPCOMING CAKE ORDERS + LOW STOCK */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Cake className="h-5 w-5 text-pink-600" /> Upcoming Cake Deliveries</h3>
              <p className="text-xs text-slate-500 font-semibold">Next 3 days</p>
            </div>
            <Link to="/bakery/cake-orders" className="text-xs font-extrabold text-pink-600 inline-flex items-center gap-1">All <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {cakeOrderStats.upcoming === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold"><CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />No upcoming deliveries</div>
            ) : (
              cakeOrders
                .filter((o: any) => {
                  if (!o.eventDate && !o.deliveryDate) return false;
                  const d = new Date(o.deliveryDate || o.eventDate);
                  const now = new Date();
                  const days = differenceInDays(d, now);
                  return days >= 0 && days <= 3 && !['DELIVERED', 'CANCELLED'].includes(o.status);
                })
                .sort((a: any, b: any) => new Date(a.deliveryDate || a.eventDate).getTime() - new Date(b.deliveryDate || b.eventDate).getTime())
                .slice(0, 10)
                .map((o: any) => {
                  const deliveryDate = new Date(o.deliveryDate || o.eventDate);
                  const now = new Date();
                  const hoursLeft = differenceInHours(deliveryDate, now);
                  const isToday = deliveryDate.toDateString() === now.toDateString();
                  return (
                    <Link key={o.id} to={`/bakery/cake-orders/${o.id}`} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white flex items-center justify-center shrink-0 ${isToday ? 'animate-pulse' : ''}`}>
                        <Cake className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900">{o.orderNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ${CAKE_STATUS_COLORS[o.status] || 'bg-slate-500'}`}>{o.status.replace('_', ' ')}</span>
                        </div>
                        <div className="text-xs text-slate-600 font-semibold">{o.customerName || 'Walk-in'} • {o.category}</div>
                        {o.flavor && <div className="text-[10px] text-pink-600 font-bold">🎨 {o.flavor}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-xs font-extrabold ${hoursLeft <= 6 ? 'text-red-700' : hoursLeft <= 24 ? 'text-amber-700' : 'text-slate-700'}`}>
                          {isToday ? '⚠️ TODAY' : hoursLeft < 24 ? hoursLeft + 'h' : Math.ceil(hoursLeft / 24) + 'd'}
                        </div>
                        <div className="text-[10px] font-bold text-emerald-700">{formatPKR(o.total)}</div>
                      </div>
                    </Link>
                  );
                })
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Wheat className="h-5 w-5 text-amber-600" /> Low Stock Ingredients</h3>
              <p className="text-xs text-slate-500 font-semibold">Order these before running out</p>
            </div>
            <Link to="/bakery/ingredients" className="text-xs font-extrabold text-amber-600 inline-flex items-center gap-1">All <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {lowIngredients.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold"><CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />All ingredients in stock</div>
            ) : (
              lowIngredients.slice(0, 10).map((ing: any) => (
                <Link key={ing.id} to={`/bakery/ingredients`} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0"><Wheat className="h-5 w-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm text-slate-900 truncate">{ing.name}</div>
                    <div className="text-xs text-slate-500 font-semibold">{ing.category} • {ing.brand || 'No brand'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-extrabold ${ing.currentStock === 0 ? 'text-red-700' : 'text-amber-700'} tabular-nums`}>
                      {ing.currentStock} {ing.unit}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">Min: {ing.minStock}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* PRODUCTION STATUS */}
      {todayProduction.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-2 border-orange-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><ChefHat className="h-5 w-5 text-orange-600" /> Today's Production Plans</h3>
              <p className="text-sm text-slate-600 font-semibold mt-0.5">Kitchen workflow status</p>
            </div>
            <Link to="/bakery/production" className="text-orange-700 text-sm font-bold inline-flex items-center gap-1">
              Manage <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayProduction.slice(0, 6).map((p: any) => {
              const pct = p.totalItems > 0 ? (p.completedItems / p.totalItems) * 100 : 0;
              return (
                <div key={p.id} className="rounded-2xl bg-white border-2 border-orange-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-sm">{p.planNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ${p.status === 'COMPLETED' ? 'bg-emerald-600' : p.status === 'BAKING' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-bold mb-2">
                    {p.shift} shift • {p.completedItems}/{p.totalItems} items
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-emerald-600" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* QUICK STATS */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Products" value={stats?.totalProducts ?? 0} icon={Cookie} tone="pink" link="/bakery/products" />
        <QuickStat title="Cake Orders" value={cakeOrderStats.active} icon={Cake} tone="fuchsia" link="/bakery/cake-orders" />
        <QuickStat title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} tone="blue" link="/customers" />
        <QuickStat title="Low Ingredients" value={lowIngredients.length} icon={AlertTriangle} tone="amber" link="/bakery/ingredients" alert />
        <QuickStat title="Expiring" value={freshnessSummary?.expiring ?? 0} icon={Timer} tone="orange" link="/bakery/freshness" />
        <QuickStat title="Fresh Stock" value={freshnessSummary?.fresh ?? 0} icon={CheckCircle2} tone="emerald" link="/bakery/freshness" />
      </section>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, color, badge }: any) {
  const colors: Record<string, string> = {
    pink: 'from-pink-500 to-rose-600', fuchsia: 'from-fuchsia-500 to-pink-600',
    amber: 'from-amber-500 to-orange-600', orange: 'from-orange-500 to-red-600',
    yellow: 'from-yellow-500 to-amber-600', cyan: 'from-cyan-500 to-blue-600',
    violet: 'from-violet-500 to-purple-600', rose: 'from-rose-500 to-pink-700',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white border-2 border-slate-200 p-4 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition relative">
      {badge && <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-red-500 text-white text-[8px] font-extrabold uppercase animate-pulse">{badge}</span>}
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-2`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs font-extrabold text-slate-900">{label}</div>
    </Link>
  );
}
