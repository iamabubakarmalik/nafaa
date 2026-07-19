import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Wheat, Sprout, Leaf, Tractor, Package,
  TrendingUp, TrendingDown, Target, Sparkles,
  Award, ArrowRight, Clock, Users, AlertTriangle,
  DollarSign, Activity, Beef, Bug, FlaskConical,
  Landmark, Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@/api/dashboard.api';
import { agriProductsApi } from '../api/products.api';
import { farmersApi } from '../api/farmers.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { SubscriptionBanner } from '@/features/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@/components/auth/EmailVerifyBanner';
import {
  DashboardHero, HeroKpiCard, QuickStat, PnLCard,
  formatPercent, formatDate, PAYMENT_COLORS,
} from '@/features/dashboard/components/shared/DashboardShared';

const CATEGORY_COLORS: Record<string, string> = {
  SEEDS: '#22c55e', FERTILIZER: '#3b82f6', PESTICIDE: '#ef4444',
  HERBICIDE: '#84cc16', FUNGICIDE: '#f59e0b', INSECTICIDE: '#ec4899',
  ANIMAL_FEED: '#8b5cf6', POULTRY_FEED: '#f97316', CATTLE_FEED: '#ec4899',
  FISH_FEED: '#06b6d4', VETERINARY_MEDICINE: '#14b8a6', FARM_TOOLS: '#64748b',
  IRRIGATION: '#0ea5e9', ORGANIC_INPUT: '#10b981', OTHER: '#94a3b8',
};

