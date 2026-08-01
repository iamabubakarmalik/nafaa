import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Dumbbell, TrendingUp, DollarSign, Package, Users, Wrench,
  Trophy, RefreshCw, ArrowRight, AlertTriangle, Plus,
  ShoppingCart, BarChart3, Star, Award, Activity,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { sportsDashboardApi } from '../api/dashboard.api';
import { teamOrdersApi } from '../api/team-orders.api';
import { repairServicesApi } from '../api/repair-services.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

export default function SportsDashboardPage() {
  const hideCost = useCostHidden();

  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sports-dashboard-overview'],
    queryFn: () => sportsDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const { data: teamSummary } = useQuery({
    queryKey: ['sports-team-orders-summary'],
    queryFn: () => teamOrdersApi.summary(),
    refetchInterval: 5 * 60_000,
  });

  const { data: repairSummary } = useQuery({
    queryKey: ['sports-repair-summary'],
    queryFn: () => repairServicesApi.summary(),
    refetchInterval: 5 * 60_000,
  });

  const totals = overview?.totals ?? { totalBrands: 0, totalProducts: 0, teamOrderableCount: 0, activeTeamOrders: 0, pendingRepairs: 0, overdueRepairs: 0 };
  const today = overview?.today ?? { totalRevenue: 0, teamOrdersCount: 0, repairsCount: 0 };
  const monthly = overview?.monthly ?? { totalRevenue: 0, teamOrdersRevenue: 0, repairsRevenue: 0 };
  const topProducts = overview?.topProducts ?? [];
  const topBrands = overview?.topBrands ?? [];
  const upcomingDeliveries = overview?.upcomingTeamDeliveries ?? [];
  const activeRepairs = overview?.activeRepairs ?? [];
  const bySport = overview?.bySport ?? [];

  const revenueSplit = [
    { name: 'Team Orders', value: monthly.teamOrdersRevenue || 0 },
    { name: 'Repairs', value: monthly.repairsRevenue || 0 },
  ].filter((x) => x.value > 0);

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-3xl bg-slate-100 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-teal-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Dumbbell className="h-3.5 w-3.5 text-amber-300" /> Sports Shop
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🏏 Sports Dashboard</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Team orders, repair services, cricket & gym equipment — all in one screen
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <PrivacyToggle />
            <Link to="/pos">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <ShoppingCart className="h-4 w-4" /> Open POS
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <HeroTile icon={DollarSign} label="Today Revenue" value={formatPKR(today.totalRevenue)} sub={`${today.teamOrdersCount + today.repairsCount} orders`} tone="emerald" />
          <HeroTile icon={Users} label="Active Team Orders" value={totals.activeTeamOrders} sub={`${teamSummary?.counts?.confirmed || 0} confirmed`} tone="blue" />
          <HeroTile icon={Wrench} label="Pending Repairs" value={totals.pendingRepairs} sub={`${totals.overdueRepairs} overdue`} tone={totals.overdueRepairs > 0 ? 'rose' : 'amber'} />
          <HeroTile icon={Package} label="Products" value={totals.totalProducts} sub={`${totals.totalBrands} brands`} tone="violet" />
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        <QuickAction to="/pos" icon={ShoppingCart} label="POS" tone="emerald" />
        <QuickAction to="/sports-products/new" icon={Plus} label="Add Product" tone="blue" />
        <QuickAction to="/sports/team-orders/new" icon={Users} label="Team Order" tone="violet" />
        <QuickAction to="/sports/team-orders" icon={Trophy} label="Orders" tone="amber" />
        <QuickAction to="/sports/repair-services" icon={Wrench} label="Repairs" tone="rose" />
        <QuickAction to="/sports/brands" icon={Award} label="Brands" tone="pink" />
      </section>

      {/* ALERTS */}
      {(totals.overdueRepairs > 0 || (teamSummary?.counts?.ready ?? 0) > 0) && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-2 border-amber-300 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-900">Needs attention</h3>
              <p className="text-xs text-amber-800 font-bold">Act on these now</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {totals.overdueRepairs > 0 && (
              <AlertCard to="/sports/repair-services" icon={Wrench}
                title={`${totals.overdueRepairs} Overdue Repairs`} desc="Follow up with customers" tone="rose" />
            )}
            {(teamSummary?.counts?.ready ?? 0) > 0 && (
              <AlertCard to="/sports/team-orders?status=READY" icon={Users}
                title={`${teamSummary.counts.ready} Team Orders Ready`} desc="Coordinate delivery" tone="amber" />
            )}
          </div>
        </section>
      )}

      {/* CHARTS */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Products by Sport</h3>
              <p className="text-xs text-slate-500 font-bold">Inventory breakdown</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          {bySport.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySport.map((s: any) => ({ sport: s.sport || 'Other', count: s._count._all }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="sport" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Bar dataKey="count" name="Products" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex flex-col items-center justify-center gap-2">
              <BarChart3 className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">No data yet</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Monthly Revenue Mix</h3>
              <p className="text-xs text-slate-500 font-bold">Total {formatPKR(monthly.totalRevenue)}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          {revenueSplit.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueSplit} cx="50%" cy="45%" outerRadius={90} innerRadius={50}
                    dataKey="value" nameKey="name"
                    label={(e: any) => {
                      const t = revenueSplit.reduce((s, x) => s + x.value, 0);
                      return t > 0 ? `${((e.value / t) * 100).toFixed(0)}%` : '';
                    }}
                    labelLine={false}>
                    {revenueSplit.map((_, i) => (
                      <Cell key={i} fill={['#10b981', '#f59e0b'][i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex flex-col items-center justify-center gap-2">
              <TrendingUp className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">No revenue yet</p>
            </div>
          )}
        </div>
      </section>

      {/* UPCOMING DELIVERIES + ACTIVE REPAIRS */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-blue-50 to-cyan-50 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center shadow-md">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">Upcoming Team Deliveries</h3>
                <p className="text-xs text-slate-500 font-bold">Next 14 days</p>
              </div>
            </div>
            <Link to="/sports/team-orders" className="text-xs font-extrabold text-blue-700 hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {upcomingDeliveries.length === 0 ? (
              <div className="p-10 text-center">
                <Users className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <div className="font-extrabold text-slate-700">No upcoming deliveries</div>
              </div>
            ) : upcomingDeliveries.map((o: any) => (
              <Link key={o.id} to={`/sports/team-orders/${o.id}/edit`} className="px-5 py-3 flex items-center gap-3 hover:bg-blue-50/40 transition">
                <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900">{o.teamName}</div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {o.orderNumber} • {o.totalQuantity} items • {o.status.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-blue-700 text-sm tabular-nums">{formatPKR(o.totalAmount)}</div>
                  <div className="text-[10px] font-bold text-slate-500">
                    {new Date(o.expectedDeliveryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">Active Repairs</h3>
                <p className="text-xs text-slate-500 font-bold">{totals.pendingRepairs} in progress</p>
              </div>
            </div>
            <Link to="/sports/repair-services" className="text-xs font-extrabold text-amber-700 hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {activeRepairs.length === 0 ? (
              <div className="p-10 text-center">
                <Wrench className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <div className="font-extrabold text-slate-700">No active repairs</div>
              </div>
            ) : activeRepairs.map((r: any) => (
              <Link key={r.id} to="/sports/repair-services" className="px-5 py-3 flex items-center gap-3 hover:bg-amber-50/40 transition">
                <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Wrench className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900">{r.customerName}</div>
                  <div className="text-[10px] text-slate-500 font-bold truncate">
                    {r.serviceNumber} • {r.itemType} • {r.status}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-amber-700 text-sm tabular-nums">{formatPKR(r.estimatedCost)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TOP PRODUCTS + BRANDS */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">🏆 Top Sellers</h3>
              <p className="text-xs text-slate-500 font-bold">By units sold</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {topProducts.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">No sales recorded yet</div>
            ) : topProducts.slice(0, 8).map((p: any, i: number) => (
              <Link key={p.id ?? i} to={p.productId ? `/sports-products/${p.productId}` : '/sports-products'}
                className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition group">
                <div className={`h-8 w-8 rounded-lg text-white flex items-center justify-center font-extrabold text-xs shrink-0 ${
                  i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-slate-300'
                }`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900 group-hover:text-emerald-700">
                    {p.product?.name || p.categoryType || 'Product'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">{p.totalSold ?? 0} sold</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-emerald-700 text-sm tabular-nums">{formatPKR(p.totalRevenue || 0)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">🎖️ Top Brands</h3>
              <p className="text-xs text-slate-500 font-bold">By revenue</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {topBrands.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">
                <p>No brands yet</p>
                <Link to="/sports/brands" className="mt-2 inline-block text-violet-600 font-extrabold hover:underline">Add brands →</Link>
              </div>
            ) : topBrands.map((b: any, i: number) => (
              <Link key={b.id} to="/sports/brands" className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                <div className={`h-9 w-9 rounded-lg text-white flex items-center justify-center font-extrabold text-xs shrink-0 ${
                  i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-violet-500'
                }`}>{i + 1}</div>
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-white p-1 border border-slate-200 shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-extrabold text-sm shrink-0">
                    {b.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900">{b.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {b.authorizedDealer && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">AUTHORIZED</span>
                    )}
                    <span className="text-[10px] text-slate-500 font-bold">{b.brandTier}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-violet-700 text-sm tabular-nums">{formatPKR(b.totalRevenue || 0)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroTile({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
    rose: 'from-rose-400/40 to-rose-600/25 border-rose-300/50',
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3 sm:p-4`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-lg sm:text-xl font-extrabold text-white tabular-nums leading-none truncate">{value}</div>
      <div className="text-[10px] font-bold text-white/70 mt-0.5 truncate">{sub}</div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-700',
    blue: 'from-blue-500 to-cyan-700',
    violet: 'from-violet-500 to-purple-700',
    amber: 'from-amber-500 to-orange-700',
    rose: 'from-rose-500 to-red-700',
    pink: 'from-pink-500 to-rose-700',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-300 hover:shadow-lg hover:-translate-y-0.5 transition-all p-3 sm:p-4 text-center">
      <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md mx-auto mb-2 group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="text-xs sm:text-sm font-extrabold text-slate-900">{label}</div>
    </Link>
  );
}

function AlertCard({ to, icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 to-red-700|bg-rose-50 border-rose-200',
    amber: 'from-amber-500 to-orange-700|bg-amber-50 border-amber-200',
  };
  const [grad, box] = tones[tone].split('|');
  return (
    <Link to={to} className={`rounded-2xl bg-white border-2 ${box} p-4 flex items-center gap-3 hover:shadow-md transition group`}>
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${grad} text-white flex items-center justify-center shadow-md shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-slate-900 text-sm">{title}</div>
        <div className="text-xs text-slate-600 font-bold truncate">{desc}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 group-hover:translate-x-1 transition" />
    </Link>
  );
}
