import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building, Truck, FileText, CreditCard, Package, AlertCircle, TrendingUp,
  Sparkles, RefreshCw, ArrowRight, Users, DollarSign, Clock, MapPin,
  CheckCircle2, Award, Wrench, AlertTriangle, User, Phone,
} from 'lucide-react';
import { hardwareDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { format, differenceInDays } from 'date-fns';

export default function HardwareDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hardware-dashboard'],
    queryFn: () => hardwareDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const totals = overview?.totals ?? { totalBrands: 0, totalProducts: 0, activeProjects: 0, totalCreditAccounts: 0 };
  const pending = overview?.pending ?? { quotations: 0, deliveries: 0, todayDeliveries: 0, overdueAccounts: 0, lowStockCount: 0 };
  const creditSummary = overview?.creditSummary ?? { totalOutstanding: 0, totalPurchases: 0, totalOverdue90Plus: 0 };
  const monthly = overview?.monthlyBusiness ?? { deliveryCount: 0, revenue: 0 };
  const activeProjects = overview?.activeProjects ?? [];
  const upcomingDeliveries = overview?.upcomingDeliveries ?? [];
  const topDebtors = overview?.topDebtors ?? [];
  const byCategory = overview?.byCategory ?? [];
  const topBrands = overview?.topBrands ?? [];

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Hardware Command Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🏗️ Hardware Dashboard
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Cement, steel, sanitary — construction supply chain
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
            <Link to="/hardware/quotations/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <FileText className="h-4 w-4" />
                New Quotation
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ALERTS */}
      {(pending.overdueAccounts > 0 || pending.lowStockCount > 0) && (
        <section className="grid sm:grid-cols-2 gap-3">
          {pending.overdueAccounts > 0 && (
            <Link to="/hardware/credit-accounts?overdue=true" className="rounded-2xl bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/40 dark:to-red-950/40 border-2 border-rose-300 p-4 hover:shadow-lg transition">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg animate-pulse">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="text-xs uppercase font-extrabold text-rose-700">Overdue Accounts</div>
                  <div className="text-2xl font-extrabold text-rose-900 tabular-nums">{pending.overdueAccounts}</div>
                  <div className="text-xs text-rose-700 font-semibold">{formatPKR(creditSummary.totalOverdue90Plus)} at 90+ days</div>
                </div>
                <ArrowRight className="h-5 w-5 text-rose-600" />
              </div>
            </Link>
          )}
          {pending.lowStockCount > 0 && (
            <Link to="/hardware/reorder-rules?needsReorder=true" className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-2 border-amber-300 p-4 hover:shadow-lg transition">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="text-xs uppercase font-extrabold text-amber-700">Low Stock Alert</div>
                  <div className="text-2xl font-extrabold text-amber-900 tabular-nums">{pending.lowStockCount}</div>
                  <div className="text-xs text-amber-700 font-semibold">Products need reorder</div>
                </div>
                <ArrowRight className="h-5 w-5 text-amber-600" />
              </div>
            </Link>
          )}
        </section>
      )}

      {/* KPI GRID */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Projects" value={totals.activeProjects} icon={Building} color="orange" />
        <KpiCard label="Products" value={totals.totalProducts} icon={Package} color="amber" sub={totals.totalBrands + ' brands'} />
        <KpiCard label="Credit Accounts" value={totals.totalCreditAccounts} icon={CreditCard} color="violet" sub={pending.overdueAccounts + ' overdue'} />
        <KpiCard label="Today Deliveries" value={pending.todayDeliveries} icon={Truck} color="emerald" sub={pending.deliveries + ' pending'} />
      </section>

      {/* CREDIT + MONTHLY */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-rose-900 text-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <CreditCard className="h-3.5 w-3.5 text-amber-300" />
                Credit / Khata
              </div>
              <h3 className="mt-2 text-xl font-extrabold">Outstanding Balances</h3>
            </div>
            <Link to="/hardware/credit-accounts" className="text-xs font-extrabold text-amber-300 hover:text-amber-200 inline-flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="text-4xl font-extrabold text-amber-300 tabular-nums">{formatPKR(creditSummary.totalOutstanding)}</div>
          <div className="mt-1 text-xs text-white/60 font-semibold">Total pending across all accounts</div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 p-3">
              <div className="text-[10px] uppercase font-extrabold text-white/70">Total Sales (Credit)</div>
              <div className="text-lg font-extrabold text-cyan-300 tabular-nums">{formatPKR(creditSummary.totalPurchases)}</div>
            </div>
            <div className="rounded-xl bg-rose-500/20 border border-rose-400/40 p-3">
              <div className="text-[10px] uppercase font-extrabold text-rose-300">90+ Days Overdue</div>
              <div className="text-lg font-extrabold text-rose-300 tabular-nums">{formatPKR(creditSummary.totalOverdue90Plus)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-emerald-900 text-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <TrendingUp className="h-3.5 w-3.5 text-amber-300" />
                Last 30 Days
              </div>
              <h3 className="mt-2 text-xl font-extrabold">Delivery Revenue</h3>
            </div>
          </div>

          <div className="text-4xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(monthly.revenue)}</div>
          <div className="mt-1 text-xs text-white/60 font-semibold">{monthly.deliveryCount} deliveries completed</div>

          <div className="mt-4 rounded-xl bg-white/10 p-3">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Avg per delivery</div>
            <div className="text-lg font-extrabold text-cyan-300 tabular-nums">
              {formatPKR(monthly.deliveryCount > 0 ? monthly.revenue / monthly.deliveryCount : 0)}
            </div>
          </div>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/hardware/brands" icon={Award} label="Brands" color="orange" />
        <QuickLink to="/hardware/products" icon={Package} label="Products" color="amber" />
        <QuickLink to="/hardware/projects" icon={Building} label="Projects" color="blue" />
        <QuickLink to="/hardware/quotations" icon={FileText} label="Quotations" color="violet" />
        <QuickLink to="/hardware/deliveries" icon={Truck} label="Deliveries" color="emerald" />
        <QuickLink to="/hardware/credit-accounts" icon={CreditCard} label="Credit Accounts" color="rose" />
        <QuickLink to="/hardware/credit-transactions" icon={DollarSign} label="Ledger" color="cyan" />
        <QuickLink to="/hardware/reorder-rules" icon={AlertTriangle} label="Reorder" color="red" />
      </section>

      {/* PROJECTS + DELIVERIES */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="h-5 w-5 text-orange-600" />
                Active Projects
              </h3>
              <p className="text-xs text-slate-500 font-semibold">In progress construction sites</p>
            </div>
            <Link to="/hardware/projects" className="text-xs font-extrabold text-orange-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {activeProjects.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Building className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No active projects
              </div>
            ) : (
              activeProjects.map((proj: any) => (
                <Link key={proj.id} to={'/hardware/projects/' + proj.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shrink-0">
                    <Building className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{proj.name}</div>
                    <div className="text-xs text-slate-500 font-semibold truncate">
                      <User className="h-3 w-3 inline mr-0.5" />
                      {proj.customerName} • {proj.city || 'No city'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(proj.totalDelivered)}</div>
                    <div className="text-[10px] font-bold text-slate-500">delivered</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-600" />
                Upcoming Deliveries
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Scheduled dispatches</p>
            </div>
            <Link to="/hardware/deliveries" className="text-xs font-extrabold text-emerald-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {upcomingDeliveries.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Truck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No upcoming deliveries
              </div>
            ) : (
              upcomingDeliveries.map((d: any) => {
                const daysLeft = d.scheduledDate ? differenceInDays(new Date(d.scheduledDate), new Date()) : null;
                return (
                  <Link key={d.id} to={'/hardware/deliveries/' + d.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shrink-0">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">{d.deliveryNumber}</span>
                        <span className={
                          'px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ' +
                          (d.status === 'PENDING' ? 'bg-amber-500' : d.status === 'SCHEDULED' ? 'bg-blue-500' : 'bg-slate-500')
                        }>
                          {d.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-semibold truncate">{d.customerName}</div>
                    </div>
                    <div className="text-right shrink-0">
                      {daysLeft !== null && (
                        <div className={
                          'text-xs font-extrabold ' +
                          (daysLeft < 0 ? 'text-rose-700' : daysLeft === 0 ? 'text-amber-700' : 'text-slate-700')
                        }>
                          {daysLeft < 0 ? 'OVERDUE' : daysLeft === 0 ? 'TODAY' : daysLeft + 'd'}
                        </div>
                      )}
                      <div className="text-[10px] font-bold text-emerald-700 tabular-nums">{formatPKR(d.totalCharges)}</div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* TOP DEBTORS + BY CATEGORY */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-600" />
                Top Debtors
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Largest outstanding balances</p>
            </div>
            <Link to="/hardware/credit-accounts" className="text-xs font-extrabold text-rose-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {topDebtors.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">No outstanding balances</div>
            ) : (
              topDebtors.map((d: any, i: number) => (
                <Link key={d.id} to={'/hardware/credit-accounts/' + d.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50">
                  <div className={
                    'h-8 w-8 rounded-lg flex items-center justify-center font-extrabold text-sm text-white shrink-0 ' +
                    (i === 0 ? 'bg-red-600' : i === 1 ? 'bg-orange-600' : i === 2 ? 'bg-amber-500' : 'bg-slate-500')
                  }>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{d.customerName}</div>
                    <div className="text-xs text-slate-500 font-semibold">{d.businessName || 'Individual'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-rose-700 tabular-nums">{formatPKR(d.currentBalance)}</div>
                    {d.ageOver90Days > 0 && (
                      <div className="text-[10px] font-extrabold text-rose-500">90+ days: {formatPKR(d.ageOver90Days)}</div>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-600" />
            Products by Category
          </h3>
          {byCategory.length === 0 ? (
            <p className="text-sm text-slate-500 font-semibold text-center py-8">No products yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {byCategory.slice(0, 12).map((c: any) => (
                <div key={c.categoryType} className="rounded-xl bg-slate-50 dark:bg-neutral-800/50 p-3 flex items-center justify-between">
                  <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300 truncate">
                    {c.categoryType?.replace(/_/g, ' ') || 'Other'}
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{c._count._all}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* TOP BRANDS */}
      {topBrands.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-orange-600" />
              Top Performing Brands
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 p-4">
            {topBrands.map((b: any, i: number) => (
              <div key={b.id} className="rounded-xl bg-slate-50 dark:bg-neutral-800/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-extrabold text-xs shadow">
                    {i + 1}
                  </div>
                  <div className="text-[9px] uppercase font-extrabold text-slate-500">{b.tier}</div>
                </div>
                <div className="font-extrabold text-sm truncate">{b.name}</div>
                <div className="mt-1 text-xs">
                  <div className="text-[9px] uppercase font-extrabold text-slate-500">Revenue</div>
                  <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(b.totalRevenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    orange: 'from-orange-500 to-amber-600',
    amber: 'from-amber-500 to-yellow-600',
    violet: 'from-violet-500 to-purple-600',
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

function QuickLink({ to, icon: Icon, label, color }: any) {
  const colors: Record<string, string> = {
    orange: 'from-orange-500 to-amber-600',
    amber: 'from-amber-500 to-yellow-600',
    blue: 'from-blue-500 to-indigo-600',
    violet: 'from-violet-500 to-purple-600',
    emerald: 'from-emerald-500 to-green-600',
    rose: 'from-rose-500 to-red-600',
    cyan: 'from-cyan-500 to-blue-600',
    red: 'from-red-500 to-rose-600',
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
