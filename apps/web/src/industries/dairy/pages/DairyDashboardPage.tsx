import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Milk, Truck, Users, Route as RouteIcon, DollarSign, TrendingUp, RefreshCw,
  Sparkles, ArrowRight, User, Sunrise, Sunset, Package, Wallet,
  AlertCircle, CheckCircle2, Beaker, FileText, Award,
} from 'lucide-react';
import { dairyDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

export default function DairyDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dairy-dashboard'],
    queryFn: () => dairyDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const totals = overview?.totals ?? { totalCustomers: 0, activeCustomers: 0, totalFarmers: 0, activeRoutes: 0 };
  const today = overview?.today ?? {};
  const monthly = overview?.monthly ?? {};
  const financials = overview?.financials ?? {};
  const topCustomers = overview?.topCustomers ?? [];
  const topFarmers = overview?.topFarmers ?? [];
  const topDebtors = overview?.topDebtors ?? [];

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Milk Business
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🥛 Dairy Dashboard</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Daily deliveries, farmers, routes — sab yahaan
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/dairy/deliveries">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Truck className="h-4 w-4" />
                Today's Deliveries
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* TOTALS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Customers" value={totals.totalCustomers} sub={totals.activeCustomers + ' active'} icon={Users} color="blue" />
        <KpiCard label="Farmers" value={totals.totalFarmers} sub="Suppliers" icon={User} color="emerald" />
        <KpiCard label="Active Routes" value={totals.activeRoutes} sub="Delivery routes" icon={RouteIcon} color="violet" />
        <KpiCard label="Outstanding" value={formatPKR(financials.customerOutstanding || 0)} sub={financials.customerCount + ' customers'} icon={Wallet} color="amber" />
      </section>

      {/* TODAY OPS */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 to-blue-900 text-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Truck className="h-3.5 w-3.5 text-amber-300" />
              Today's Operations
            </div>
            <h3 className="mt-2 text-2xl font-extrabold">Daily Business Snapshot</h3>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 flex items-center gap-1"><Sunrise className="h-3 w-3" />Delivered Today</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums">{today.deliveredCount || 0}</div>
            <div className="text-xs text-white/60 font-semibold">of {today.scheduledDeliveries || 0} scheduled</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Milk Delivered</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-cyan-300">{(today.deliveredLiters || 0).toFixed(1)}L</div>
            <div className="text-xs text-white/60 font-semibold">To customers</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Revenue Today</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-300">{formatPKR(today.deliveredRevenue || 0)}</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Received from Farmers</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-amber-300">{(today.suppliedLiters || 0).toFixed(1)}L</div>
            <div className="text-xs text-white/60 font-semibold">{formatPKR(today.suppliedAmount || 0)} payable</div>
          </div>
        </div>
      </section>

      {/* MONTHLY */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-bold">Monthly Business (30d)</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs uppercase font-extrabold text-slate-500">Deliveries</div>
              <div className="text-2xl font-extrabold tabular-nums">{monthly.deliveries || 0}</div>
            </div>
            <div>
              <div className="text-xs uppercase font-extrabold text-cyan-700">Milk (L)</div>
              <div className="text-2xl font-extrabold tabular-nums text-cyan-700">{(monthly.liters || 0).toFixed(0)}</div>
            </div>
            <div>
              <div className="text-xs uppercase font-extrabold text-emerald-700">Revenue</div>
              <div className="text-xl font-extrabold tabular-nums text-emerald-700">{formatPKR(monthly.revenue || 0)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-rose-900 to-red-900 text-white p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-amber-300" />
            <h3 className="text-lg font-bold">Financial Alerts</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Customer Outstanding</span>
              <span className="text-xl font-extrabold tabular-nums text-amber-300">{formatPKR(financials.customerOutstanding || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Farmer Payable</span>
              <span className="text-xl font-extrabold tabular-nums text-rose-300">{formatPKR(financials.farmerPayable || 0)}</span>
            </div>
          </div>
          <Link to="/dairy/customers?outstanding=true">
            <Button className="mt-3 w-full bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20">
              View Debtors <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/dairy/customers" icon={Users} label="Customers" color="blue" />
        <QuickLink to="/dairy/farmers" icon={User} label="Farmers" color="emerald" />
        <QuickLink to="/dairy/routes" icon={RouteIcon} label="Routes" color="violet" />
        <QuickLink to="/dairy/deliveries" icon={Truck} label="Deliveries" color="cyan" />
        <QuickLink to="/dairy/farmer-supplies" icon={Package} label="Supplies" color="amber" />
        <QuickLink to="/dairy/monthly-bills" icon={FileText} label="Bills" color="pink" />
        <QuickLink to="/dairy/quality-tests" icon={Beaker} label="Quality" color="rose" />
        <QuickLink to="/dairy/products" icon={Milk} label="Products" color="fuchsia" />
      </section>

      {/* TOP LISTS */}
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
            <h3 className="text-lg font-bold flex items-center gap-2"><Award className="h-5 w-5 text-amber-600" />Top Customers</h3>
            <p className="text-xs text-slate-500 font-semibold">30 days consumption</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {topCustomers.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 font-semibold">No data yet</div>
            ) : (
              topCustomers.map((tc: any, i: number) => (
                <Link key={i} to={'/dairy/customers/' + tc.customer?.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                  <div className={
                    'h-8 w-8 rounded-lg text-white flex items-center justify-center font-extrabold text-sm shrink-0 ' +
                    (i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-slate-500')
                  }>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{tc.customer?.name}</div>
                    <div className="text-xs text-slate-500 font-bold tabular-nums">{tc.liters.toFixed(1)}L</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold text-emerald-700 tabular-nums">{formatPKR(tc.revenue)}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
            <h3 className="text-lg font-bold flex items-center gap-2"><User className="h-5 w-5 text-emerald-600" />Top Farmers</h3>
            <p className="text-xs text-slate-500 font-semibold">30 days supply</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {topFarmers.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 font-semibold">No data yet</div>
            ) : (
              topFarmers.map((tf: any, i: number) => (
                <Link key={i} to={'/dairy/farmers/' + tf.farmer?.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                  <div className={
                    'h-8 w-8 rounded-lg text-white flex items-center justify-center font-extrabold text-sm shrink-0 ' +
                    (i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-cyan-500' : i === 2 ? 'bg-blue-500' : 'bg-slate-500')
                  }>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{tf.farmer?.name}</div>
                    <div className="text-xs text-slate-500 font-bold tabular-nums">{tf.liters.toFixed(1)}L</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold text-amber-700 tabular-nums">{formatPKR(tf.amount)}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
            <h3 className="text-lg font-bold flex items-center gap-2"><AlertCircle className="h-5 w-5 text-rose-600" />Top Debtors</h3>
            <p className="text-xs text-slate-500 font-semibold">Highest outstanding</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {topDebtors.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 font-semibold">No debts</div>
            ) : (
              topDebtors.map((d: any, i: number) => (
                <Link key={d.id} to={'/dairy/customers/' + d.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                  <div className="h-8 w-8 rounded-lg bg-rose-500 text-white flex items-center justify-center font-extrabold text-sm shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{d.name}</div>
                    {d.phone && <div className="text-xs text-slate-500 font-bold">{d.phone}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-rose-700 tabular-nums">{formatPKR(d.currentBalance)}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-600',
    emerald: 'from-emerald-500 to-green-600',
    violet: 'from-violet-500 to-purple-600',
    amber: 'from-amber-500 to-orange-600',
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

function QuickLink({ to, icon: Icon, label, color }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-600',
    emerald: 'from-emerald-500 to-green-600',
    violet: 'from-violet-500 to-purple-600',
    cyan: 'from-cyan-500 to-blue-600',
    amber: 'from-amber-500 to-orange-600',
    pink: 'from-pink-500 to-rose-600',
    rose: 'from-rose-500 to-red-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
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
