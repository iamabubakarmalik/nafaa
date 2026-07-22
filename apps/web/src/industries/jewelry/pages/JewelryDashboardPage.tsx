import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Gem, Sparkles, RefreshCw, TrendingUp, DollarSign, Package, Users,
  ArrowRight, Award, Calendar, Coins, Scale, Star, Clock,
  Diamond, ShieldCheck, Repeat, Palette,
} from 'lucide-react';
import { jewelryDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { format } from 'date-fns';

const METAL_EMOJI: Record<string, string> = {
  GOLD: '🥇', SILVER: '🥈', PLATINUM: '💠', PALLADIUM: '⚪',
  ROSE_GOLD: '🌹', WHITE_GOLD: '⚪', IMITATION: '✨',
};

const PURITY_LABEL: Record<string, string> = {
  KARAT_24: '24K', KARAT_22: '22K', KARAT_21: '21K', KARAT_18: '18K',
  KARAT_14: '14K', KARAT_10: '10K', KARAT_9: '9K',
  SILVER_999: 'Silver 999', SILVER_925: 'Silver 925', SILVER_800: 'Silver 800',
  PLATINUM_950: 'Pt 950', PLATINUM_900: 'Pt 900',
};

const CATEGORY_EMOJI: Record<string, string> = {
  RING: '💍', NECKLACE: '📿', EARRINGS: '👂', BANGLE: '⭕', BRACELET: '⛓️',
  PENDANT: '💎', CHAIN: '⛓️', JHUMKA: '💫', CHOKER: '⚜️', KUNDAN_SET: '👑',
  BRIDAL_SET: '👰', COIN: '🪙', BAR: '📊', BULLION: '📊',
};

export default function JewelryDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['jewelry-dashboard'],
    queryFn: () => jewelryDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const currentRates = overview?.currentRates ?? [];
  const totals = overview?.totals ?? { totalProducts: 0, activeKarigars: 0 };
  const today = overview?.today ?? { sales: 0, revenue: 0, weightSold: 0, customOrders: 0, exchanges: 0 };
  const monthly = overview?.monthly ?? { sales: 0, revenue: 0, collected: 0, outstanding: 0, goldSold: 0, silverSold: 0, exchangesCount: 0, exchangesValue: 0, exchangesGold: 0 };
  const pendingCustomOrders = overview?.pendingCustomOrders ?? 0;
  const topCategories = overview?.topCategories ?? [];
  const recentSales = overview?.recentSales ?? [];
  const topKarigars = overview?.topKarigars ?? [];
  const upcomingOrders = overview?.upcomingOrders ?? [];

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-yellow-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Zargar Command Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              💎 Jewelry Dashboard
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Live rates, hallmark, karigars — sab track
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
            <Link to="/jewelry/sales/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Gem className="h-4 w-4" />
                New Sale
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* LIVE METAL RATES BANNER */}
      <section className="rounded-3xl bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 text-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Coins className="h-3.5 w-3.5" />
              Live Metal Rates
            </div>
            <h3 className="mt-2 text-2xl font-extrabold">💰 Today's Rates</h3>
          </div>
          <Link to="/jewelry/metal-rates">
            <Button className="bg-white text-amber-800 hover:bg-slate-100">
              <TrendingUp className="h-4 w-4" />
              Update Rates
            </Button>
          </Link>
        </div>
        {currentRates.length === 0 ? (
          <div className="text-center py-6 bg-white/10 rounded-xl">
            <Coins className="h-10 w-10 mx-auto mb-2 opacity-60" />
            <p className="font-extrabold">No rates set yet</p>
            <p className="text-xs opacity-80">Add today's gold/silver rates to start</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {currentRates.slice(0, 8).map((r: any) => (
              <div key={r.id} className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{METAL_EMOJI[r.metalType]}</span>
                  <div>
                    <div className="text-[10px] uppercase font-extrabold opacity-80">{r.metalType.replace('_', ' ')}</div>
                    <div className="text-xs font-extrabold">{PURITY_LABEL[r.purity] ?? r.purity}</div>
                  </div>
                </div>
                <div className="text-xl font-extrabold tabular-nums">Rs {r.ratePerGram.toLocaleString()}</div>
                <div className="text-[10px] font-bold opacity-70">per gram</div>
                {r.ratePerTola && (
                  <div className="text-[10px] font-bold opacity-70 mt-0.5">
                    Tola: Rs {r.ratePerTola.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* TODAY KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Today's Sales" value={today.sales} sub={formatPKR(today.revenue)} icon={DollarSign} color="amber" />
        <KpiCard label="Weight Sold" value={today.weightSold.toFixed(2) + 'g'} icon={Scale} color="yellow" />
        <KpiCard label="Custom Orders" value={today.customOrders} sub={pendingCustomOrders + ' pending'} icon={Palette} color="rose" />
        <KpiCard label="Exchanges" value={today.exchanges} icon={Repeat} color="violet" />
      </section>

      {/* MONTHLY */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 to-amber-900 text-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <TrendingUp className="h-3.5 w-3.5 text-amber-300" />
              Last 30 Days
            </div>
            <h3 className="mt-2 text-2xl font-extrabold">Monthly Overview</h3>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Revenue</div>
            <div className="mt-1 text-2xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(monthly.revenue)}</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Collected</div>
            <div className="mt-1 text-2xl font-extrabold text-cyan-300 tabular-nums">{formatPKR(monthly.collected)}</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Outstanding</div>
            <div className="mt-1 text-2xl font-extrabold text-amber-300 tabular-nums">{formatPKR(monthly.outstanding)}</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase font-extrabold text-white/70 flex items-center gap-1">🥇 Gold</div>
            <div className="mt-1 text-2xl font-extrabold text-yellow-300 tabular-nums">{monthly.goldSold.toFixed(1)}g</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase font-extrabold text-white/70 flex items-center gap-1">🥈 Silver</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-200 tabular-nums">{monthly.silverSold.toFixed(1)}g</div>
          </div>
        </div>
        <div className="mt-3 rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3 text-sm flex items-center justify-between flex-wrap gap-2">
          <span className="text-white/70 font-bold">Exchange Activity (30d):</span>
          <div className="flex gap-4 flex-wrap text-xs font-bold">
            <span>Count: <b className="text-cyan-300">{monthly.exchangesCount}</b></span>
            <span>Value: <b className="text-emerald-300">{formatPKR(monthly.exchangesValue)}</b></span>
            <span>Gold: <b className="text-yellow-300">{monthly.exchangesGold.toFixed(1)}g</b></span>
          </div>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/jewelry/metal-rates" icon={Coins} label="Metal Rates" color="amber" />
        <QuickLink to="/jewelry/products" icon={Gem} label="Products" color="yellow" />
        <QuickLink to="/jewelry/sales" icon={DollarSign} label="Sales" color="emerald" />
        <QuickLink to="/jewelry/custom-orders" icon={Palette} label="Custom Orders" color="rose" />
        <QuickLink to="/jewelry/exchanges" icon={Repeat} label="Exchanges" color="violet" />
        <QuickLink to="/jewelry/karigars" icon={Users} label="Karigars" color="blue" />
        <QuickLink to="/jewelry/metal-stock" icon={Scale} label="Metal Stock" color="cyan" />
        <QuickLink to="/jewelry/reports" icon={TrendingUp} label="Reports" color="fuchsia" />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* RECENT SALES */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Gem className="h-5 w-5 text-amber-600" />
                Recent Sales
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Latest transactions</p>
            </div>
            <Link to="/jewelry/sales" className="text-xs font-extrabold text-amber-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {recentSales.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Gem className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No sales yet
              </div>
            ) : (
              recentSales.map((s: any) => (
                <Link key={s.id} to={'/jewelry/sales/' + s.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white flex items-center justify-center shrink-0 text-lg">
                    💎
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm truncate">{s.customerName || s.invoiceNumber}</span>
                      <span className="text-[9px] font-mono text-slate-400">{s.invoiceNumber}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">
                      {s.items?.length} items • {s.netWeight?.toFixed(2)}g
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums text-sm">{formatPKR(s.total)}</div>
                    <div className="text-[10px] font-bold text-slate-500">
                      {format(new Date(s.saleDate), 'dd MMM')}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* TOP CATEGORIES */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              Top Selling Categories
            </h3>
            <p className="text-xs text-slate-500 font-semibold">Last 30 days</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {topCategories.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No sales data yet
              </div>
            ) : (
              topCategories.slice(0, 5).map((cat: any, i: number) => (
                <div key={cat.category} className="px-6 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0">
                    {i + 1}
                  </div>
                  <div className="text-2xl">{CATEGORY_EMOJI[cat.category] || '💎'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm">{cat.category.replace('_', ' ')}</div>
                    <div className="text-[10px] font-bold text-slate-500">{cat._count._all} items • {cat._sum.netWeight?.toFixed(1)}g</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums text-sm">{formatPKR(cat._sum.itemTotal ?? 0)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* UPCOMING CUSTOM ORDERS + TOP KARIGARS */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Palette className="h-5 w-5 text-rose-600" />
                Custom Orders In Progress
              </h3>
            </div>
            <Link to="/jewelry/custom-orders" className="text-xs font-extrabold text-rose-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-80 overflow-y-auto">
            {upcomingOrders.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Palette className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No pending orders
              </div>
            ) : (
              upcomingOrders.map((o: any) => (
                <Link key={o.id} to={'/jewelry/custom-orders/' + o.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shrink-0">
                    <Palette className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm">{o.orderNumber}</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase">{o.status}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold truncate">{o.customerName} • {o.category}</div>
                  </div>
                  {o.promisedDate && (
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-extrabold text-slate-600">
                        {format(new Date(o.promisedDate), 'dd MMM')}
                      </div>
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Top Karigars
              </h3>
            </div>
            <Link to="/jewelry/karigars" className="text-xs font-extrabold text-blue-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {topKarigars.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No karigars yet
              </div>
            ) : (
              topKarigars.map((k: any, i: number) => (
                <Link key={k.id} to={'/jewelry/karigars/' + k.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0">
                    {i + 1}
                  </div>
                  {k.photoUrl ? (
                    <img src={k.photoUrl} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white flex items-center justify-center font-extrabold shrink-0">
                      {k.fullName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{k.fullName}</div>
                    <div className="text-[10px] font-bold text-slate-500">{k.completedOrders} orders • {k.skillLevel || 'N/A'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums text-sm">{formatPKR(k.totalEarnings)}</div>
                    {k.outstandingGrams > 0 && (
                      <div className="text-[10px] font-extrabold text-amber-700">{k.outstandingGrams.toFixed(1)}g out</div>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    amber: 'from-amber-500 to-yellow-600',
    yellow: 'from-yellow-500 to-amber-600',
    rose: 'from-rose-500 to-pink-600',
    violet: 'from-violet-500 to-purple-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
          {sub && <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">{sub}</div>}
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg shrink-0'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, color }: any) {
  const colors: Record<string, string> = {
    amber: 'from-amber-500 to-yellow-600',
    yellow: 'from-yellow-500 to-amber-600',
    emerald: 'from-emerald-500 to-green-600',
    rose: 'from-rose-500 to-pink-600',
    violet: 'from-violet-500 to-purple-600',
    blue: 'from-blue-500 to-cyan-600',
    cyan: 'from-cyan-500 to-teal-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
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
