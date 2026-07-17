import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Wheat, Sparkles, RefreshCw, TrendingUp, DollarSign, Package, Users,
  Tractor, ArrowRight, Award, Calendar, AlertCircle, CheckCircle2,
  Sprout, Building2, Clock, FileText, Landmark, Droplet, Leaf,
} from 'lucide-react';
import { agriDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';

const CATEGORY_EMOJI: Record<string, string> = {
  SEEDS: '🌾', FERTILIZER: '🌱', PESTICIDE: '💊', HERBICIDE: '🌿',
  FUNGICIDE: '🍄', INSECTICIDE: '🐛', ANIMAL_FEED: '🐄', POULTRY_FEED: '🐔',
  CATTLE_FEED: '🐮', FISH_FEED: '🐟', VETERINARY_MEDICINE: '💉',
  FARM_TOOLS: '🔧', IRRIGATION: '💧', MACHINERY_PART: '⚙️',
  ORGANIC_INPUT: '🌿', OTHER: '📦',
};

export default function AgriDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['agri-dashboard'],
    queryFn: () => agriDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const farmers = overview?.farmers ?? { total: 0, active: 0, overdue: 0 };
  const products = overview?.products ?? { total: 0, seasonal: 0, restricted: 0, expiringCerts: 0 };
  const operations = overview?.operations ?? { todayOrders: 0, pendingOrders: 0, deliveringOrders: 0 };
  const revenue = overview?.revenue ?? { today: 0, monthly: 0, collected: 0 };
  const credit = overview?.credit ?? { totalLimit: 0, totalUsed: 0, totalOutstanding: 0 };
  const subsidies = overview?.subsidies ?? { pending: 0, disbursed: 0 };
  const topSelling = overview?.topSelling ?? [];
  const topFarmers = overview?.topFarmers ?? [];
  const byCategory = overview?.byCategory ?? [];
  const recentAdvisories = overview?.recentAdvisories ?? [];

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-green-900 to-emerald-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-green-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Agri Command Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🌾 Agri Dashboard
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Farmers, seeds, fertilizers, subsidies — sab track
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
            <Link to="/agri/bulk-orders/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Package className="h-4 w-4" />
                New Order
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ALERTS */}
      {(products.expiringCerts > 0 || farmers.overdue > 0 || subsidies.pending > 0) && (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.expiringCerts > 0 && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs uppercase font-extrabold text-amber-700">Expiring Certificates</div>
                <div className="text-lg font-extrabold text-amber-900">{products.expiringCerts} products</div>
              </div>
              <Link to="/agri/products?filter=expiring" className="text-xs font-extrabold text-amber-700 hover:underline">
                View →
              </Link>
            </div>
          )}
          {farmers.overdue > 0 && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow">
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs uppercase font-extrabold text-rose-700">Farmers with Outstanding</div>
                <div className="text-lg font-extrabold text-rose-900">{farmers.overdue} farmers</div>
              </div>
              <Link to="/agri/farmers?filter=overdue" className="text-xs font-extrabold text-rose-700 hover:underline">
                View →
              </Link>
            </div>
          )}
          {subsidies.pending > 0 && (
            <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-300 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow">
                <Landmark className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs uppercase font-extrabold text-blue-700">Pending Subsidy Claims</div>
                <div className="text-lg font-extrabold text-blue-900">{subsidies.pending} claims</div>
              </div>
              <Link to="/agri/subsidy" className="text-xs font-extrabold text-blue-700 hover:underline">
                View →
              </Link>
            </div>
          )}
        </section>
      )}

      {/* TODAY KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Farmers" value={farmers.total} icon={Users} color="emerald" sub={farmers.active + ' active'} />
        <KpiCard label="Today's Orders" value={operations.todayOrders} icon={Package} color="green" />
        <KpiCard label="In Transit" value={operations.deliveringOrders} icon={Tractor} color="amber" />
        <KpiCard label="Today Revenue" value={formatPKR(revenue.today)} icon={DollarSign} color="teal" />
      </section>

      {/* MONTHLY REVENUE + CREDIT */}
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl bg-gradient-to-br from-slate-950 to-green-900 text-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <TrendingUp className="h-3.5 w-3.5 text-amber-300" />
                Last 30 Days
              </div>
              <h3 className="mt-2 text-2xl font-extrabold">Monthly Business</h3>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
              <div className="text-[10px] uppercase font-extrabold text-white/70">Revenue</div>
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

        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 shadow-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20 mb-3">
            <DollarSign className="h-3.5 w-3.5 text-amber-300" />
            Farmer Credit
          </div>
          <div className="text-6xl font-extrabold tabular-nums">{formatPKR(credit.totalOutstanding).replace('Rs', '').trim()}</div>
          <div className="mt-1 text-sm font-bold text-white/80">Outstanding Rs</div>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-white/70">Credit Limit</span><span className="font-bold tabular-nums">{formatPKR(credit.totalLimit)}</span></div>
            <div className="flex justify-between"><span className="text-white/70">Currently Used</span><span className="font-bold tabular-nums">{formatPKR(credit.totalUsed)}</span></div>
          </div>
        </div>
      </section>

      {/* MINI KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MiniKpi label="Products" value={products.total} icon={Package} color="green" to="/agri/products" />
        <MiniKpi label="Seasonal" value={products.seasonal} icon={Sprout} color="emerald" to="/agri/products?seasonal=true" />
        <MiniKpi label="Restricted" value={products.restricted} icon={AlertCircle} color="rose" to="/agri/products?restricted=true" />
        <MiniKpi label="Subsidies" value={subsidies.disbursed} icon={Landmark} color="blue" to="/agri/subsidy" />
        <MiniKpi label="Pending Orders" value={operations.pendingOrders} icon={Clock} color="amber" to="/agri/bulk-orders?status=CONFIRMED" />
      </section>

      {/* QUICK LINKS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/agri/products" icon={Wheat} label="Products" color="green" />
        <QuickLink to="/agri/farmers" icon={Users} label="Farmers" color="emerald" />
        <QuickLink to="/agri/bulk-orders" icon={Package} label="Bulk Orders" color="teal" />
        <QuickLink to="/agri/ledger" icon={FileText} label="Ledger" color="amber" />
        <QuickLink to="/agri/advisory" icon={Leaf} label="Crop Advisory" color="lime" />
        <QuickLink to="/agri/seasonal-plans" icon={Calendar} label="Seasonal Plans" color="cyan" />
        <QuickLink to="/agri/subsidy" icon={Landmark} label="Subsidies" color="blue" />
        <QuickLink to="/agri/reports" icon={TrendingUp} label="Reports" color="violet" />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* TOP SELLING */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Top Selling Products
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Last 30 days</p>
            </div>
            <Link to="/agri/products" className="text-xs font-extrabold text-green-600 inline-flex items-center gap-1">
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
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{item.productName}</div>
                    <div className="text-[10px] font-bold text-slate-500">{item._count._all} orders • {(item._sum.quantity ?? 0).toFixed(0)} units</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums text-sm">{formatPKR(item._sum.total ?? 0)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* TOP FARMERS */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                Top Farmers
              </h3>
              <p className="text-xs text-slate-500 font-semibold">By total purchases</p>
            </div>
            <Link to="/agri/farmers" className="text-xs font-extrabold text-amber-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {topFarmers.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No farmers yet
              </div>
            ) : (
              topFarmers.map((f: any, i: number) => (
                <Link key={f.id} to={'/agri/farmers/' + f.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0">
                    {i + 1}
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center font-extrabold shrink-0">
                    {f.fullName?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{f.fullName}</div>
                    <div className="text-[10px] font-bold text-slate-500">{f.village || f.district || 'Unknown'} • {f.totalOrders} orders</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums text-sm">{formatPKR(f.totalPurchases)}</div>
                    {f.totalOutstanding > 0 && (
                      <div className="text-[10px] font-extrabold text-amber-700">Due: {formatPKR(f.totalOutstanding)}</div>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RECENT ADVISORIES */}
      {recentAdvisories.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Leaf className="h-5 w-5 text-lime-600" />
              Pending Crop Advisories
            </h3>
            <Link to="/agri/advisory" className="text-xs font-extrabold text-lime-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {recentAdvisories.map((adv: any) => (
              <Link key={adv.id} to={'/agri/advisory/' + adv.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-lime-500 to-green-600 text-white flex items-center justify-center shrink-0">
                  <Leaf className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm">{adv.advisoryNumber} • {adv.cropName}</div>
                  <div className="text-[10px] font-bold text-slate-500 truncate">{adv.currentIssues || 'General consultation'}</div>
                </div>
                {adv.followUpDate && (
                  <div className="text-right shrink-0 text-[10px] font-extrabold text-slate-600">
                    Follow-up: {format(new Date(adv.followUpDate), 'dd MMM')}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* BY CATEGORY */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Sprout className="h-5 w-5 text-green-600" />
          Products by Category
        </h3>
        {byCategory.length === 0 ? (
          <p className="text-sm text-slate-500 font-semibold text-center py-8">No data yet</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {byCategory.map((c: any) => (
              <div key={c.category} className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-800 dark:to-neutral-800/50 p-4 border-2 border-slate-200 dark:border-neutral-700 text-center">
                <div className="text-4xl mb-2">{CATEGORY_EMOJI[c.category] || '📦'}</div>
                <div className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  {c.category.replace(/_/g, ' ')}
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{c._count._all}</div>
                <div className="text-[10px] font-bold text-slate-500">products</div>
                {c._sum.totalRevenue > 0 && (
                  <div className="mt-1 text-xs font-extrabold text-emerald-700 tabular-nums">
                    {formatPKR(c._sum.totalRevenue)}
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
    emerald: 'from-emerald-500 to-green-600',
    green: 'from-green-500 to-lime-600',
    amber: 'from-amber-500 to-orange-600',
    teal: 'from-teal-500 to-cyan-600',
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
    green: 'from-green-500 to-emerald-600',
    emerald: 'from-emerald-500 to-teal-600',
    rose: 'from-rose-500 to-red-600',
    blue: 'from-blue-500 to-cyan-600',
    amber: 'from-amber-500 to-orange-600',
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
    green: 'from-green-500 to-emerald-600',
    emerald: 'from-emerald-500 to-teal-600',
    teal: 'from-teal-500 to-cyan-600',
    amber: 'from-amber-500 to-orange-600',
    lime: 'from-lime-500 to-green-600',
    cyan: 'from-cyan-500 to-blue-600',
    blue: 'from-blue-500 to-indigo-600',
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
