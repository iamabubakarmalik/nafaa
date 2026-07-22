import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Cake, Sparkles, RefreshCw, TrendingUp, DollarSign, Package, Users,
  ArrowRight, Truck, Award, Calendar, AlertCircle, Clock, Heart,
  ChefHat, Wheat, Flame, ShoppingBag, Cookie, Timer, Star,
} from 'lucide-react';
import { bakeryDashboardApi } from '../api/dashboard.api';
import { CATEGORY_EMOJI, OCCASION_EMOJI } from '../api/constants';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { format, differenceInHours, isToday, isTomorrow } from 'date-fns';

export default function BakeryDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bakery-dashboard'],
    queryFn: () => bakeryDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const totals = overview?.totals ?? {
    totalProducts: 0, totalIngredients: 0, criticalIngredients: 0,
    lowStockIngredients: 0, activeBulkOrders: 0,
  };
  const operations = overview?.operations ?? {
    todayOrders: 0, tomorrowOrders: 0, weekOrders: 0,
    urgentOrders: 0, inProduction: 0, ready: 0,
  };
  const revenue = overview?.revenue ?? { today: 0, todayCollected: 0, monthly: 0, monthlyCollected: 0 };
  const freshness = overview?.freshness ?? { fresh: 0, dayOld: 0, nearExpiry: 0, expired: 0 };
  const upcoming = overview?.upcoming ?? [];
  const topSelling = overview?.topSelling ?? [];
  const byCategory = overview?.byCategory ?? [];
  const byOccasion = overview?.byOccasion ?? [];

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-rose-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Bakery Command Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🎂 Bakery Dashboard
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Cakes, production, ingredients, freshness — sab track
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20"
            >
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/bakery/cake-orders/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Cake className="h-4 w-4" />
                New Cake Order
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* URGENT ALERT */}
      {operations.urgentOrders > 0 && (
        <section className="rounded-3xl bg-gradient-to-r from-rose-500 to-red-600 text-white p-4 shadow-lg flex items-center gap-3 animate-pulse">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-lg">⚡ Urgent Attention Required</div>
            <div className="text-sm font-bold text-white/90">
              {operations.urgentOrders} order{operations.urgentOrders > 1 ? 's' : ''} needed within 6 hours
            </div>
          </div>
          <Link to="/bakery/cake-orders?status=urgent" className="px-4 py-2 rounded-xl bg-white text-red-600 text-sm font-extrabold hover:bg-slate-100">
            View Now
          </Link>
        </section>
      )}

      {/* TODAY OPERATIONS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Today's Orders" value={operations.todayOrders} icon={Cake} color="pink" sub={operations.tomorrowOrders + ' tomorrow'} />
        <KpiCard label="In Production" value={operations.inProduction} icon={ChefHat} color="amber" />
        <KpiCard label="Ready" value={operations.ready} icon={Package} color="emerald" />
        <KpiCard label="Today Revenue" value={formatPKR(revenue.today)} icon={DollarSign} color="rose" />
      </section>

      {/* MONTHLY + FRESHNESS */}
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl bg-gradient-to-br from-slate-950 to-pink-900 text-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <TrendingUp className="h-3.5 w-3.5 text-amber-300" />
                Last 30 Days
              </div>
              <h3 className="mt-2 text-2xl font-extrabold">Monthly Overview</h3>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
              <div className="text-[10px] uppercase font-extrabold text-white/70">Total Revenue</div>
              <div className="mt-1 text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(revenue.monthly)}</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
              <div className="text-[10px] uppercase font-extrabold text-white/70">Collected</div>
              <div className="mt-1 text-3xl font-extrabold text-cyan-300 tabular-nums">{formatPKR(revenue.monthlyCollected)}</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
              <div className="text-[10px] uppercase font-extrabold text-white/70">Outstanding</div>
              <div className="mt-1 text-3xl font-extrabold text-amber-300 tabular-nums">{formatPKR(revenue.monthly - revenue.monthlyCollected)}</div>
            </div>
          </div>
        </div>

        {/* Freshness */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-green-700 text-white p-6 shadow-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20 mb-3">
            <Timer className="h-3.5 w-3.5 text-amber-300" />
            Freshness Status
          </div>

          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between rounded-lg bg-white/10 backdrop-blur border border-white/20 px-3 py-2">
              <span className="text-xs font-extrabold flex items-center gap-1">✨ Fresh</span>
              <span className="text-lg font-extrabold tabular-nums">{freshness.fresh}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/10 backdrop-blur border border-white/20 px-3 py-2">
              <span className="text-xs font-extrabold flex items-center gap-1">📅 Day Old</span>
              <span className="text-lg font-extrabold tabular-nums text-amber-200">{freshness.dayOld}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/10 backdrop-blur border border-white/20 px-3 py-2">
              <span className="text-xs font-extrabold flex items-center gap-1">⚠️ Near Expiry</span>
              <span className="text-lg font-extrabold tabular-nums text-orange-200">{freshness.nearExpiry}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/10 backdrop-blur border border-white/20 px-3 py-2">
              <span className="text-xs font-extrabold flex items-center gap-1">🚫 Expired</span>
              <span className="text-lg font-extrabold tabular-nums text-rose-200">{freshness.expired}</span>
            </div>
          </div>

          <Link to="/bakery/freshness" className="mt-3 flex items-center justify-center gap-1 text-xs font-extrabold text-white/90 hover:text-white">
            Manage <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* INGREDIENT ALERTS */}
      {(totals.lowStockIngredients > 0 || totals.criticalIngredients > 0) && (
        <section className="grid sm:grid-cols-2 gap-3">
          {totals.lowStockIngredients > 0 && (
            <Link to="/bakery/ingredients?lowStock=true" className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 hover:shadow-lg transition flex items-center gap-3">
              <Wheat className="h-8 w-8" />
              <div className="flex-1">
                <div className="text-xs uppercase font-extrabold text-white/80">Low Stock Alert</div>
                <div className="text-2xl font-extrabold">{totals.lowStockIngredients} ingredient{totals.lowStockIngredients > 1 ? 's' : ''}</div>
              </div>
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
          {totals.criticalIngredients > 0 && (
            <Link to="/bakery/ingredients?critical=true" className="rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white p-4 hover:shadow-lg transition flex items-center gap-3">
              <AlertCircle className="h-8 w-8" />
              <div className="flex-1">
                <div className="text-xs uppercase font-extrabold text-white/80">Critical Items</div>
                <div className="text-2xl font-extrabold">{totals.criticalIngredients} critical</div>
              </div>
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
        </section>
      )}

      {/* KPI GRID */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MiniKpi label="Products" value={totals.totalProducts} icon={Cake} color="pink" to="/bakery/products" />
        <MiniKpi label="Ingredients" value={totals.totalIngredients} icon={Wheat} color="amber" to="/bakery/ingredients" />
        <MiniKpi label="Week Orders" value={operations.weekOrders} icon={Calendar} color="fuchsia" to="/bakery/cake-orders" />
        <MiniKpi label="Bulk Orders" value={totals.activeBulkOrders} icon={ShoppingBag} color="violet" to="/bakery/bulk-orders" />
        <MiniKpi label="Urgent" value={operations.urgentOrders} icon={Flame} color="rose" to="/bakery/cake-orders?status=urgent" />
      </section>

      {/* QUICK LINKS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/bakery/cake-orders/new" icon={Cake} label="New Cake" color="pink" />
        <QuickLink to="/bakery/cake-orders" icon={Calendar} label="Orders" color="fuchsia" />
        <QuickLink to="/bakery/production" icon={ChefHat} label="Production" color="amber" />
        <QuickLink to="/bakery/products" icon={Cookie} label="Products" color="orange" />
        <QuickLink to="/bakery/ingredients" icon={Wheat} label="Ingredients" color="yellow" />
        <QuickLink to="/bakery/freshness" icon={Timer} label="Freshness" color="emerald" />
        <QuickLink to="/bakery/bulk-orders" icon={ShoppingBag} label="Bulk Orders" color="violet" />
        <QuickLink to="/bakery/calendar" icon={Calendar} label="Calendar" color="cyan" />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* UPCOMING */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-pink-600" />
                Upcoming Orders
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Next 7 days</p>
            </div>
            <Link to="/bakery/cake-orders" className="text-xs font-extrabold text-pink-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {upcoming.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No upcoming orders
              </div>
            ) : (
              upcoming.map((order: any) => {
                const needed = new Date(order.neededBy);
                const hoursLeft = differenceInHours(needed, new Date());
                const isUrgent = hoursLeft <= 6 && hoursLeft >= 0;
                const isTod = isToday(needed);
                const isTom = isTomorrow(needed);

                return (
                  <Link key={order.id} to={'/bakery/cake-orders/' + order.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shrink-0 text-2xl">
                      {OCCASION_EMOJI[order.occasion] || CATEGORY_EMOJI[order.category] || '🎂'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                          {order.customerName}
                        </span>
                        {isUrgent && <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase animate-pulse">URGENT</span>}
                        {isTod && !isUrgent && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase">TODAY</span>}
                        {isTom && <span className="px-1.5 py-0.5 rounded bg-blue-500 text-white text-[9px] font-extrabold uppercase">TOMORROW</span>}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold truncate">
                        {order.orderNumber} • {order.flavor?.replace('_', ' ')}
                      </div>
                      {order.celebrantName && (
                        <div className="text-[10px] text-fuchsia-600 font-bold truncate">
                          🎉 {order.celebrantName}{order.celebrantAge ? ' (' + order.celebrantAge + ')' : ''}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {format(needed, 'HH:mm')}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500">
                        {isTod ? 'Today' : isTom ? 'Tomorrow' : format(needed, 'dd MMM')}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* TOP SELLING */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="h-5 w-5 text-rose-600" />
                Top Selling
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Last 30 days</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {topSelling.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <ChefHat className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No sales data yet
              </div>
            ) : (
              topSelling.map((item: any, i: number) => (
                <div key={item.productName + i} className="px-6 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{item.productName}</div>
                    <div className="text-[10px] font-bold text-slate-500">{item._count._all} orders</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums text-sm">{formatPKR(item._sum.total ?? 0)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* BY CATEGORY + BY OCCASION */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Cookie className="h-5 w-5 text-orange-600" />
            Products by Category
          </h3>
          {byCategory.length === 0 ? (
            <p className="text-sm text-slate-500 font-semibold text-center py-8">No data yet</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {byCategory.slice(0, 9).map((c: any) => (
                <div key={c.category} className="rounded-xl bg-slate-50 dark:bg-neutral-800/50 p-3 text-center">
                  <div className="text-3xl mb-1">{CATEGORY_EMOJI[c.category] || '🎂'}</div>
                  <div className="text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 truncate">
                    {c.category.replace('_', ' ')}
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">{c._count._all}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-fuchsia-600" />
            Orders by Occasion
          </h3>
          {byOccasion.length === 0 ? (
            <p className="text-sm text-slate-500 font-semibold text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-2">
              {byOccasion.slice(0, 6).map((o: any) => (
                <div key={o.occasion} className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-neutral-800/50 p-3">
                  <span className="text-2xl">{OCCASION_EMOJI[o.occasion] || '⭐'}</span>
                  <span className="flex-1 text-sm font-extrabold text-slate-900 dark:text-white truncate">{o.occasion.replace('_', ' ')}</span>
                  <span className="text-lg font-extrabold text-fuchsia-700 tabular-nums">{o._count._all}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    pink: 'from-pink-500 to-rose-600',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-green-600',
    rose: 'from-rose-500 to-red-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
          {sub && <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">{sub}</div>}
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

function MiniKpi({ label, value, icon: Icon, color, to }: any) {
  const colors: Record<string, string> = {
    pink: 'from-pink-500 to-rose-600',
    amber: 'from-amber-500 to-orange-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
    violet: 'from-violet-500 to-purple-600',
    rose: 'from-rose-500 to-red-600',
  };
  return (
    <Link
      to={to}
      className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 hover:shadow-lg hover:-translate-y-0.5 transition text-center"
    >
      <div className={
        'h-11 w-11 rounded-xl bg-gradient-to-br ' + colors[color] +
        ' text-white flex items-center justify-center shadow-lg mx-auto mb-2 group-hover:scale-110 transition-transform'
      }>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
      <div className="text-[10px] font-extrabold uppercase text-slate-500 mt-0.5">{label}</div>
    </Link>
  );
}

function QuickLink({ to, icon: Icon, label, color }: any) {
  const colors: Record<string, string> = {
    pink: 'from-pink-500 to-rose-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
    amber: 'from-amber-500 to-orange-600',
    orange: 'from-orange-500 to-red-600',
    yellow: 'from-yellow-500 to-amber-600',
    emerald: 'from-emerald-500 to-green-600',
    violet: 'from-violet-500 to-purple-600',
    cyan: 'from-cyan-500 to-blue-600',
  };
  return (
    <Link
      to={to}
      className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition"
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
