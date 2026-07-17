import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Beef, Sparkles, RefreshCw, TrendingUp, DollarSign, Package, Users,
  ShieldCheck, ArrowRight, Truck, Award, Calendar, AlertCircle,
  CheckCircle2, Scissors, Building2, Clock, Heart, Star, Flame,
} from 'lucide-react';
import { meatDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { format, differenceInDays } from 'date-fns';

const ANIMAL_EMOJI: Record<string, string> = {
  BEEF: '🐄', MUTTON: '🐑', GOAT: '🐐', LAMB: '🐏', CHICKEN: '🐔',
  DUCK: '🦆', TURKEY: '🦃', QUAIL: '🐦', CAMEL: '🐫', BUFFALO: '🐃',
  FISH: '🐟', PRAWN: '🦐', OTHER: '🥩',
};

export default function MeatDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['meat-dashboard'],
    queryFn: () => meatDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const totals = overview?.totals ?? { liveAnimals: 0, totalProducts: 0, activeSubscriptions: 0, activeQurbani: 0, wholesaleAccounts: 0 };
  const operations = overview?.operations ?? { todayOrders: 0, pendingOrders: 0, upcomingDeliveries: 0 };
  const revenue = overview?.revenue ?? { today: 0, monthly: 0, collected: 0 };
  const halal = overview?.halalCompliance ?? { total: 0, halal: 0, pct: 100 };
  const topSelling = overview?.topSelling ?? [];
  const upcomingSubs = overview?.upcomingSubs ?? [];
  const byAnimal = overview?.byAnimal ?? [];

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-red-900 to-rose-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-red-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-rose-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Butchery Command Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🥩 Meat Dashboard
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Live animals, cuts, halal compliance — sab track
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
            <Link to="/meat/weight-orders/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Package className="h-4 w-4" />
                New Order
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* TODAY OPERATIONS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Today's Orders" value={operations.todayOrders} icon={Package} color="red" />
        <KpiCard label="Pending" value={operations.pendingOrders} icon={Clock} color="amber" sub="Being processed" />
        <KpiCard label="Out for Delivery" value={operations.upcomingDeliveries} icon={Truck} color="blue" />
        <KpiCard label="Today Revenue" value={formatPKR(revenue.today)} icon={DollarSign} color="emerald" />
      </section>

      {/* MONTHLY + HALAL COMPLIANCE */}
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl bg-gradient-to-br from-slate-950 to-red-900 text-white p-6 shadow-xl">
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
              <div className="mt-1 text-3xl font-extrabold text-cyan-300 tabular-nums">{formatPKR(revenue.collected)}</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
              <div className="text-[10px] uppercase font-extrabold text-white/70">Outstanding</div>
              <div className="mt-1 text-3xl font-extrabold text-amber-300 tabular-nums">{formatPKR(revenue.monthly - revenue.collected)}</div>
            </div>
          </div>
        </div>

        {/* Halal Compliance */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-green-700 text-white p-6 shadow-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20 mb-3">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
            Halal Compliance
          </div>
          <div className="text-6xl font-extrabold tabular-nums">{halal.pct.toFixed(1)}%</div>
          <div className="mt-2 text-sm font-bold text-white/80">
            {halal.halal} / {halal.total} slaughters certified
          </div>
          <div className="mt-4 rounded-xl bg-white/15 backdrop-blur border border-white/20 p-3">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Certification Status</div>
            <div className="mt-1 font-extrabold flex items-center gap-1">
              {halal.pct >= 95 ? (
                <><CheckCircle2 className="h-4 w-4" /> Excellent Compliance</>
              ) : halal.pct >= 80 ? (
                <><Award className="h-4 w-4" /> Good</>
              ) : (
                <><AlertCircle className="h-4 w-4 text-amber-300" /> Needs Attention</>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* KPI GRID */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MiniKpi label="Live Animals" value={totals.liveAnimals} icon={Beef} color="orange" to="/meat/live-animals" />
        <MiniKpi label="Products" value={totals.totalProducts} icon={Package} color="red" to="/meat/products" />
        <MiniKpi label="Active Subscriptions" value={totals.activeSubscriptions} icon={Calendar} color="blue" to="/meat/subscriptions" />
        <MiniKpi label="Qurbani Bookings" value={totals.activeQurbani} icon={Heart} color="fuchsia" to="/meat/qurbani" />
        <MiniKpi label="Wholesale Accounts" value={totals.wholesaleAccounts} icon={Building2} color="violet" to="/meat/wholesale" />
      </section>

      {/* QUICK LINKS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/meat/products" icon={Beef} label="Products" color="red" />
        <QuickLink to="/meat/live-animals" icon={Sparkles} label="Live Animals" color="amber" />
        <QuickLink to="/meat/slaughter" icon={ShieldCheck} label="Slaughter Log" color="emerald" />
        <QuickLink to="/meat/cutting-jobs" icon={Scissors} label="Cutting Jobs" color="rose" />
        <QuickLink to="/meat/weight-orders" icon={Package} label="Orders" color="orange" />
        <QuickLink to="/meat/subscriptions" icon={Calendar} label="Subscriptions" color="blue" />
        <QuickLink to="/meat/qurbani" icon={Heart} label="Qurbani" color="fuchsia" />
        <QuickLink to="/meat/wholesale" icon={Building2} label="Wholesale" color="violet" />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* TOP SELLING */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-600" />
                Top Selling Cuts
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Last 30 days</p>
            </div>
            <Link to="/meat/products" className="text-xs font-extrabold text-red-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {topSelling.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No sales data yet
              </div>
            ) : (
              topSelling.map((item: any, i: number) => (
                <div key={item.productId} className="px-6 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{item.productName}</div>
                    <div className="text-[10px] font-bold text-slate-500">{item._count._all} orders</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums text-sm">{formatPKR(item._sum.total ?? 0)}</div>
                    <div className="text-[10px] font-bold text-slate-500">{(item._sum.actualKg ?? 0).toFixed(1)}kg</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* UPCOMING SUBSCRIPTIONS */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                Upcoming Deliveries
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Next 3 days</p>
            </div>
            <Link to="/meat/subscriptions" className="text-xs font-extrabold text-blue-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {upcomingSubs.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Truck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No scheduled deliveries
              </div>
            ) : (
              upcomingSubs.map((sub: any) => {
                const daysLeft = sub.nextDeliveryDate ? differenceInDays(new Date(sub.nextDeliveryDate), new Date()) : null;
                const isToday = daysLeft === 0;
                return (
                  <Link key={sub.id} to={'/meat/subscriptions/' + sub.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shrink-0">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm">{sub.subscriptionNumber}</span>
                        {isToday && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-pulse">TODAY</span>}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold truncate">{sub.contactPerson || 'Customer'} • {sub.frequency}</div>
                    </div>
                    <div className="text-right shrink-0">
                      {sub.nextDeliveryDate && (
                        <div className="text-xs font-extrabold text-slate-700">
                          {format(new Date(sub.nextDeliveryDate), 'dd MMM')}
                        </div>
                      )}
                      <div className="text-[10px] font-bold text-slate-500">{sub.totalMonthlyKg || 0}kg/mo</div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* BY ANIMAL BREAKDOWN */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Beef className="h-5 w-5 text-red-600" />
          Products by Animal Type
        </h3>
        {byAnimal.length === 0 ? (
          <p className="text-sm text-slate-500 font-semibold text-center py-8">No data yet</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {byAnimal.map((a: any) => (
              <div key={a.animalType} className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-800 dark:to-neutral-800/50 p-4 border-2 border-slate-200 dark:border-neutral-700 text-center">
                <div className="text-4xl mb-2">{ANIMAL_EMOJI[a.animalType] || '🥩'}</div>
                <div className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  {a.animalType.replace('_', ' ')}
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{a._count._all}</div>
                <div className="text-[10px] font-bold text-slate-500">products</div>
                {a._sum.totalRevenue > 0 && (
                  <div className="mt-1 text-xs font-extrabold text-emerald-700 tabular-nums">
                    {formatPKR(a._sum.totalRevenue)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    red: 'from-red-500 to-rose-600',
    amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-cyan-600',
    emerald: 'from-emerald-500 to-green-600',
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
    orange: 'from-orange-500 to-red-600',
    red: 'from-red-500 to-rose-600',
    blue: 'from-blue-500 to-cyan-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
    violet: 'from-violet-500 to-purple-600',
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
    red: 'from-red-500 to-rose-600',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-green-600',
    rose: 'from-rose-500 to-red-600',
    orange: 'from-orange-500 to-red-600',
    blue: 'from-blue-500 to-cyan-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
    violet: 'from-violet-500 to-purple-600',
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
