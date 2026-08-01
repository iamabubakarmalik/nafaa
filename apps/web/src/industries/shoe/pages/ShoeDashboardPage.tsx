import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Footprints, TrendingUp, DollarSign, Package, Ruler, Award,
  RefreshCw, ArrowRight, AlertTriangle, Plus, ShoppingCart,
  HandMetal, PackageX, BarChart3, Star, Users,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { shoeDashboardApi } from '../api/dashboard.api';
import { shoeTryOnApi } from '../api/try-on.api';
import { shoeExchangesApi } from '../api/exchanges.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

export default function ShoeDashboardPage() {
  const hideCost = useCostHidden();

  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['shoe-dashboard-overview'],
    queryFn: () => shoeDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const { data: sizePopularity = [] } = useQuery({
    queryKey: ['shoe-size-popularity'],
    queryFn: () => shoeDashboardApi.sizePopularity(),
    refetchInterval: 5 * 60_000,
  });

  const { data: tryOnSummary } = useQuery({
    queryKey: ['shoe-tryon-summary'],
    queryFn: () => shoeTryOnApi.summary(),
    refetchInterval: 60_000,
  });

  const { data: exchangeSummary } = useQuery({
    queryKey: ['shoe-exchange-summary'],
    queryFn: () => shoeExchangesApi.summary(),
    refetchInterval: 60_000,
  });

  const totals = overview?.totals ?? { totalBrands: 0, totalProducts: 0, totalSizeVariants: 0, totalStockUnits: 0, pendingTryOns: 0, pendingExchanges: 0, lowStockCount: 0, outOfStockCount: 0 };
  const topProducts = overview?.topProducts ?? [];
  const topBrands = overview?.topBrands ?? [];
  const byCategory = overview?.byCategory ?? [];
  const byGender = overview?.byGender ?? [];
  const lowStockVariants = overview?.lowStockVariants ?? [];
  const outOfStockVariants = overview?.outOfStockVariants ?? [];

  const categoryData = byCategory.slice(0, 8).map((c: any) => ({
    name: (c.categoryType || 'OTHER').replace(/_/g, ' '),
    value: c._count._all,
  }));

  const genderData = byGender.map((g: any) => ({
    name: g.gender || 'UNSPECIFIED',
    value: g._count._all,
  }));

  const topSizesData = sizePopularity.slice(0, 10).map((s: any) => ({
    label: s.size,
    sold: s.sold,
  }));

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-orange-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Footprints className="h-3.5 w-3.5 text-amber-300" /> Shoe Store & Footwear
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👟 Shoe Dashboard</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Size variants, try-ons, exchanges, brand catalogue — one screen
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <PrivacyToggle />
            <Link to="/shoe-products/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" /> New Product
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <HeroTile icon={Footprints} label="Products" value={String(totals.totalProducts)} sub={`${totals.totalBrands} brands`} tone="orange" />
          <HeroTile icon={Ruler} label="Size Variants" value={String(totals.totalSizeVariants)} sub={`${totals.totalStockUnits} pairs`} tone="emerald" />
          <HeroTile icon={HandMetal} label="Try-Ons Pending" value={String(totals.pendingTryOns)} sub="Bring size X" tone="violet" />
          <HeroTile icon={RefreshCw} label="Exchanges" value={String(totals.pendingExchanges)} sub="To process" tone={totals.pendingExchanges > 0 ? 'rose' : 'blue'} />
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        <QuickAction to="/pos" icon={ShoppingCart} label="POS" tone="orange" />
        <QuickAction to="/shoe/brands" icon={Award} label="Brands" tone="violet" />
        <QuickAction to="/shoe/size-charts" icon={Ruler} label="Size Charts" tone="blue" />
        <QuickAction to="/shoe/try-on" icon={HandMetal} label="Try-On" tone="emerald" />
        <QuickAction to="/shoe/exchanges" icon={RefreshCw} label="Exchanges" tone="rose" />
        <QuickAction to="/shoe-products/new" icon={Plus} label="New Product" tone="amber" />
      </section>

      {/* ALERTS */}
      {(totals.outOfStockCount > 0 || totals.lowStockCount > 0) && (
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
            {totals.outOfStockCount > 0 && (
              <AlertCard to="/shoe-products?stockFilter=out" icon={PackageX}
                title={`${totals.outOfStockCount} sizes out of stock`}
                desc={outOfStockVariants.slice(0, 3).map((v: any) => v.size).join(', ')} tone="rose" />
            )}
            {totals.lowStockCount > 0 && (
              <AlertCard to="/shoe-products?stockFilter=low" icon={AlertTriangle}
                title={`${totals.lowStockCount} sizes running low`}
                desc="Restock before they sell out" tone="amber" />
            )}
          </div>
        </section>
      )}

      {/* CHARTS */}
      <section className="grid lg:grid-cols-[1fr_1fr] gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Most-Sold Sizes</h3>
              <p className="text-xs text-slate-500 font-bold">Popular size grid</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-700 text-white flex items-center justify-center shadow-md">
              <Ruler className="h-5 w-5" />
            </div>
          </div>
          {topSizesData.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSizesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Bar dataKey="sold" name="Pairs sold" radius={[8, 8, 0, 0]} fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2">
              <BarChart3 className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">No sales data yet</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">By Gender</h3>
              <p className="text-xs text-slate-500 font-bold">Product distribution</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <Users className="h-5 w-5" />
            </div>
          </div>
          {genderData.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="45%" outerRadius={88} innerRadius={50}
                    dataKey="value" nameKey="name"
                    label={(e: any) => {
                      const t = genderData.reduce((s: number, x: any) => s + x.value, 0);
                      return t > 0 ? `${((e.value / t) * 100).toFixed(0)}%` : '';
                    }}
                    labelLine={false}>
                    {genderData.map((_: any, i: number) => (
                      <Cell key={i} fill={['#f97316', '#ec4899', '#3b82f6', '#a855f7', '#f59e0b', '#10b981'][i % 6]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2">
              <Users className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">No products yet</p>
            </div>
          )}
        </div>
      </section>

      {/* MODULE SUMMARIES */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ModuleCard label="Try-On Requests" icon={HandMetal} tone="violet"
          pending={tryOnSummary?.pending ?? 0}
          completed={tryOnSummary?.completed ?? 0}
          extra={`${tryOnSummary?.conversion ?? 0} conversions`}
          link="/shoe/try-on" />
        <ModuleCard label="Exchanges" icon={RefreshCw} tone="rose"
          pending={exchangeSummary?.requested ?? 0}
          completed={exchangeSummary?.completed ?? 0}
          extra="Size / colour swap"
          link="/shoe/exchanges" />
        <ModuleCard label="Total Brands" icon={Award} tone="blue"
          pending={0}
          completed={totals.totalBrands}
          extra="Active brands"
          link="/shoe/brands" />
      </section>

      {/* TOP PRODUCTS + BRANDS */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-orange-50 to-amber-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-700 text-white flex items-center justify-center shadow-md">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">🏆 Top Sellers</h3>
              <p className="text-xs text-slate-500 font-bold">By pairs sold</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {topProducts.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">No sales recorded yet</div>
            ) : topProducts.slice(0, 8).map((p: any, i: number) => (
              <Link key={p.id ?? i} to={p.productId ? `/shoe-products/${p.productId}` : '/shoe-products'}
                className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition group">
                <div className={`h-8 w-8 rounded-lg text-white flex items-center justify-center font-extrabold text-xs shrink-0 ${
                  i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-slate-300'
                }`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900 group-hover:text-orange-700">
                    {p.modelName || 'Product'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {p.totalSold ?? 0} pairs sold
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-orange-500 shrink-0" />
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
              <h3 className="font-extrabold text-slate-900">Top Brands</h3>
              <p className="text-xs text-slate-500 font-bold">By total revenue</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {topBrands.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">
                <Award className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                No brands yet
                <Link to="/shoe/brands" className="mt-2 block text-violet-600 font-extrabold hover:underline text-xs">
                  Add first brand →
                </Link>
              </div>
            ) : topBrands.map((b: any) => (
              <Link key={b.id} to="/shoe/brands" className="px-5 py-3 flex items-center gap-3 hover:bg-violet-50/40 transition">
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-white p-1 border border-slate-200 shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-extrabold shrink-0">
                    {b.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900">{b.name}</div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    {b.isPremium && <span className="px-1 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold">PREMIUM</span>}
                    {b.isLocal && <span className="px-1 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">LOCAL</span>}
                    {b.isSportsBrand && <span className="px-1 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold">SPORTS</span>}
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
    orange: 'from-orange-400/30 to-orange-600/20 border-orange-300/40',
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
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
    orange: 'from-orange-500 to-amber-700',
    violet: 'from-violet-500 to-purple-700',
    blue: 'from-blue-500 to-cyan-700',
    emerald: 'from-emerald-500 to-teal-700',
    rose: 'from-rose-500 to-red-700',
    amber: 'from-amber-500 to-orange-700',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white border-2 border-slate-200 hover:border-orange-300 hover:shadow-lg hover:-translate-y-0.5 transition-all p-3 sm:p-4 text-center">
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

function ModuleCard({ label, icon: Icon, tone, pending, completed, extra, link }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-700 border-violet-300',
    rose: 'from-rose-500 to-red-700 border-rose-300',
    blue: 'from-blue-500 to-cyan-700 border-blue-300',
  };
  const parts = tones[tone].split(' ');
  return (
    <Link to={link} className={`rounded-3xl bg-gradient-to-br from-white to-slate-50 border-2 ${parts[2]} p-4 shadow-sm hover:shadow-lg transition group`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white bg-gradient-to-r ${parts[0]} ${parts[1]}`}>
          <Icon className="h-3 w-3" /> {label}
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Pending</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums leading-none mt-1">{pending}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Completed</div>
          <div className="text-2xl font-extrabold text-emerald-700 tabular-nums leading-none mt-1">{completed}</div>
        </div>
      </div>
      <div className="mt-2 text-[10px] font-bold text-slate-500">{extra}</div>
    </Link>
  );
}
