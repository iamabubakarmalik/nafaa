import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Gamepad2, TrendingUp, DollarSign, Package, Timer, Monitor,
  CreditCard, Trophy, RefreshCw, ArrowRight, AlertTriangle,
  Plus, ShoppingCart, PackageOpen, Play, Pause, Clock,
  BarChart3, Star, Users, Zap,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { gamingDashboardApi } from '../api/dashboard.api';
import { gamingSessionsApi } from '../api/sessions.api';
import { gamingRentalsApi } from '../api/rentals.api';
import { gamingTopupsApi } from '../api/topups.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

export default function GamingDashboardPage() {
  const hideCost = useCostHidden();

  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['gaming-dashboard-overview'],
    queryFn: () => gamingDashboardApi.overview(),
    refetchInterval: 45_000,
  });

  const { data: liveSessions = [] } = useQuery({
    queryKey: ['gaming-active-sessions'],
    queryFn: () => gamingSessionsApi.active(),
    refetchInterval: 20_000,
  });

  const { data: rentalSummary } = useQuery({
    queryKey: ['gaming-rentals-summary'],
    queryFn: () => gamingRentalsApi.summary(),
    refetchInterval: 5 * 60_000,
  });

  const { data: topupSummary } = useQuery({
    queryKey: ['gaming-topups-summary'],
    queryFn: () => gamingTopupsApi.summary(),
    refetchInterval: 5 * 60_000,
  });

  const totals = overview?.totals ?? { totalProducts: 0, totalStations: 0, activeStations: 0, activeSessions: 0 };
  const inv = overview?.inventory ?? { availableTopups: 0, upcomingTournaments: 0 };
  const rentals = overview?.rentals ?? { active: 0, overdue: 0 };
  const today = overview?.today ?? { cafeRevenue: 0, topupRevenue: 0, topupProfit: 0, rentalRevenue: 0, totalRevenue: 0, sessionsCount: 0, topupCount: 0, rentalCount: 0 };
  const monthly = overview?.monthly ?? { cafeRevenue: 0, topupRevenue: 0, topupProfit: 0, rentalRevenue: 0, totalRevenue: 0 };
  const topProducts = overview?.topProducts ?? [];
  const tournaments = overview?.tournaments ?? [];

  const revenueSplit = [
    { name: 'Cafe Sessions', value: monthly.cafeRevenue },
    { name: 'Digital Top-ups', value: monthly.topupRevenue },
    { name: 'Rentals', value: monthly.rentalRevenue },
  ].filter((x) => x.value > 0);

  const todayBars = [
    { label: 'Cafe', revenue: today.cafeRevenue },
    { label: 'Top-ups', revenue: today.topupRevenue },
    { label: 'Rentals', revenue: today.rentalRevenue },
  ];

  const showCost = (v: number) => (hideCost ? '••••' : formatPKR(v));

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-violet-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Gamepad2 className="h-3.5 w-3.5 text-amber-300" /> Gaming Shop & Cyber Cafe
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🎮 Gaming Dashboard</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Live cafe billing, rentals, digital top-ups, tournaments — one screen
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <PrivacyToggle />
            <Link to="/gaming/cafe">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Timer className="h-4 w-4" /> Cafe Live
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <HeroTile icon={DollarSign} label="Today Revenue" value={formatPKR(today.totalRevenue)} sub={`${today.sessionsCount} sessions`} tone="emerald" />
          <HeroTile icon={Monitor} label="Active Stations" value={`${liveSessions.length}/${totals.totalStations}`} sub="in use now" tone="violet" />
          <HeroTile icon={PackageOpen} label="Active Rentals" value={String(rentals.active)} sub={`${rentals.overdue} overdue`} tone={rentals.overdue > 0 ? 'rose' : 'blue'} />
          <HeroTile icon={CreditCard} label="Top-up Cards" value={String(inv.availableTopups)} sub="in stock" tone="amber" />
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        <QuickAction to="/pos" icon={ShoppingCart} label="POS" tone="violet" />
        <QuickAction to="/gaming/cafe" icon={Timer} label="Cafe Live" tone="emerald" />
        <QuickAction to="/gaming/rentals" icon={PackageOpen} label="Rentals" tone="blue" />
        <QuickAction to="/gaming/topups" icon={CreditCard} label="Top-ups" tone="amber" />
        <QuickAction to="/gaming/tournaments" icon={Trophy} label="Tournaments" tone="rose" />
        <QuickAction to="/gaming-products/new" icon={Plus} label="Add Product" tone="fuchsia" />
      </section>

      {/* ALERTS */}
      {(rentals.overdue > 0 || inv.availableTopups < 5) && (
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
            {rentals.overdue > 0 && (
              <AlertCard to="/gaming/rentals?status=OVERDUE" icon={Clock}
                title={`${rentals.overdue} Overdue Rentals`} desc="Chase returns, apply late fees" tone="rose" />
            )}
            {inv.availableTopups < 5 && (
              <AlertCard to="/gaming/topups" icon={CreditCard}
                title={`Only ${inv.availableTopups} top-up cards left`} desc="Restock PSN / UC / Robux codes" tone="amber" />
            )}
          </div>
        </section>
      )}

      {/* LIVE SESSIONS */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 inline-flex items-center gap-2">
                Live Sessions
                {liveSessions.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-extrabold uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> {liveSessions.length} running
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-bold">Real-time station billing</p>
            </div>
          </div>
          <Link to="/gaming/cafe" className="text-xs font-extrabold text-emerald-700 hover:underline inline-flex items-center gap-1">
            Open cafe screen <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {liveSessions.length === 0 ? (
          <div className="p-10 text-center">
            <Monitor className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <div className="font-extrabold text-slate-700">No sessions running</div>
            <p className="text-xs text-slate-500 font-semibold mt-1">Start one from the Cafe Live screen</p>
            <Link to="/gaming/cafe">
              <Button className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-700">
                <Play className="h-4 w-4" /> Start Session
              </Button>
            </Link>
          </div>
        ) : (
          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {liveSessions.map((s: any) => {
              const mins = Math.max(0, Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 60000) - (s.totalPauseMinutes || 0));
              const amount = (mins / 60) * Number(s.ratePerHour || 0);
              const paused = s.status === 'PAUSED';
              return (
                <Link key={s.id} to="/gaming/cafe"
                  className={['rounded-2xl border-2 p-3 transition hover:shadow-md',
                    paused ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'].join(' ')}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-extrabold text-slate-900 text-sm truncate">
                      {s.station?.name || s.station?.stationNumber || 'Station'}
                    </div>
                    <span className={['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase',
                      paused ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'].join(' ')}>
                      {paused ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
                      {paused ? 'Paused' : 'Live'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-slate-600 truncate">
                    {s.customerName || 'Walk-in'} • {s.playerCount || 1} player(s)
                    {s.gameSelected ? ` • ${s.gameSelected}` : ''}
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <div>
                      <div className="text-[9px] uppercase font-extrabold text-slate-500">Elapsed</div>
                      <div className="text-lg font-extrabold text-slate-900 tabular-nums leading-none">
                        {Math.floor(mins / 60)}h {mins % 60}m
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] uppercase font-extrabold text-slate-500">Running bill</div>
                      <div className="text-lg font-extrabold text-emerald-700 tabular-nums leading-none">
                        {formatPKR(amount)}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* CHARTS */}
      <section className="grid lg:grid-cols-[1fr_1fr] gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Today by Revenue Stream</h3>
              <p className="text-xs text-slate-500 font-bold">Cafe vs top-ups vs rentals</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-700 text-white flex items-center justify-center shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          {today.totalRevenue > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={todayBars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Bar dataKey="revenue" name="Revenue" radius={[8, 8, 0, 0]}>
                    {todayBars.map((_, i) => (
                      <Cell key={i} fill={['#8b5cf6', '#f59e0b', '#3b82f6'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2">
              <BarChart3 className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">No sales yet today</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">This Month Mix</h3>
              <p className="text-xs text-slate-500 font-bold">Total {formatPKR(monthly.totalRevenue)}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          {revenueSplit.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueSplit} cx="50%" cy="45%" outerRadius={88} innerRadius={50}
                    dataKey="value" nameKey="name"
                    label={(e: any) => {
                      const t = revenueSplit.reduce((s, x) => s + x.value, 0);
                      return t > 0 ? `${((e.value / t) * 100).toFixed(0)}%` : '';
                    }}
                    labelLine={false}>
                    {revenueSplit.map((_, i) => (
                      <Cell key={i} fill={['#8b5cf6', '#f59e0b', '#3b82f6'][i % 3]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2">
              <TrendingUp className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">No monthly data yet</p>
            </div>
          )}
        </div>
      </section>

      {/* STREAM CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StreamCard label="Cafe Sessions" icon={Timer} tone="violet"
          today={today.cafeRevenue} month={monthly.cafeRevenue} extra={`${today.sessionsCount} today`} />
        <StreamCard label="Digital Top-ups" icon={CreditCard} tone="amber"
          today={today.topupRevenue} month={monthly.topupRevenue}
          extra={hideCost ? 'profit hidden' : `profit ${formatPKR(monthly.topupProfit)}`} />
        <StreamCard label="Rentals" icon={PackageOpen} tone="blue"
          today={today.rentalRevenue} month={monthly.rentalRevenue}
          extra={`${rentals.active} active`} />
      </section>

      {/* TOP PRODUCTS + TOURNAMENTS */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-700 text-white flex items-center justify-center shadow-md">
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
              <Link key={p.id ?? i} to={p.productId ? `/gaming-products/${p.productId}` : '/gaming-products'}
                className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition group">
                <div className={`h-8 w-8 rounded-lg text-white flex items-center justify-center font-extrabold text-xs shrink-0 ${
                  i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-slate-300'
                }`}>{i + 1}</div>
                <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                  {p.coverImageUrl ? (
                    <img src={p.coverImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Gamepad2 className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900 group-hover:text-violet-700">
                    {p.product?.name || p.modelNumber || 'Product'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {p.totalSold ?? 0} sold{p.totalRented ? ` • ${p.totalRented} rented` : ''}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-emerald-700 text-sm tabular-nums">{formatPKR(p.totalRevenue || 0)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-rose-50 to-red-50 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-md">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">Upcoming Tournaments</h3>
                <p className="text-xs text-slate-500 font-bold">{inv.upcomingTournaments} scheduled</p>
              </div>
            </div>
            <Link to="/gaming/tournaments" className="text-xs font-extrabold text-rose-700 hover:underline inline-flex items-center gap-1">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {tournaments.length === 0 ? (
              <div className="p-12 text-center">
                <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <div className="text-sm font-extrabold text-slate-700">No tournaments scheduled</div>
                <Link to="/gaming/tournaments" className="mt-2 inline-block text-rose-600 font-extrabold hover:underline text-xs">
                  Create one →
                </Link>
              </div>
            ) : tournaments.map((t: any) => (
              <Link key={t.id} to="/gaming/tournaments" className="px-5 py-3 flex items-center gap-3 hover:bg-rose-50/40 transition">
                <div className="h-10 w-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <Trophy className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900">{t.name}</div>
                  <div className="text-[10px] text-slate-500 font-bold truncate">
                    {t.gameName} • {t.platform?.replace(/_/g, ' ')} • {t.currentParticipants}/{t.maxParticipants} players
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase font-extrabold text-slate-500">Prize pool</div>
                  <div className="font-extrabold text-rose-700 text-sm tabular-nums">{formatPKR(t.prizePool || 0)}</div>
                  <div className="text-[9px] font-bold text-slate-500">
                    {new Date(t.scheduledDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                  </div>
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
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
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
    violet: 'from-violet-500 to-fuchsia-700',
    emerald: 'from-emerald-500 to-teal-700',
    blue: 'from-blue-500 to-cyan-700',
    amber: 'from-amber-500 to-orange-700',
    rose: 'from-rose-500 to-red-700',
    fuchsia: 'from-fuchsia-500 to-pink-700',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white border-2 border-slate-200 hover:border-violet-300 hover:shadow-lg hover:-translate-y-0.5 transition-all p-3 sm:p-4 text-center">
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

function StreamCard({ label, icon: Icon, tone, today, month, extra }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-fuchsia-700 border-violet-300',
    amber: 'from-amber-500 to-orange-600 border-amber-300',
    blue: 'from-blue-500 to-cyan-700 border-blue-300',
  };
  const parts = tones[tone].split(' ');
  return (
    <div className={`rounded-3xl bg-gradient-to-br from-white to-slate-50 border-2 ${parts[2]} p-4 shadow-sm`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white bg-gradient-to-r ${parts[0]} ${parts[1]}`}>
          <Icon className="h-3 w-3" /> {label}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Today</div>
          <div className="text-base font-extrabold text-slate-900 tabular-nums leading-none mt-1">{formatPKR(today)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">This month</div>
          <div className="text-base font-extrabold text-emerald-700 tabular-nums leading-none mt-1">{formatPKR(month)}</div>
        </div>
      </div>
      <div className="mt-2 text-[10px] font-bold text-slate-500">{extra}</div>
    </div>
  );
}