export default function AgriDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
  });

  const { data: agriProfiles = [] } = useQuery({
    queryKey: ['agri-products-dashboard'],
    queryFn: () => agriProductsApi.list({}),
  });

  const { data: farmers = [] } = useQuery({
    queryKey: ['farmers-dashboard'],
    queryFn: () => farmersApi.list({}),
  });

  const stats = data?.stats;
  const tenant = data?.tenant;

  const trendData = (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { ...p, label: dayName };
  });

  const growthVsYesterday = stats?.salesGrowthVsYesterday ?? 0;
  const growthVsLastMonth = stats?.salesGrowthVsLastMonth ?? 0;

  // Agri-specific stats
  const agriStats = useMemo(() => {
    const totalProducts = agriProfiles.length;
    const seeds = agriProfiles.filter((p: any) => p.category === 'SEEDS').length;
    const fertilizers = agriProfiles.filter((p: any) => p.category === 'FERTILIZER').length;
    const pesticides = agriProfiles.filter((p: any) => ['PESTICIDE', 'HERBICIDE', 'FUNGICIDE', 'INSECTICIDE'].includes(p.category)).length;
    const feeds = agriProfiles.filter((p: any) => p.category?.includes('FEED')).length;
    const organic = agriProfiles.filter((p: any) => p.isOrganic).length;
    const restricted = agriProfiles.filter((p: any) => p.isRestricted).length;
    return { totalProducts, seeds, fertilizers, pesticides, feeds, organic, restricted };
  }, [agriProfiles]);

  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    agriProfiles.forEach((p: any) => {
      const cat = p.category || 'OTHER';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([cat, count]) => ({ category: cat.replace(/_/g, ' '), count, color: CATEGORY_COLORS[cat] || '#64748b' }))
      .sort((a, b) => b.count - a.count);
  }, [agriProfiles]);

  const farmerStats = useMemo(() => {
    const total = farmers.length;
    const withPhone = farmers.filter((f: any) => f.phone).length;
    const withCnic = farmers.filter((f: any) => f.cnic).length;
    return { total, withPhone, withCnic };
  }, [farmers]);

  // Current season
  const currentMonth = new Date().getMonth();
  const currentSeason = currentMonth >= 3 && currentMonth <= 8 ? 'Kharif' : 'Rabi';

  return (
    <div className="space-y-6">
      <SubscriptionBanner />
      <EmailVerifyBanner />

      <DashboardHero
        gradient="from-slate-950 via-lime-900 to-green-800"
        emoji="🌾"
        industryLabel="Agri"
        industryBadgeColor="bg-lime-500/30 border border-lime-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="Open Agri POS"
        posLink="/pos"
      />

      {/* CURRENT SEASON BADGE */}
      <section className="rounded-3xl bg-gradient-to-br from-lime-50 via-green-50 to-emerald-50 border-2 border-lime-200 p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-lime-600 text-white flex items-center justify-center shadow-lg shadow-lime-500/30">
              {currentSeason === 'Kharif' ? <Sprout className="h-7 w-7" /> : <Wheat className="h-7 w-7" />}
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-lime-700">Current Season</div>
              <h3 className="text-2xl font-extrabold text-lime-900">
                {currentSeason === 'Kharif' ? '🌧️ Kharif Season' : '❄️ Rabi Season'}
              </h3>
              <p className="text-xs text-lime-800 font-semibold">
                {currentSeason === 'Kharif' ? 'April - September (Cotton, Rice, Sugarcane)' : 'October - March (Wheat, Mustard, Gram)'}
              </p>
            </div>
          </div>
          <Link to="/agri/seasonal-plans">
            <Button className="bg-lime-600 hover:bg-lime-700">
              <Calendar className="h-4 w-4" /> Seasonal Plans
            </Button>
          </Link>
        </div>
      </section>

      {/* AGRI KPIs */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Registered Farmers"
          value={farmerStats.total}
          subtitle={`${farmerStats.withPhone} with phone`}
          icon={Tractor}
          color="from-lime-500 to-green-600"
          isHighlight
        />
        <HeroKpiCard
          title="Agri Products"
          value={agriStats.totalProducts}
          subtitle={`${agriStats.organic} organic • ${agriStats.restricted} restricted`}
          icon={Wheat}
          color="from-green-500 to-emerald-600"
        />
        <HeroKpiCard
          title="Aaj ka Profit"
          value={formatPKR(stats?.netProfitToday ?? 0)}
          subtitle={`${stats?.ordersToday ?? 0} orders`}
          icon={Target}
          color="from-emerald-500 to-teal-600"
          trend={growthVsYesterday}
        />
        <HeroKpiCard
          title="Low Stock Items"
          value={stats?.lowStockCount ?? 0}
          subtitle={`${stats?.outOfStockCount ?? 0} out of stock`}
          icon={AlertTriangle}
          color="from-amber-500 to-orange-600"
        />
      </section>

      {/* CATEGORY BREAKDOWN */}
      <section className="rounded-3xl bg-gradient-to-br from-lime-50 via-green-50 to-emerald-50 border-2 border-lime-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-lime-600 text-white flex items-center justify-center shadow-lg shadow-lime-500/30">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-lime-900">Agri Product Categories</h3>
              <p className="text-xs text-lime-700">Inventory by category</p>
            </div>
          </div>
          <Link to="/products">
            <Button variant="secondary" size="sm">
              <Package className="h-3.5 w-3.5" /> Manage
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white border-2 border-green-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Sprout className="h-4 w-4 text-green-600" />
              <div className="text-[10px] uppercase font-extrabold text-green-700">Seeds</div>
            </div>
            <div className="text-2xl font-extrabold text-green-900">{agriStats.seeds}</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-blue-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="h-4 w-4 text-blue-600" />
              <div className="text-[10px] uppercase font-extrabold text-blue-700">Fertilizer</div>
            </div>
            <div className="text-2xl font-extrabold text-blue-900">{agriStats.fertilizers}</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-rose-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Bug className="h-4 w-4 text-rose-600" />
              <div className="text-[10px] uppercase font-extrabold text-rose-700">Pesticides</div>
            </div>
            <div className="text-2xl font-extrabold text-rose-900">{agriStats.pesticides}</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-violet-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Beef className="h-4 w-4 text-violet-600" />
              <div className="text-[10px] uppercase font-extrabold text-violet-700">Feeds</div>
            </div>
            <div className="text-2xl font-extrabold text-violet-900">{agriStats.feeds}</div>
          </div>
        </div>
      </section>

      {/* TRENDS + CATEGORY PIE */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">7-Day Agri Sales</h3>
              <p className="text-sm text-slate-500">Revenue & profit</p>
            </div>
            <Link to="/reports" className="text-lime-700 text-sm font-bold inline-flex items-center gap-1">
              Reports <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {trendData.length >= 2 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="aSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#65a30d" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#65a30d" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="aProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#65a30d" fill="url(#aSales)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#aProfit)" strokeWidth={2} />
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
              <h3 className="text-lg font-bold text-slate-900">Category Split</h3>
              <p className="text-sm text-slate-500">By product count</p>
            </div>
          </div>
          {categoryBreakdown.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%" cy="45%" outerRadius={80} innerRadius={40} dataKey="count"
                    labelLine={false}
                    label={(entry: any) => {
                      const total = categoryBreakdown.reduce((s, c) => s + c.count, 0);
                      return total > 0 ? `${((entry.count / total) * 100).toFixed(0)}%` : '0%';
                    }}
                  >
                    {categoryBreakdown.map((c) => (<Cell key={c.category} fill={c.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 9 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">No products yet</div>
          )}
        </div>
      </section>

      {/* P&L */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — Is Mahina</h3>
            <p className="text-sm text-slate-500">Agri business monthly</p>
          </div>
          {growthVsLastMonth !== 0 && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold ${
              growthVsLastMonth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {growthVsLastMonth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {formatPercent(growthVsLastMonth)}
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <PnLCard label="Revenue" value={formatPKR(stats?.salesMonth ?? 0)} sub={`${stats?.ordersMonth ?? 0} sales`} color="emerald" />
          <PnLCard label="Purchase Cost" value={formatPKR(stats?.cogsMonth ?? 0)} sub="Product cost" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, transport, labor" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="emerald" isHighlight />
        </div>
      </section>

      {/* QUICK ACCESS */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Products" value={agriStats.totalProducts} icon={Wheat} tone="emerald" link="/products" />
        <QuickStat title="Farmers" value={farmerStats.total} icon={Tractor} tone="cyan" link="/agri/farmers" />
        <QuickStat title="Bulk Orders" value={0} icon={Package} tone="violet" link="/agri/bulk-orders" />
        <QuickStat title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} tone="pink" link="/customers" />
        <QuickStat title="Subsidies" value={0} icon={Landmark} tone="amber" link="/agri/subsidy" />
        <QuickStat title="Advisory" value={0} icon={Leaf} tone="emerald" link="/agri/advisory" />
      </section>

      {/* TOP PRODUCTS */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Top Selling Agri Products</h3>
              <p className="text-sm text-slate-500">Best sellers this month</p>
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
                        {idx + 1}
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-lime-100 overflow-hidden flex items-center justify-center shrink-0">
                        {p.product?.images?.[0]?.url ? (
                          <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Wheat className="h-4 w-4 text-lime-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate text-sm">{p.product?.name}</div>
                        <div className="text-xs text-slate-500">{p.quantitySold.toFixed(0)} {p.product?.unit} • {p.orderCount} orders</div>
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
              <p className="text-sm text-slate-500">This month split</p>
            </div>
          </div>
          {data?.paymentBreakdown?.length ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.paymentBreakdown}
                    cx="50%" cy="45%" outerRadius={80} innerRadius={40} dataKey="total"
                    labelLine={false}
                    label={(entry: any) => {
                      const sum = data.paymentBreakdown.reduce((s, p) => s + p.total, 0);
                      return sum > 0 ? `${((entry.total / sum) * 100).toFixed(0)}%` : '0%';
                    }}
                  >
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
