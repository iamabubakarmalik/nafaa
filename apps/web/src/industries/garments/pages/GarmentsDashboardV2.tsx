import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Shirt, Scissors, Ruler, Calendar, Sparkles, RefreshCw, TrendingUp,
  TrendingDown, Package, DollarSign, Clock, ArrowRight, Award, Users,
  Star, ShoppingBag, Zap, CreditCard, AlertTriangle, CheckCircle2,
  Palette, BookmarkPlus, Target, Wallet, BarChart3, Activity,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { dashboardApi } from '@modules/dashboard/api/dashboard.api';
import { garmentsDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { SubscriptionBanner } from '@modules/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@core/components/auth/EmailVerifyBanner';
import {
  DashboardHero, HeroKpiCard, QuickStat, PnLCard,
  formatPercent, formatDate, PAYMENT_COLORS,
} from '@modules/dashboard/components/shared/DashboardShared';
import { format, differenceInDays } from 'date-fns';

const SEASON_EMOJI: Record<string, string> = {
  SPRING: '🌸', SUMMER: '☀️', AUTUMN: '🍂', WINTER: '❄️',
  ALL_SEASON: '🌍', EID_COLLECTION: '🌙', WEDDING_COLLECTION: '💒',
  FESTIVE_COLLECTION: '🎉', RAMADAN_COLLECTION: '🕌', SCHOOL_COLLECTION: '🎒',
};

const GENDER_EMOJI: Record<string, string> = {
  MEN: '👨', WOMEN: '👩', BOYS: '👦', GIRLS: '👧',
  UNISEX: '👥', KIDS: '🧒', BABY: '👶',
};

export default function GarmentsDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const { data: gDash } = useQuery({
    queryKey: ['garments-dashboard'],
    queryFn: () => garmentsDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const stats = data?.stats;
  const tenant = data?.tenant;
  const totals = gDash?.totals ?? { totalCollections: 0, activeCollections: 0, totalMeasurements: 0, newArrivals: 0, bestSellers: 0, onSaleCount: 0 };
  const pending = gDash?.pending ?? { tailoring: 0, alterations: 0, reservations: 0, layaway: 0 };
  const tailoringRevenue = gDash?.tailoringRevenue ?? { total: 0, paid: 0, count: 0 };
  const upcomingDeliveries = gDash?.upcomingDeliveries ?? [];
  const upcomingAlterations = gDash?.upcomingAlterations ?? [];
  const bySeason = gDash?.bySeason ?? [];
  const byGender = gDash?.byGender ?? [];

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
        emoji="👗"
        industryLabel="Garments"
        industryBadgeColor="bg-pink-500/30 border border-pink-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="Open Boutique POS"
        posLink="/pos"
      />

      {/* PENDING ALERTS */}
      {(pending.tailoring > 0 || pending.alterations > 0 || pending.reservations > 0 || pending.layaway > 0) && (
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <PendingCard label="Tailoring" value={pending.tailoring} icon={Scissors} to="/garments/tailoring" color="pink" sub="In progress" />
          <PendingCard label="Alterations" value={pending.alterations} icon={Ruler} to="/garments/alterations" color="amber" sub="Waiting" />
          <PendingCard label="Reservations" value={pending.reservations} icon={BookmarkPlus} to="/garments/reservations" color="blue" sub="Active holds" />
          <PendingCard label="Layaway Plans" value={pending.layaway} icon={CreditCard} to="/garments/layaway" color="emerald" sub="Active" />
        </section>
      )}

      {/* KPIs */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard title="Collections" value={totals.activeCollections} subtitle={`${totals.totalCollections} total`} icon={Palette} color="from-fuchsia-500 to-pink-600" isHighlight />
        <HeroKpiCard title="Measurements" value={totals.totalMeasurements} subtitle="Customer profiles" icon={Ruler} color="from-pink-500 to-rose-600" />
        <HeroKpiCard title="New Arrivals" value={totals.newArrivals} subtitle="Fresh stock" icon={Sparkles} color="from-amber-500 to-orange-600" />
        <HeroKpiCard title="Best Sellers" value={totals.bestSellers} subtitle="Top performers" icon={TrendingUp} color="from-emerald-500 to-green-600" trend={growthVsYesterday} />
      </section>

      {/* TAILORING REVENUE */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 to-pink-900 text-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Scissors className="h-3.5 w-3.5 text-amber-300" />
              Tailoring Revenue (30 days)
            </div>
            <h3 className="mt-2 text-2xl font-extrabold">Custom Stitching Business</h3>
          </div>
          <Link to="/garments/tailoring" className="text-xs font-extrabold text-amber-300 hover:text-amber-200 inline-flex items-center gap-1">
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Total Revenue</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums text-emerald-300">{formatPKR(tailoringRevenue.total)}</div>
            <div className="text-xs text-white/60 font-semibold mt-1">{tailoringRevenue.count} delivered</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Amount Collected</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums text-cyan-300">{formatPKR(tailoringRevenue.paid)}</div>
            <div className="text-xs text-white/60 font-semibold mt-1">Cash + digital</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Outstanding</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums text-amber-300">{formatPKR(tailoringRevenue.total - tailoringRevenue.paid)}</div>
            <div className="text-xs text-white/60 font-semibold mt-1">Still to collect</div>
          </div>
        </div>
      </section>

      {/* TREND */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">7-Day Boutique Sales</h3>
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
                  <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="#ec4899" fill="url(#gSales)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#gProfit)" strokeWidth={2} />
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
            <p className="text-sm text-slate-500">Boutique monthly performance</p>
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
          <PnLCard label="Fabric Cost" value={formatPKR(stats?.cogsMonth ?? 0)} sub="COGS" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, staff" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="violet" isHighlight />
        </div>
      </section>

      {/* QUICK ACCESS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/garments/collections" icon={Palette} label="Collections" color="fuchsia" />
        <QuickLink to="/garments/products" icon={Shirt} label="Products" color="pink" />
        <QuickLink to="/garments/measurements" icon={Ruler} label="Measurements" color="rose" />
        <QuickLink to="/garments/tailoring" icon={Scissors} label="Tailoring" color="violet" />
        <QuickLink to="/garments/alterations" icon={Ruler} label="Alterations" color="amber" />
        <QuickLink to="/garments/reservations" icon={BookmarkPlus} label="Reservations" color="blue" />
        <QuickLink to="/garments/layaway" icon={CreditCard} label="Layaway" color="emerald" />
        <QuickLink to="/garments/size-charts" icon={Package} label="Size Charts" color="cyan" />
      </section>

      {/* UPCOMING */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Scissors className="h-5 w-5 text-pink-600" /> Upcoming Tailoring Deliveries</h3>
              <p className="text-xs text-slate-500 font-semibold">Next 7 days</p>
            </div>
            <Link to="/garments/tailoring" className="text-xs font-extrabold text-pink-600 inline-flex items-center gap-1">All <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {upcomingDeliveries.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold"><CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />No pending deliveries</div>
            ) : (
              upcomingDeliveries.map((o: any) => {
                const daysLeft = o.promisedDate ? differenceInDays(new Date(o.promisedDate), new Date()) : null;
                return (
                  <Link key={o.id} to={`/garments/tailoring/${o.id}`} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white flex items-center justify-center shrink-0"><Scissors className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900">{o.orderNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ${o.priority === 'URGENT' ? 'bg-red-600 animate-pulse' : o.priority === 'HIGH' ? 'bg-amber-500' : 'bg-slate-500'}`}>{o.priority}</span>
                      </div>
                      <div className="text-xs text-slate-500 font-semibold">{o.customerName || 'Walk-in'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      {daysLeft !== null && <div className={`text-xs font-extrabold ${daysLeft <= 0 ? 'text-rose-700' : daysLeft <= 2 ? 'text-amber-700' : 'text-slate-700'}`}>{daysLeft <= 0 ? 'OVERDUE' : daysLeft + ' days'}</div>}
                      <div className="text-[10px] font-bold text-slate-500">{formatPKR(o.total)}</div>
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
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Ruler className="h-5 w-5 text-amber-600" /> Upcoming Alterations</h3>
              <p className="text-xs text-slate-500 font-semibold">Ready pickup coming up</p>
            </div>
            <Link to="/garments/alterations" className="text-xs font-extrabold text-amber-600 inline-flex items-center gap-1">All <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {upcomingAlterations.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold"><CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />No pending alterations</div>
            ) : (
              upcomingAlterations.map((a: any) => {
                const daysLeft = a.promisedDate ? differenceInDays(new Date(a.promisedDate), new Date()) : null;
                return (
                  <Link key={a.id} to={`/garments/alterations/${a.id}`} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0"><Ruler className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm text-slate-900">{a.ticketNumber}</div>
                      <div className="text-xs text-slate-500 font-semibold truncate">{a.garmentDescription}</div>
                    </div>
                    <div className="text-right shrink-0">
                      {daysLeft !== null && <div className={`text-xs font-extrabold ${daysLeft <= 0 ? 'text-rose-700' : daysLeft <= 2 ? 'text-amber-700' : 'text-slate-700'}`}>{daysLeft <= 0 ? 'OVERDUE' : daysLeft + ' days'}</div>}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* BY SEASON + GENDER */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Calendar className="h-5 w-5 text-fuchsia-600" /> Products by Season</h3>
          {bySeason.length === 0 ? (
            <p className="text-sm text-slate-500 font-semibold text-center py-8">No data yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {bySeason.map((s: any) => (
                <div key={s.season} className="rounded-xl bg-slate-50 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-2xl">{SEASON_EMOJI[s.season] || '👗'}</div>
                    <div className="text-xs font-extrabold text-slate-700 mt-1">{s.season.replace('_', ' ')}</div>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{s._count._all}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-pink-600" /> Products by Gender</h3>
          {byGender.length === 0 ? (
            <p className="text-sm text-slate-500 font-semibold text-center py-8">No data yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {byGender.map((g: any) => (
                <div key={g.gender ?? 'unknown'} className="rounded-xl bg-slate-50 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-2xl">{GENDER_EMOJI[g.gender] || '👤'}</div>
                    <div className="text-xs font-extrabold text-slate-700 mt-1">{g.gender || 'Unknown'}</div>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{g._count._all}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* QUICK STATS */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Products" value={stats?.totalProducts ?? 0} icon={Shirt} tone="pink" link="/garments/products" />
        <QuickStat title="Collections" value={totals.totalCollections} icon={Palette} tone="fuchsia" link="/garments/collections" />
        <QuickStat title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} tone="blue" link="/customers" />
        <QuickStat title="Low Stock" value={stats?.lowStockCount ?? 0} icon={AlertTriangle} tone="amber" link="/low-stock" alert />
        <QuickStat title="On Sale" value={totals.onSaleCount} icon={Zap} tone="rose" link="/garments/products" />
        <QuickStat title="Layaway" value={pending.layaway} icon={CreditCard} tone="emerald" link="/garments/layaway" />
      </section>
    </div>
  );
}

function PendingCard({ label, value, sub, icon: Icon, to, color }: any) {
  const colors: Record<string, string> = {
    pink: 'from-pink-500 to-rose-600', amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-cyan-600', emerald: 'from-emerald-500 to-green-600',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white border-2 border-slate-200 p-4 hover:shadow-lg hover:-translate-y-0.5 transition">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
          <div className="text-xs text-slate-500 font-semibold">{sub}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow group-hover:scale-110 transition-transform`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

function QuickLink({ to, icon: Icon, label, color }: any) {
  const colors: Record<string, string> = {
    fuchsia: 'from-fuchsia-500 to-pink-600', pink: 'from-pink-500 to-rose-600',
    rose: 'from-rose-500 to-red-600', violet: 'from-violet-500 to-purple-600',
    amber: 'from-amber-500 to-orange-600', blue: 'from-blue-500 to-cyan-600',
    emerald: 'from-emerald-500 to-green-600', cyan: 'from-cyan-500 to-blue-600',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white border-2 border-slate-200 p-4 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition">
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-2`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs font-extrabold text-slate-900">{label}</div>
    </Link>
  );
}
