import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Gem, Coins, TrendingUp, TrendingDown, Scale, Users, Palette, Repeat,
  Wallet, Target, Sparkles, Package, Award, ArrowRight, Plus, RefreshCw,
  Clock, DollarSign, Activity, AlertTriangle, ShieldCheck, Diamond,
  ChevronRight, Star, Crown, Hash,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@modules/dashboard/api/dashboard.api';
import { metalRatesApi } from '../api/metal-rates.api';
import { jewelryProductsApi } from '../api/products.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import {
  DashboardHero, HeroKpiCard, QuickStat, PnLCard,
  formatPercent, formatDate, PAYMENT_COLORS,
} from '@modules/dashboard/components/shared/DashboardShared';

const METAL_ICONS: Record<string, string> = {
  GOLD: '🥇', SILVER: '🥈', PLATINUM: '💠',
  ROSE_GOLD: '🌹', WHITE_GOLD: '⚪', PALLADIUM: '⬜',
};

const METAL_COLORS: Record<string, string> = {
  GOLD: '#d97706', SILVER: '#94a3b8', PLATINUM: '#06b6d4',
  ROSE_GOLD: '#f43f5e', WHITE_GOLD: '#cbd5e1', PALLADIUM: '#64748b',
};

export default function JewelryDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
  });

  const { data: rates = [] } = useQuery({
    queryKey: ['metal-rates-current'],
    queryFn: () => metalRatesApi.current(),
    refetchInterval: 30_000,
  });

  const { data: jewelryProducts = [] } = useQuery({
    queryKey: ['jewelry-products-dash'],
    queryFn: () => jewelryProductsApi.list({}),
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

  // Jewelry-specific stats
  const totalItems = (jewelryProducts as any[]).length;
  const hallmarkedItems = (jewelryProducts as any[]).filter((p: any) => p.hallmarkNumber).length;
  const bridalItems = (jewelryProducts as any[]).filter((p: any) => p.isBridalCollection).length;
  const totalWeight = (jewelryProducts as any[]).reduce((s: number, p: any) => s + Number(p.netWeight || 0), 0);

  // Metal type breakdown
  const metalBreakdown: Record<string, number> = {};
  (jewelryProducts as any[]).forEach((p: any) => {
    metalBreakdown[p.metalType] = (metalBreakdown[p.metalType] || 0) + 1;
  });
  const metalStats = Object.entries(metalBreakdown).map(([metal, count]) => ({ metal, count, color: METAL_COLORS[metal] || '#64748b' }));

  return (
    <div className="space-y-6">
      <DashboardHero
        gradient="from-slate-950 via-amber-900 to-yellow-700"
        emoji="💎"
        industryLabel="Jewelry"
        industryBadgeColor="bg-amber-500/30 border border-amber-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="Open Jewelry POS"
        posLink="/pos"
      />

      {/* ═══ LIVE METAL RATES TICKER ═══ */}
      {rates.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-300 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-600 to-yellow-700 text-white flex items-center justify-center shadow">
                <Coins className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-amber-900 text-sm">🪙 Live Metal Rates (per gram)</h3>
                <p className="text-[10px] text-amber-700">Auto-refresh every 30 seconds</p>
              </div>
            </div>
            <Link to="/jewelry/metal-rates">
              <Button size="sm" variant="secondary">
                <TrendingUp className="h-3.5 w-3.5" /> Update
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {(rates as any[]).map((r: any) => (
              <div key={r.id} className="rounded-xl bg-white border-2 border-amber-200 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-lg">{METAL_ICONS[r.metalType] || '💎'}</span>
                  <span className="text-[10px] font-extrabold text-slate-700 uppercase">
                    {r.metalType.replace('_', ' ')} {r.purity.replace('KARAT_', '').replace('SILVER_', 'S').replace('PLATINUM_', 'Pt-')}K
                  </span>
                </div>
                <div className="text-lg font-extrabold text-amber-700 tabular-nums">Rs {r.ratePerGram.toLocaleString()}</div>
                <div className="text-[9px] text-slate-500 font-bold">
                  {new Date(r.updatedAt || r.effectiveFrom).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ JEWELRY KPIs ═══ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Total Jewelry Items"
          value={totalItems}
          subtitle={`${totalWeight.toFixed(0)}g total weight`}
          icon={Gem}
          color="from-amber-500 to-yellow-600"
          isHighlight
        />
        <HeroKpiCard
          title="Hallmark Certified"
          value={hallmarkedItems}
          subtitle={`${totalItems > 0 ? ((hallmarkedItems / totalItems) * 100).toFixed(0) : 0}% verified`}
          icon={ShieldCheck}
          color="from-emerald-500 to-teal-600"
        />
        <HeroKpiCard
          title="Bridal Collection"
          value={bridalItems}
          subtitle="Wedding jewelry"
          icon={Crown}
          color="from-rose-500 to-pink-600"
        />
        <HeroKpiCard
          title="Aaj ka Profit"
          value={formatPKR(stats?.netProfitToday ?? 0)}
          subtitle={`${stats?.ordersToday ?? 0} sales • AOV ${formatPKR(stats?.aovToday ?? 0)}`}
          icon={Target}
          color="from-violet-500 to-purple-600"
          trend={growthVsYesterday}
        />
      </section>

      {/* ═══ JEWELRY OPERATIONS ═══ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link to="/jewelry/karigars" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-blue-100 group-hover:bg-blue-600 group-hover:text-white text-blue-700 flex items-center justify-center transition">
            <Users className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Karigars</div>
            <div className="text-[10px] text-slate-500 font-semibold">Craftsman tracking</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/jewelry/custom-orders" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-rose-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-rose-100 group-hover:bg-rose-600 group-hover:text-white text-rose-700 flex items-center justify-center transition">
            <Palette className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Custom Orders</div>
            <div className="text-[10px] text-slate-500 font-semibold">Bespoke workflow</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/jewelry/exchanges" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-violet-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-violet-100 group-hover:bg-violet-600 group-hover:text-white text-violet-700 flex items-center justify-center transition">
            <Repeat className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Exchanges</div>
            <div className="text-[10px] text-slate-500 font-semibold">Old gold exchange</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/jewelry/metal-stock" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-emerald-100 group-hover:bg-emerald-600 group-hover:text-white text-emerald-700 flex items-center justify-center transition">
            <Package className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Metal Stock</div>
            <div className="text-[10px] text-slate-500 font-semibold">Raw material</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
      </section>

      {/* ═══ METAL TYPE DISTRIBUTION ═══ */}
      {metalStats.length > 0 && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Inventory by Metal Type</h3>
              <p className="text-xs text-slate-500">Item count breakdown</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {metalStats.map((m) => (
              <div key={m.metal} className="rounded-xl bg-white border-2 p-3" style={{ borderColor: m.color + '60' }}>
                <div className="text-2xl mb-1">{METAL_ICONS[m.metal]}</div>
                <div className="text-[10px] uppercase font-extrabold text-slate-600">{m.metal.replace('_', ' ')}</div>
                <div className="text-2xl font-extrabold tabular-nums" style={{ color: m.color }}>{m.count}</div>
                <div className="text-[10px] font-bold text-slate-500">items</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ TRENDS ═══ */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">7-Day Jewelry Sales</h3>
              <p className="text-sm text-slate-500">Revenue & profit</p>
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
                    <linearGradient id="jSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d97706" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="jProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#d97706" fill="url(#jSales)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#jProfit)" strokeWidth={2} />
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
              <h3 className="text-lg font-bold text-slate-900">Peak Hours</h3>
              <p className="text-sm text-slate-500">When customers buy</p>
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
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="sales" fill="#d97706" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">No sales today</div>
          )}
        </div>
      </section>

      {/* ═══ P&L ═══ */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — Is Mahina</h3>
            <p className="text-sm text-slate-500">Jewelry shop monthly performance</p>
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
          <PnLCard label="Metal Cost" value={formatPKR(stats?.cogsMonth ?? 0)} sub="Raw material" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, karigars, utilities" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="amber" isHighlight />
        </div>
      </section>

      {/* ═══ QUICK STATS ═══ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Jewelry Items" value={totalItems} icon={Gem} tone="amber" link="/jewelry/products" />
        <QuickStat title="Hallmark" value={hallmarkedItems} icon={ShieldCheck} tone="emerald" link="/jewelry/products" />
        <QuickStat title="Bridal" value={bridalItems} icon={Crown} tone="pink" link="/jewelry/products" />
        <QuickStat title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} tone="blue" link="/customers" />
        <QuickStat title="Metal Rates" value={rates.length} icon={Coins} tone="orange" link="/jewelry/metal-rates" />
        <QuickStat title="Custom Orders" value={0} icon={Palette} tone="violet" link="/jewelry/custom-orders" />
      </section>

      {/* ═══ TOP JEWELRY + PAYMENTS ═══ */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Top Selling Jewelry</h3>
              <p className="text-sm text-slate-500">Best designs this month</p>
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
                      <div className="h-10 w-10 rounded-xl bg-amber-100 overflow-hidden flex items-center justify-center shrink-0">
                        {p.product?.images?.[0]?.url ? (
                          <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Gem className="h-4 w-4 text-amber-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate text-sm">{p.product?.name}</div>
                        <div className="text-xs text-slate-500">{p.quantitySold} pieces • {p.orderCount} orders</div>
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
              <p className="text-sm text-slate-500">Cash vs Card vs Bank</p>
            </div>
          </div>
          {data?.paymentBreakdown?.length ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.paymentBreakdown}
                    cx="50%" cy="45%" outerRadius={80} innerRadius={40} dataKey="total"
                    label={(entry: any) => {
                      const sum = data.paymentBreakdown.reduce((s, p) => s + p.total, 0);
                      const pct = sum > 0 ? ((entry.total / sum) * 100).toFixed(0) : '0';
                      return `${pct}%`;
                    }}
                    labelLine={false}
                  >
                    {data.paymentBreakdown.map((p) => (
                      <Cell key={p.method} fill={PAYMENT_COLORS[p.method] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
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
