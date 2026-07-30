import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, TrendingUp, TrendingDown, Package, AlertTriangle,
  Wallet, Users, ShoppingCart, Star, Crown, Target, Activity,
  Sparkles, ChevronRight, DollarSign, Zap, Trophy,
  Award, Store, Warehouse, BarChart3, ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { shopsApi, type ShopWithOverview } from '@modules/organization/shops/api/shops.api';
import { useAuthStore } from '@core/stores/auth.store';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16'];

type SortKey = 'sales' | 'profit' | 'orders' | 'name';

export default function ShopsOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN';
  const [sortBy, setSortBy] = useState<SortKey>('sales');

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ['shops-overview'],
    queryFn: shopsApi.overview,
    enabled: isOwner,
    refetchInterval: 60_000,
  });

  const sortedShops = useMemo(() => {
    const list = [...shops];
    switch (sortBy) {
      case 'sales':
        return list.sort((a, b) => b.todaySales - a.todaySales);
      case 'profit':
        return list.sort((a, b) => b.todayProfit - a.todayProfit);
      case 'orders':
        return list.sort((a, b) => b.todayOrders - a.todayOrders);
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return list;
    }
  }, [shops, sortBy]);

  const totals = useMemo(() => {
    return shops.reduce(
      (acc, s) => ({
        todaySales: acc.todaySales + s.todaySales,
        todayProfit: acc.todayProfit + s.todayProfit,
        todayOrders: acc.todayOrders + s.todayOrders,
        monthSales: acc.monthSales + s.monthSales,
        monthProfit: acc.monthProfit + s.monthProfit,
        lowStockCount: acc.lowStockCount + s.lowStockCount,
        totalStock: acc.totalStock + s.totalStock,
        registersOpen: acc.registersOpen + (s.registerOpen ? 1 : 0),
        totalUsers: acc.totalUsers + (s._count?.users ?? 0),
      }),
      {
        todaySales: 0, todayProfit: 0, todayOrders: 0,
        monthSales: 0, monthProfit: 0,
        lowStockCount: 0, totalStock: 0,
        registersOpen: 0, totalUsers: 0,
      },
    );
  }, [shops]);

  const bestShop = useMemo(() => {
    return shops.reduce<ShopWithOverview | null>(
      (best, s) => (!best || s.todaySales > best.todaySales ? s : best),
      null,
    );
  }, [shops]);

  const chartData = useMemo(() =>
    sortedShops.slice(0, 8).map((s) => ({
      name: s.name.length > 12 ? s.name.slice(0, 12) + '...' : s.name,
      Sales: s.todaySales,
      Profit: s.todayProfit,
      Orders: s.todayOrders,
    })),
    [sortedShops]);

  const pieData = useMemo(() =>
    sortedShops
      .filter((s) => s.todaySales > 0)
      .slice(0, 6)
      .map((s) => ({ name: s.name, value: s.todaySales })),
    [sortedShops]);

  if (!isOwner) {
    return (
      <div className="rounded-3xl bg-amber-50 border-2 border-amber-300 p-12 text-center">
        <AlertTriangle className="h-14 w-14 text-amber-600 mx-auto mb-4" />
        <h2 className="text-2xl font-extrabold text-amber-900">Owner Only</h2>
        <p className="text-amber-700 mt-2">Sirf Owner multi-shop overview dekh sakta hai.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-purple-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Multi-Shop Command Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              All Shops Overview
            </h1>
            <p className="mt-2 text-white/80 text-sm">
              Real-time comparison across all {shops.length} branches
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/shops">
              <Button variant="secondary" className="bg-white/15 backdrop-blur text-white hover:bg-white/25 border-white/20">
                <Building2 className="h-4 w-4" /> Manage Shops
              </Button>
            </Link>
            <Link to="/transfers">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <ArrowRight className="h-4 w-4" /> Transfers
              </Button>
            </Link>
          </div>
        </div>

        {/* Aggregate KPIs */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <KpiTile label="Total Sales" value={formatPKR(totals.todaySales)} sub={`${totals.todayOrders} orders today`} icon={TrendingUp} />
          <KpiTile label="Total Profit" value={formatPKR(totals.todayProfit)} sub={`${((totals.todayProfit / (totals.todaySales || 1)) * 100).toFixed(1)}% margin`} icon={Target} />
          <KpiTile label="Active Registers" value={String(totals.registersOpen)} sub={`of ${shops.length} shops`} icon={Wallet} />
          <KpiTile label="Low Stock Items" value={String(totals.lowStockCount)} sub="need attention" icon={AlertTriangle} />
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-3xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : shops.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900">No shops yet</h3>
          <p className="text-sm text-slate-500 mt-2">Add your first shop to see overview here</p>
          <Link to="/shops">
            <Button className="mt-4">
              <Building2 className="h-4 w-4" /> Add Shop
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Best performer highlight */}
          {bestShop && bestShop.todaySales > 0 && (
            <section className="rounded-3xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-300 p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/40">
                  <Trophy className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Today's Top Performer</div>
                  <h3 className="text-xl font-extrabold text-amber-900">{bestShop.name}</h3>
                  <p className="text-sm text-amber-800 mt-0.5">
                    <strong>{formatPKR(bestShop.todaySales)}</strong> in sales •{' '}
                    <strong>{bestShop.todayOrders}</strong> orders • Profit <strong>{formatPKR(bestShop.todayProfit)}</strong>
                  </p>
                </div>
                {bestShop.isMain && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-600 text-white text-xs font-extrabold">
                    <Crown className="h-3 w-3" /> MAIN
                  </span>
                )}
              </div>
            </section>
          )}

          {/* Charts */}
          <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Sales Comparison — Today</h3>
                  <p className="text-sm text-slate-500">Top {chartData.length} shops</p>
                </div>
                <BarChart3 className="h-5 w-5 text-indigo-500" />
              </div>
              {chartData.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" height={60} />
                      <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: any) => formatPKR(Number(value))}
                        contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Sales" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Profit" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">
                  No sales data yet today
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Sales Share</h3>
                  <p className="text-sm text-slate-500">By shop today</p>
                </div>
                <Zap className="h-5 w-5 text-amber-500" />
              </div>
              {pieData.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="45%"
                        outerRadius={80}
                        innerRadius={40}
                        dataKey="value"
                        label={(entry: any) => {
                          const total = pieData.reduce((s, p) => s + p.value, 0);
                          const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
                          return `${pct}%`;
                        }}
                        labelLine={false}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                      <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">
                  No sales yet today
                </div>
              )}
            </div>
          </section>

          {/* Sort controls */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-extrabold text-slate-600 uppercase mr-2">Sort by:</span>
            {(['sales', 'profit', 'orders', 'name'] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setSortBy(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  sortBy === k
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>

          {/* Shop cards */}
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedShops.map((shop, idx) => (
              <ShopComparisonCard
                key={shop.id}
                shop={shop}
                rank={idx + 1}
                totalSales={totals.todaySales}
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function KpiTile({ label, value, sub, icon: Icon }: any) {
  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-xl font-extrabold leading-none tabular-nums">{value}</div>
      <div className="text-[10px] font-bold opacity-75 mt-0.5">{sub}</div>
    </div>
  );
}

function ShopComparisonCard({
  shop, rank, totalSales,
}: {
  shop: ShopWithOverview;
  rank: number;
  totalSales: number;
}) {
  const sharePct = totalSales > 0 ? (shop.todaySales / totalSales) * 100 : 0;
  const profitMargin = shop.todaySales > 0 ? (shop.todayProfit / shop.todaySales) * 100 : 0;
  const isTop3 = rank <= 3;
  const rankColors = ['from-amber-500 to-orange-600', 'from-slate-400 to-slate-600', 'from-orange-600 to-red-700'];

  const shopIcon = shop.type === 'WAREHOUSE'
    ? Warehouse
    : shop.type === 'GODOWN'
    ? Package
    : Store;
  const ShopIcon = shopIcon;

  return (
    <div className={`rounded-3xl bg-white border-2 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all relative overflow-hidden ${
      shop.isMain ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50' : 'border-slate-200'
    }`}>
      {shop.isMain && (
        <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[9px] font-extrabold rounded-bl-2xl inline-flex items-center gap-1 shadow">
          <Crown className="h-3 w-3 fill-white" /> MAIN
        </div>
      )}

      {isTop3 && shop.todaySales > 0 && (
        <div className={`absolute top-3 left-3 h-8 w-8 rounded-xl bg-gradient-to-br ${rankColors[rank - 1]} text-white font-extrabold flex items-center justify-center shadow-lg z-10`}>
          {rank === 1 ? <Crown className="h-4 w-4" /> : rank}
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className={`h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow-lg shrink-0 ${
          shop.isMain
            ? 'bg-gradient-to-br from-amber-500 to-orange-600'
            : shop.type === 'WAREHOUSE'
            ? 'bg-gradient-to-br from-amber-500 to-amber-700'
            : shop.type === 'GODOWN'
            ? 'bg-gradient-to-br from-violet-500 to-violet-700'
            : 'bg-gradient-to-br from-indigo-500 to-indigo-700'
        }`}>
          <ShopIcon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-slate-900 truncate">{shop.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-600 uppercase">{shop.type}</span>
            {shop.registerOpen && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">
                <span className="h-1 w-1 rounded-full bg-emerald-600 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Today's stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatMini label="Sales" value={formatPKR(shop.todaySales)} color="emerald" />
        <StatMini label="Profit" value={formatPKR(shop.todayProfit)} sub={`${profitMargin.toFixed(0)}%`} color="violet" />
        <StatMini label="Orders" value={String(shop.todayOrders)} color="blue" />
      </div>

      {/* Share bar */}
      {shop.todaySales > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
            <span>Share of Total</span>
            <span className="text-indigo-700">{sharePct.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all"
              style={{ width: `${Math.min(sharePct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom stats */}
      <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
        <div className="flex items-center gap-1 text-slate-600">
          <Package className="h-3 w-3" />
          <span className="font-bold">{shop.totalStock.toFixed(0)}</span>
          <span className="text-slate-500">in stock</span>
        </div>
        <div className="flex items-center gap-1 text-slate-600">
          <Users className="h-3 w-3" />
          <span className="font-bold">{shop._count?.users ?? 0}</span>
          <span className="text-slate-500">staff</span>
        </div>
        {shop.lowStockCount > 0 && (
          <div className="flex items-center gap-1 text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            <span className="font-bold">{shop.lowStockCount}</span>
            <span>low</span>
          </div>
        )}
        {shop.registerOpen && (
          <div className="flex items-center gap-1 text-emerald-700">
            <Wallet className="h-3 w-3" />
            <span className="font-bold">{formatPKR(shop.registerBalance)}</span>
          </div>
        )}
      </div>

      <Link
        to={`/dashboard?shopId=${shop.id}`}
        className="mt-3 flex items-center justify-center gap-1 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition"
      >
        View Dashboard <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function StatMini({ label, value, sub, color }: any) {
  const colors: any = {
    emerald: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    violet: 'bg-violet-50 text-violet-900 border-violet-200',
    blue: 'bg-blue-50 text-blue-900 border-blue-200',
  };
  return (
    <div className={`rounded-lg border p-2 ${colors[color]}`}>
      <div className="text-[9px] font-extrabold uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-sm font-extrabold tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-[9px] font-bold opacity-70">{sub}</div>}
    </div>
  );
}
