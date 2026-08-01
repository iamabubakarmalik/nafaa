import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Baby, TrendingUp, DollarSign, Package, Cake, Gift, ShieldAlert,
  RefreshCw, ArrowRight, AlertTriangle, Plus, ShoppingCart,
  BarChart3, Star, Users, Sparkles, Award, Battery,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toystoreDashboardApi } from '../api/dashboard.api';
import { toyBirthdaysApi } from '../api/birthday-reminders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

const AGE_LABELS: Record<string, string> = {
  NEWBORN_0_6M: '0-6M', INFANT_6_12M: '6-12M', TODDLER_1_2Y: '1-2Y',
  TODDLER_2_3Y: '2-3Y', PRESCHOOL_3_5Y: '3-5Y', KIDS_5_8Y: '5-8Y',
  KIDS_8_12Y: '8-12Y', TWEEN_12_14Y: '12-14Y', TEEN_14_PLUS: '14+', ALL_AGES: 'All',
};

export default function ToystoreDashboardPage() {
  const hideCost = useCostHidden();

  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['toystore-dashboard-overview'],
    queryFn: () => toystoreDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const { data: birthdaySummary } = useQuery({
    queryKey: ['toy-birthday-summary'],
    queryFn: () => toyBirthdaysApi.summary(),
  });

  const totals = overview?.totals ?? {};
  const alerts = overview?.alerts ?? {};
  const upcomingBirthdays = overview?.upcomingBirthdays ?? [];
  const topProducts = overview?.topProducts ?? [];
  const topGiftPacks = overview?.topGiftPacks ?? [];
  const byAgeGroup = overview?.byAgeGroup ?? [];
  const byGender = overview?.byGender ?? [];

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-rose-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Baby className="h-3.5 w-3.5 text-amber-300" /> Toy Store
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🧸 Toy Store Dashboard</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Age-smart catalogue, birthday engine, gift packs, safety compliance
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <PrivacyToggle />
            <Link to="/toystore/gift-finder">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Sparkles className="h-4 w-4" /> Gift Finder
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <HeroTile icon={Package} label="Toys" value={totals.totalProducts ?? 0} sub={`${totals.educationalCount ?? 0} educational`} tone="pink" />
          <HeroTile icon={DollarSign} label="Lifetime Revenue" value={formatPKR(totals.lifetimeRevenue ?? 0)} sub={`${totals.lifetimeUnitsSold ?? 0} sold`} tone="emerald" />
          <HeroTile icon={Cake} label="Birthdays" value={totals.birthdaysRegistered ?? 0} sub={`${alerts.birthdaysThisWeek ?? 0} this week`} tone="amber" />
          <HeroTile icon={Gift} label="Gift Packs" value={totals.activeGiftPacks ?? 0} sub={`${totals.giftPacksSold ?? 0} sold`} tone="violet" />
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        <QuickAction to="/pos" icon={ShoppingCart} label="POS" tone="pink" />
        <QuickAction to="/toystore/gift-finder" icon={Sparkles} label="Gift Finder" tone="violet" />
        <QuickAction to="/toystore/birthdays" icon={Cake} label="Birthdays" tone="amber" />
        <QuickAction to="/toystore/gift-packs" icon={Gift} label="Gift Packs" tone="rose" />
        <QuickAction to="/toystore/safety-review" icon={ShieldAlert} label="Safety" tone="emerald" />
        <QuickAction to="/toy-products/new" icon={Plus} label="Add Toy" tone="blue" />
      </section>

      {/* ALERTS */}
      {(alerts.safetyIssues > 0 || alerts.batteryUpsellOpportunities > 0 || alerts.birthdaysThisWeek > 0) && (
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.birthdaysThisWeek > 0 && (
              <AlertCard to="/toystore/birthdays" icon={Cake}
                title={`${alerts.birthdaysThisWeek} birthdays this week`} desc="Send reminders + gift suggestions" tone="pink" />
            )}
            {alerts.safetyIssues > 0 && (
              <AlertCard to="/toystore/safety-review" icon={ShieldAlert}
                title={`${alerts.safetyIssues} safety issues`} desc="Missing certs or hazard flags" tone="rose" />
            )}
            {alerts.batteryUpsellOpportunities > 0 && (
              <AlertCard to="/toy-products?filter=battery" icon={Battery}
                title={`${alerts.batteryUpsellOpportunities} battery upsell`} desc="Toys without batteries — extra sale opportunity" tone="amber" />
            )}
          </div>
        </section>
      )}

      {/* UPCOMING BIRTHDAYS */}
      <section className="rounded-3xl bg-white border-2 border-pink-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-pink-100 bg-gradient-to-r from-pink-50 to-rose-50 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-700 text-white flex items-center justify-center shadow-md">
              <Cake className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 inline-flex items-center gap-2">
                Upcoming Birthdays
                {upcomingBirthdays.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-500 text-white text-[9px] font-extrabold uppercase">
                    {upcomingBirthdays.length} in 30 days
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-bold">Repeat-customer engine</p>
            </div>
          </div>
          <Link to="/toystore/birthdays" className="text-xs font-extrabold text-pink-700 hover:underline inline-flex items-center gap-1">
            Manage all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {upcomingBirthdays.length === 0 ? (
          <div className="p-10 text-center">
            <Cake className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <div className="font-extrabold text-slate-700">No birthdays registered yet</div>
            <Link to="/toystore/birthdays">
              <Button className="mt-4 bg-gradient-to-r from-pink-600 to-rose-700">
                <Plus className="h-4 w-4" /> Register First Birthday
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {upcomingBirthdays.map((b: any) => (
              <Link key={b.id} to={`/toystore/birthdays/${b.id}`}
                className="px-5 py-3 flex items-center gap-3 hover:bg-pink-50/50 transition group">
                <div className={['h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 font-extrabold text-white',
                  b.daysUntil <= 3 ? 'bg-rose-500' :
                  b.daysUntil <= 7 ? 'bg-amber-500' : 'bg-pink-500'].join(' ')}>
                  {b.daysUntil === 0 ? '🎉' : b.daysUntil}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 text-sm truncate group-hover:text-pink-700">
                    {b.childName} <span className="text-xs text-slate-500 font-bold">turning {b.turningAge}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-bold">
                    {b.customerName} • {b.customerPhone}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={['text-xs font-extrabold uppercase',
                    b.daysUntil <= 3 ? 'text-rose-700' :
                    b.daysUntil <= 7 ? 'text-amber-700' : 'text-pink-700'].join(' ')}>
                    {b.daysUntil === 0 ? 'Today!' : b.daysUntil === 1 ? 'Tomorrow' : `${b.daysUntil} days`}
                  </div>
                  {b.budgetRange && <div className="text-[10px] font-bold text-slate-500">Budget: {b.budgetRange}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CHARTS */}
      <section className="grid lg:grid-cols-[1fr_1fr] gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Sales by Age Group</h3>
              <p className="text-xs text-slate-500 font-bold">Where the revenue comes from</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          {byAgeGroup.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byAgeGroup.map((a: any) => ({ ...a, label: AGE_LABELS[a.ageGroup] || a.ageGroup }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#ec4899" radius={[8, 8, 0, 0]} />
                </BarChart>
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
              <h3 className="text-lg font-extrabold text-slate-900">Gender Split</h3>
              <p className="text-xs text-slate-500 font-bold">Catalogue distribution</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <Users className="h-5 w-5" />
            </div>
          </div>
          {byGender.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byGender} cx="50%" cy="45%" outerRadius={90} innerRadius={50}
                    dataKey="count" nameKey="gender"
                    label={(entry: any) => `${entry.gender}: ${entry.count}`}
                    labelLine={false}>
                    {byGender.map((_: any, i: number) => (
                      <Cell key={i} fill={['#8b5cf6', '#3b82f6', '#ec4899'][i % 3]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex flex-col items-center justify-center gap-2">
              <Users className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">No data yet</p>
            </div>
          )}
        </div>
      </section>

      {/* TOP PRODUCTS + GIFT PACKS */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-pink-50 to-rose-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-700 text-white flex items-center justify-center shadow-md">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">🏆 Top Toys</h3>
              <p className="text-xs text-slate-500 font-bold">By units sold</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {topProducts.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">No sales yet</div>
            ) : topProducts.slice(0, 8).map((p: any, i: number) => (
              <Link key={p.id} to={p.productId ? `/toy-products/${p.productId}` : '/toy-products'}
                className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition group">
                <div className={`h-8 w-8 rounded-lg text-white flex items-center justify-center font-extrabold text-xs shrink-0 ${
                  i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-slate-300'
                }`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900 group-hover:text-pink-700">
                    {p.product?.name || p.brand || 'Toy'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {p.totalSold ?? 0} sold • {AGE_LABELS[p.ageGroup] || p.ageGroup}
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
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">🎁 Top Gift Packs</h3>
              <p className="text-xs text-slate-500 font-bold">Bundle bestsellers</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {topGiftPacks.length === 0 ? (
              <div className="p-12 text-center">
                <Gift className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <div className="text-sm font-extrabold text-slate-700">No gift packs yet</div>
                <Link to="/toystore/gift-packs/new" className="mt-2 inline-block text-violet-600 font-extrabold hover:underline text-xs">
                  Create one →
                </Link>
              </div>
            ) : topGiftPacks.map((g: any) => (
              <Link key={g.id} to={`/toystore/gift-packs/${g.id}/edit`}
                className="px-5 py-3 flex items-center gap-3 hover:bg-violet-50/40 transition">
                <div className="h-11 w-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                  <Gift className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900">{g.name}</div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {g.itemCount} items • {g.totalSold ?? 0} sold • Save {Number(g.savingsPct || 0).toFixed(0)}%
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-violet-700 text-sm tabular-nums">{formatPKR(g.giftPackPrice)}</div>
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
    pink: 'from-pink-400/30 to-pink-600/20 border-pink-300/40',
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
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
    pink: 'from-pink-500 to-rose-700',
    violet: 'from-violet-500 to-purple-700',
    amber: 'from-amber-500 to-orange-700',
    rose: 'from-rose-500 to-red-700',
    emerald: 'from-emerald-500 to-teal-700',
    blue: 'from-blue-500 to-cyan-700',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white border-2 border-slate-200 hover:border-pink-300 hover:shadow-lg hover:-translate-y-0.5 transition-all p-3 sm:p-4 text-center">
      <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md mx-auto mb-2 group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="text-xs sm:text-sm font-extrabold text-slate-900">{label}</div>
    </Link>
  );
}

function AlertCard({ to, icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-500 to-rose-700|bg-pink-50 border-pink-200',
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
