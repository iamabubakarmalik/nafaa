import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BookOpen, Pencil, Palette, Users, Building2, School,
  TrendingUp, Target, Award, Sparkles, Package, ArrowRight,
  Clock, DollarSign, Star, AlertTriangle, Activity, GraduationCap,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@/api/dashboard.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { SubscriptionBanner } from '@/features/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@/components/auth/EmailVerifyBanner';
import {
  DashboardHero, HeroKpiCard, QuickStat, PnLCard,
  formatPercent, formatDate, PAYMENT_COLORS,
} from '@/features/dashboard/components/shared/DashboardShared';

export default function BookstoreDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
  });

  const stats = data?.stats;
  const tenant = data?.tenant;

  const trendData = (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { ...p, label: dayName };
  });

  const hourlyData = (data?.hourlySalesToday ?? [])
    .filter((h) => h.sales > 0 || (h.hour >= 8 && h.hour <= 22))
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

      <DashboardHero
        gradient="from-slate-950 via-amber-900 to-orange-700"
        emoji="📚"
        industryLabel="Bookstore"
        industryBadgeColor="bg-amber-500/30 border border-amber-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="Open Bookstore POS"
        posLink="/pos"
      />

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard title="Aaj ki Sales" value={formatPKR(stats?.salesToday ?? 0)} subtitle={`${stats?.ordersToday ?? 0} orders`} icon={TrendingUp} color="from-amber-500 to-orange-600" isHighlight trend={growthVsYesterday} />
        <HeroKpiCard title="Aaj ka Profit" value={formatPKR(stats?.netProfitToday ?? 0)} subtitle="Bottom line" icon={Target} color="from-emerald-500 to-green-600" />
        <HeroKpiCard title="Total Books" value={stats?.totalProducts ?? 0} subtitle="In catalog" icon={BookOpen} color="from-blue-500 to-indigo-600" />
        <HeroKpiCard title="Low Stock" value={stats?.lowStockCount ?? 0} subtitle={`${stats?.outOfStockCount ?? 0} out of stock`} icon={AlertTriangle} color="from-rose-500 to-red-600" />
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-amber-900">Bookstore Operations</h3>
              <p className="text-xs text-amber-700">Books, stationery, art supplies, authors</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/bookstore/books">
              <Button variant="secondary" size="sm">
                <BookOpen className="h-3.5 w-3.5" /> Books
              </Button>
            </Link>
            <Link to="/bookstore/authors">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                <Users className="h-3.5 w-3.5" /> Authors
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link to="/bookstore/books" className="rounded-2xl bg-white border-2 border-amber-200 hover:border-amber-400 p-3 transition">
            <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-1">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="text-[10px] uppercase font-extrabold text-amber-700">Books</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">Catalog</div>
          </Link>
          <Link to="/bookstore/stationery" className="rounded-2xl bg-white border-2 border-blue-200 hover:border-blue-400 p-3 transition">
            <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-1">
              <Pencil className="h-4 w-4" />
            </div>
            <div className="text-[10px] uppercase font-extrabold text-blue-700">Stationery</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">Manage</div>
          </Link>
          <Link to="/bookstore/art-supplies" className="rounded-2xl bg-white border-2 border-pink-200 hover:border-pink-400 p-3 transition">
            <div className="h-8 w-8 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center mb-1">
              <Palette className="h-4 w-4" />
            </div>
            <div className="text-[10px] uppercase font-extrabold text-pink-700">Art Supplies</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">Colors</div>
          </Link>
          <Link to="/bookstore/schools" className="rounded-2xl bg-white border-2 border-emerald-200 hover:border-emerald-400 p-3 transition">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
              <School className="h-4 w-4" />
            </div>
            <div className="text-[10px] uppercase font-extrabold text-emerald-700">Schools</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">Book Lists</div>
          </Link>
        </div>
      </section>

      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">7-Day Bookstore Sales</h3>
              <p className="text-sm text-slate-500">Revenue & profit trend</p>
            </div>
            <Link to="/reports" className="text-amber-700 text-sm font-bold inline-flex items-center gap-1">
              Reports <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {trendData.length >= 2 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="bkSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d97706" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="bkProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#d97706" fill="url(#bkSales)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#bkProfit)" strokeWidth={2} />
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
              <p className="text-sm text-slate-500">Rush time</p>
            </div>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          {hourlyData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={9} interval={1} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="sales" fill="#d97706" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">No sales today</div>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — Is Mahina</h3>
            <p className="text-sm text-slate-500">Bookstore monthly performance</p>
          </div>
          {growthVsLastMonth !== 0 && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold ${
              growthVsLastMonth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {formatPercent(growthVsLastMonth)}
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <PnLCard label="Revenue" value={formatPKR(stats?.salesMonth ?? 0)} sub={`${stats?.ordersMonth ?? 0} sales`} color="emerald" />
          <PnLCard label="Book Cost" value={formatPKR(stats?.cogsMonth ?? 0)} sub="Purchase cost" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, staff" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="orange" isHighlight />
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Products" value={stats?.totalProducts ?? 0} icon={Package} tone="amber" link="/products" />
        <QuickStat title="Books" value={stats?.totalProducts ?? 0} icon={BookOpen} tone="orange" link="/bookstore/books" />
        <QuickStat title="Authors" value={0} icon={Users} tone="violet" link="/bookstore/authors" />
        <QuickStat title="Publishers" value={0} icon={Building2} tone="blue" link="/bookstore/publishers" />
        <QuickStat title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} tone="pink" link="/customers" />
        <QuickStat title="Low Stock" value={stats?.lowStockCount ?? 0} icon={AlertTriangle} tone="amber" link="/low-stock" alert />
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">🏆 Best Selling Books</h3>
              <p className="text-sm text-slate-500">This month</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.topProducts?.length ? (
              data.topProducts.slice(0, 5).map((p, idx) => {
                const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
                return (
                  <div key={p.productId} className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0`}>{idx + 1}</div>
                      <div className="h-10 w-10 rounded-xl bg-amber-100 overflow-hidden flex items-center justify-center shrink-0">
                        {p.product?.images?.[0]?.url ? (
                          <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-amber-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate text-sm">{p.product?.name}</div>
                        <div className="text-xs text-slate-500">{p.quantitySold} sold • {p.orderCount} orders</div>
                      </div>
                    </div>
                    <div className="font-extrabold text-emerald-700 text-sm">{formatPKR(p.revenue)}</div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center text-sm text-slate-500">No sales yet</div>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Payment Methods</h3>
              <p className="text-sm text-slate-500">This month</p>
            </div>
          </div>
          {data?.paymentBreakdown?.length ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.paymentBreakdown} cx="50%" cy="45%" outerRadius={80} innerRadius={40} dataKey="total" labelLine={false}
                    label={(entry: any) => {
                      const sum = data.paymentBreakdown.reduce((s, p) => s + p.total, 0);
                      return sum > 0 ? `${((entry.total / sum) * 100).toFixed(0)}%` : '0%';
                    }}>
                    {data.paymentBreakdown.map((p) => (<Cell key={p.method} fill={PAYMENT_COLORS[p.method] || '#64748b'} />))}
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
