import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Cpu, TrendingUp, DollarSign, Package, Shield, Sparkles,
  Barcode, Award, RefreshCw, ArrowRight, AlertTriangle,
  Zap, Layers, Users, BarChart3, ShoppingCart, Plus,
  CheckCircle2, Clock, Activity, Star,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { electronicsDashboardApi } from '../api/dashboard.api';
import { warrantyClaimsApi } from '../api/warranty-claims.api';
import { serialTrackingApi } from '../api/serial-tracking.api';
import { electronicsBrandsApi } from '../api/brands.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

export default function ElectronicsDashboardPage() {
  const hideCost = useCostHidden();

  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['electronics-dashboard-overview'],
    queryFn: () => electronicsDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const { data: warrantySummary } = useQuery({
    queryKey: ['warranty-claims-summary'],
    queryFn: () => warrantyClaimsApi.summary(),
    refetchInterval: 5 * 60_000,
  });

  const { data: topBrands = [] } = useQuery({
    queryKey: ['top-electronics-brands'],
    queryFn: () => electronicsBrandsApi.topBrands(5),
  });

  const { data: recentSerials = [] } = useQuery({
    queryKey: ['recent-serials'],
    queryFn: () => serialTrackingApi.list({ status: 'IN_STOCK' }),
  });

  const today = overview?.today ?? { revenue: 0, profit: 0, orders: 0, itemsSold: 0 };
  const week = overview?.week ?? { revenue: 0, profit: 0, orders: 0 };
  const month = overview?.month ?? { revenue: 0, profit: 0, orders: 0 };
  const inventory = overview?.inventory ?? { totalProducts: 0, totalStock: 0, lowStock: 0, outOfStock: 0, stockValue: 0 };
  const serials = overview?.serials ?? { total: 0, inStock: 0, sold: 0, warrantyActive: 0 };
  const salesByCategory = overview?.salesByCategory ?? [];
  const dailyTrend = overview?.dailyTrend7Days ?? [];
  const topProducts = overview?.topProducts ?? [];

  const showCost = (v: number) => hideCost ? '••••' : formatPKR(v);

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-3xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Cpu className="h-3.5 w-3.5 text-amber-300" />
              Electronics & Gadgets
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🔌 Electronics Dashboard
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Real-time sales, warranty claims, serial tracking, brand performance
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20"
            >
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

        {/* Hero KPIs */}
        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <HeroTile icon={DollarSign} label="Aaj ki Sales" value={formatPKR(today.revenue)} sub={`${today.orders} orders`} tone="emerald" />
          <HeroTile icon={TrendingUp} label="Aaj ka Profit" value={showCost(today.profit)} sub={hideCost ? 'PIN se dekho' : 'Net'} tone="blue" />
          <HeroTile icon={Package} label="Stock Value" value={showCost(inventory.stockValue)} sub={`${inventory.totalStock} pcs`} tone="violet" />
          <HeroTile icon={Barcode} label="Serials Tracked" value={String(serials.total)} sub={`${serials.inStock} in stock`} tone="amber" />
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        <QuickAction to="/pos" icon={ShoppingCart} label="POS" tone="blue" />
        <QuickAction to="/electronics-products/new" icon={Plus} label="Add Product" tone="emerald" />
        <QuickAction to="/electronics/serials" icon={Barcode} label="Serials" tone="amber" />
        <QuickAction to="/electronics/warranty-claims" icon={Shield} label="Warranty" tone="rose" />
        <QuickAction to="/electronics/brands" icon={Award} label="Brands" tone="violet" />
        <QuickAction to="/electronics/bundles" icon={Layers} label="Bundles" tone="pink" />
      </section>

      {/* ALERTS */}
      {(inventory.lowStock > 0 || inventory.outOfStock > 0 || (warrantySummary?.pendingCount ?? 0) > 0) && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-2 border-amber-300 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-900">Zaroori Alerts</h3>
              <p className="text-xs text-amber-800 font-bold">Foran attention chahiye</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {inventory.outOfStock > 0 && (
              <AlertCard to="/electronics-products?filter=out" icon={Package} title={`${inventory.outOfStock} Out of Stock`} desc="Foran restock karo" tone="rose" />
            )}
            {inventory.lowStock > 0 && (
              <AlertCard to="/electronics-products?filter=low" icon={AlertTriangle} title={`${inventory.lowStock} Low Stock`} desc="Reorder ka waqt" tone="amber" />
            )}
            {(warrantySummary?.pendingCount ?? 0) > 0 && (
              <AlertCard to="/electronics/warranty-claims" icon={Shield} title={`${warrantySummary.pendingCount} Warranty Claims`} desc="Pending processing" tone="blue" />
            )}
          </div>
        </section>
      )}

      {/* CHARTS ROW */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">7-Day Sales Trend</h3>
              <p className="text-xs text-slate-500 font-bold">Daily revenue + profit</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          {dailyTrend.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend}>
                  <defs>
                    <linearGradient id="elecRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="elecProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" fill="url(#elecRev)" strokeWidth={2.5} />
                  {!hideCost && <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#elecProfit)" strokeWidth={2} />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex flex-col items-center justify-center gap-2">
              <BarChart3 className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">Need more data</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Sales by Category</h3>
              <p className="text-xs text-slate-500 font-bold">This month</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          {salesByCategory.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByCategory}
                    cx="50%" cy="45%" outerRadius={90} innerRadius={50}
                    dataKey="revenue" nameKey="category"
                    label={(entry: any) => {
                      const total = salesByCategory.reduce((s: number, c: any) => s + c.revenue, 0);
                      return total > 0 ? `${((entry.revenue / total) * 100).toFixed(0)}%` : '';
                    }}
                    labelLine={false}
                  >
                    {salesByCategory.map((_: any, idx: number) => (
                      <Cell key={idx} fill={['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#f97316'][idx % 7]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex flex-col items-center justify-center gap-2">
              <Layers className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">No category data</p>
            </div>
          )}
        </div>
      </section>

      {/* PERIOD COMPARISON */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <PeriodCard label="Today" revenue={today.revenue} profit={today.profit} orders={today.orders} tone="emerald" hideCost={hideCost} />
        <PeriodCard label="This Week" revenue={week.revenue} profit={week.profit} orders={week.orders} tone="blue" hideCost={hideCost} />
        <PeriodCard label="This Month" revenue={month.revenue} profit={month.profit} orders={month.orders} tone="violet" hideCost={hideCost} />
      </section>

      {/* SERIAL TRACKING + WARRANTY STATS */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md">
              <Barcode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">Serial / IMEI Tracking</h3>
              <p className="text-xs text-slate-500 font-bold">Har piece unique tracked</p>
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <StatBox label="Total Serials" value={serials.total} icon={Barcode} tone="amber" />
            <StatBox label="In Stock" value={serials.inStock} icon={Package} tone="emerald" />
            <StatBox label="Sold" value={serials.sold} icon={CheckCircle2} tone="blue" />
            <StatBox label="Warranty Active" value={serials.warrantyActive} icon={Shield} tone="violet" />
          </div>
          <div className="px-4 pb-4">
            <Link to="/electronics/serials" className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 text-white font-extrabold text-sm shadow-md transition">
              Serial Lookup <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-rose-50 to-red-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-md">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">Warranty Claims</h3>
              <p className="text-xs text-slate-500 font-bold">Customer service</p>
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <StatBox label="Total Claims" value={warrantySummary?.totalCount ?? 0} icon={Shield} tone="blue" />
            <StatBox label="Pending" value={warrantySummary?.pendingCount ?? 0} icon={Clock} tone="amber" />
            <StatBox label="Resolved" value={warrantySummary?.resolvedCount ?? 0} icon={CheckCircle2} tone="emerald" />
            <StatBox label="This Month" value={warrantySummary?.thisMonthCount ?? 0} icon={Activity} tone="violet" />
          </div>
          <div className="px-4 pb-4">
            <Link to="/electronics/warranty-claims" className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 text-white font-extrabold text-sm shadow-md transition">
              Manage Claims <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* TOP PRODUCTS + BRANDS */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">🏆 Top Selling Products</h3>
              <p className="text-xs text-slate-500 font-bold">This month</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[400px] overflow-y-auto">
            {topProducts.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">No sales yet this month</div>
            ) : (
              topProducts.slice(0, 8).map((p: any, i: number) => (
                <Link key={p.productId} to={`/electronics-products/${p.productId}`} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition group">
                  <div className={`h-8 w-8 rounded-lg text-white flex items-center justify-center font-extrabold text-xs shrink-0 ${
                    i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-slate-300'
                  }`}>
                    {i < 3 ? <Star className="h-4 w-4 fill-white" /> : i + 1}
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                    {p.product?.images?.[0]?.url ? (
                      <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Cpu className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate text-slate-900 group-hover:text-blue-700">{p.product?.name}</div>
                    <div className="text-[10px] text-slate-500 font-bold">{p.quantitySold} bike</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 text-sm tabular-nums">{formatPKR(p.revenue)}</div>
                  </div>
                </Link>
              ))
            )}
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
          <div className="divide-y-2 divide-slate-100 max-h-[400px] overflow-y-auto">
            {topBrands.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">
                <p>No brands yet</p>
                <Link to="/electronics/brands" className="mt-2 inline-block text-blue-600 font-extrabold hover:underline">Add brands →</Link>
              </div>
            ) : (
              topBrands.map((b: any, i: number) => (
                <Link key={b.id} to="/electronics/brands" className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                  <div className={`h-9 w-9 rounded-lg text-white flex items-center justify-center font-extrabold text-xs shrink-0 ${
                    i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-violet-500'
                  }`}>
                    {i + 1}
                  </div>
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
                      <span className="text-[10px] text-slate-500 font-bold">{b.productCount || 0} products</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-violet-700 text-sm tabular-nums">{formatPKR(b.totalRevenue || 0)}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* RECENT SERIALS IN STOCK */}
      {recentSerials.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-blue-50 to-cyan-50 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center shadow-md">
                <Barcode className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">Recent Stock (Serial Tracked)</h3>
                <p className="text-xs text-slate-500 font-bold">Latest units added to inventory</p>
              </div>
            </div>
            <Link to="/electronics/serials" className="text-xs font-extrabold text-blue-600 hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {recentSerials.slice(0, 8).map((s: any) => (
              <div key={s.id} className="px-5 py-3 flex items-center gap-3 hover:bg-blue-50/40 transition">
                <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Barcode className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-extrabold text-sm text-slate-900 truncate">{s.serialNumber}</div>
                  <div className="text-[10px] text-slate-500 font-bold truncate">
                    {s.product?.name} {s.imei && `• IMEI: ${s.imei}`}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase shrink-0">
                  In Stock
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ══════════ Components ══════════ */
function HeroTile({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
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
    blue: 'from-blue-500 to-cyan-700',
    emerald: 'from-emerald-500 to-teal-700',
    amber: 'from-amber-500 to-orange-700',
    rose: 'from-rose-500 to-red-700',
    violet: 'from-violet-500 to-purple-700',
    pink: 'from-pink-500 to-rose-700',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 transition-all p-3 sm:p-4 text-center">
      <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md mx-auto mb-2 group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="text-xs sm:text-sm font-extrabold text-slate-900">{label}</div>
    </Link>
  );
}

function AlertCard({ to, icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 to-red-700 bg-rose-50 border-rose-200',
    amber: 'from-amber-500 to-orange-700 bg-amber-50 border-amber-200',
    blue: 'from-blue-500 to-cyan-700 bg-blue-50 border-blue-200',
  };
  const parts = tones[tone].split(' ');
  return (
    <Link to={to} className={`rounded-2xl bg-white border-2 ${parts.slice(2, 4).join(' ')} p-4 flex items-center gap-3 hover:shadow-md transition group`}>
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${parts[0]} ${parts[1]} text-white flex items-center justify-center shadow-md shrink-0`}>
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

function StatBox({ label, value, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
  };
  return (
    <div className={`rounded-xl border-2 p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold">{label}</div>
      </div>
      <div className="text-xl font-extrabold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

function PeriodCard({ label, revenue, profit, orders, tone, hideCost }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-700 border-emerald-300',
    blue: 'from-blue-500 to-cyan-700 border-blue-300',
    violet: 'from-violet-500 to-purple-700 border-violet-300',
  };
  const parts = tones[tone].split(' ');
  return (
    <div className={`rounded-3xl bg-gradient-to-br from-white to-slate-50 border-2 ${parts[2]} p-4 shadow-sm`}>
      <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white bg-gradient-to-r ${parts[0]} ${parts[1]}`}>
        {label}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Revenue</div>
          <div className="text-base font-extrabold text-slate-900 tabular-nums leading-none mt-1">{formatPKR(revenue)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Profit</div>
          <div className="text-base font-extrabold text-emerald-700 tabular-nums leading-none mt-1">{hideCost ? '••••' : formatPKR(profit)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Orders</div>
          <div className="text-base font-extrabold text-blue-700 tabular-nums leading-none mt-1">{orders}</div>
        </div>
      </div>
    </div>
  );
}
