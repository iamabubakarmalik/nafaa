import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Shirt, Scissors, Ruler, Calendar, Sparkles, RefreshCw, TrendingUp,
  Package, DollarSign, Clock, ArrowRight, Award, Users, Star,
  ShoppingBag, Zap, CreditCard, AlertCircle, CheckCircle2, Palette,
} from 'lucide-react';
import { garmentsDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
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

export default function GarmentsDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['garments-dashboard'],
    queryFn: () => garmentsDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const totals = overview?.totals ?? { totalCollections: 0, activeCollections: 0, totalMeasurements: 0, newArrivals: 0, bestSellers: 0, onSaleCount: 0 };
  const pending = overview?.pending ?? { tailoring: 0, alterations: 0, reservations: 0, layaway: 0 };
  const tailoringRevenue = overview?.tailoringRevenue ?? { total: 0, paid: 0, count: 0 };
  const upcomingDeliveries = overview?.upcomingDeliveries ?? [];
  const upcomingAlterations = overview?.upcomingAlterations ?? [];
  const bySeason = overview?.bySeason ?? [];
  const byGender = overview?.byGender ?? [];

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-fuchsia-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Boutique Command Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              👗 Garments Dashboard
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Collections, tailoring, alterations — poori boutique ek jagah
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
            <Link to="/garments/tailoring/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Scissors className="h-4 w-4" />
                New Tailoring Order
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* PENDING ALERTS */}
      {(pending.tailoring > 0 || pending.alterations > 0 || pending.reservations > 0 || pending.layaway > 0) && (
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <PendingCard label="Tailoring" value={pending.tailoring} icon={Scissors} to="/garments/tailoring" color="pink" sub="In progress" />
          <PendingCard label="Alterations" value={pending.alterations} icon={Ruler} to="/garments/alterations" color="amber" sub="Waiting" />
          <PendingCard label="Reservations" value={pending.reservations} icon={Clock} to="/garments/reservations" color="blue" sub="Active holds" />
          <PendingCard label="Layaway Plans" value={pending.layaway} icon={CreditCard} to="/garments/layaway" color="emerald" sub="Active" />
        </section>
      )}

      {/* KPI GRID */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Collections" value={totals.activeCollections} sub={'/ ' + totals.totalCollections + ' total'} icon={Palette} color="fuchsia" />
        <KpiCard label="Customer Measurements" value={totals.totalMeasurements} sub="On file" icon={Ruler} color="pink" />
        <KpiCard label="New Arrivals" value={totals.newArrivals} sub="Fresh stock" icon={Sparkles} color="amber" />
        <KpiCard label="Best Sellers" value={totals.bestSellers} sub="Top performers" icon={TrendingUp} color="emerald" />
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
            <div className="text-xs text-white/60 font-semibold mt-1">{tailoringRevenue.count} delivered orders</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Amount Collected</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums text-cyan-300">{formatPKR(tailoringRevenue.paid)}</div>
            <div className="text-xs text-white/60 font-semibold mt-1">Cash + digital</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Outstanding</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums text-amber-300">
              {formatPKR(tailoringRevenue.total - tailoringRevenue.paid)}
            </div>
            <div className="text-xs text-white/60 font-semibold mt-1">Still to collect</div>
          </div>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/garments/collections" icon={Palette} label="Collections" color="fuchsia" />
        <QuickLink to="/garments/products" icon={Shirt} label="Products" color="pink" />
        <QuickLink to="/garments/measurements" icon={Ruler} label="Measurements" color="rose" />
        <QuickLink to="/garments/tailoring" icon={Scissors} label="Tailoring" color="violet" />
        <QuickLink to="/garments/alterations" icon={Ruler} label="Alterations" color="amber" />
        <QuickLink to="/garments/reservations" icon={Clock} label="Reservations" color="blue" />
        <QuickLink to="/garments/layaway" icon={CreditCard} label="Layaway" color="emerald" />
        <QuickLink to="/garments/size-charts" icon={Package} label="Size Charts" color="cyan" />
      </section>

      {/* TWO COLUMN — Upcoming */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scissors className="h-5 w-5 text-pink-600" />
                Upcoming Tailoring Deliveries
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Next 7 days</p>
            </div>
            <Link to="/garments/tailoring" className="text-xs font-extrabold text-pink-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {upcomingDeliveries.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                No pending deliveries
              </div>
            ) : (
              upcomingDeliveries.map((o: any) => {
                const daysLeft = o.promisedDate ? differenceInDays(new Date(o.promisedDate), new Date()) : null;
                return (
                  <Link key={o.id} to={'/garments/tailoring/' + o.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white flex items-center justify-center shrink-0">
                      <Scissors className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">{o.orderNumber}</span>
                        <span className={
                          'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' +
                          (o.priority === 'URGENT' ? 'bg-red-600 animate-pulse' : o.priority === 'HIGH' ? 'bg-amber-500' : 'bg-slate-500')
                        }>
                          {o.priority}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-semibold">{o.customerName || 'Walk-in'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      {daysLeft !== null && (
                        <div className={
                          'text-xs font-extrabold ' +
                          (daysLeft <= 0 ? 'text-rose-700' : daysLeft <= 2 ? 'text-amber-700' : 'text-slate-700')
                        }>
                          {daysLeft <= 0 ? 'OVERDUE' : daysLeft + ' days'}
                        </div>
                      )}
                      <div className="text-[10px] font-bold text-slate-500">{formatPKR(o.total)}</div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Ruler className="h-5 w-5 text-amber-600" />
                Upcoming Alterations
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Ready pickup coming up</p>
            </div>
            <Link to="/garments/alterations" className="text-xs font-extrabold text-amber-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {upcomingAlterations.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                No pending alterations
              </div>
            ) : (
              upcomingAlterations.map((a: any) => {
                const daysLeft = a.promisedDate ? differenceInDays(new Date(a.promisedDate), new Date()) : null;
                return (
                  <Link key={a.id} to={'/garments/alterations/' + a.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0">
                      <Ruler className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">{a.ticketNumber}</div>
                      <div className="text-xs text-slate-500 font-semibold truncate">{a.garmentDescription}</div>
                    </div>
                    <div className="text-right shrink-0">
                      {daysLeft !== null && (
                        <div className={
                          'text-xs font-extrabold ' +
                          (daysLeft <= 0 ? 'text-rose-700' : daysLeft <= 2 ? 'text-amber-700' : 'text-slate-700')
                        }>
                          {daysLeft <= 0 ? 'OVERDUE' : daysLeft + ' days'}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* BY SEASON + BY GENDER */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-fuchsia-600" />
            Products by Season
          </h3>
          {bySeason.length === 0 ? (
            <p className="text-sm text-slate-500 font-semibold text-center py-8">No data yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {bySeason.map((s: any) => (
                <div key={s.season} className="rounded-xl bg-slate-50 dark:bg-neutral-800/50 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-2xl">{SEASON_EMOJI[s.season] || '👗'}</div>
                    <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300 mt-1">
                      {s.season.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{s._count._all}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-pink-600" />
            Products by Gender
          </h3>
          {byGender.length === 0 ? (
            <p className="text-sm text-slate-500 font-semibold text-center py-8">No data yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {byGender.map((g: any) => (
                <div key={g.gender ?? 'unknown'} className="rounded-xl bg-slate-50 dark:bg-neutral-800/50 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-2xl">{GENDER_EMOJI[g.gender] || '👤'}</div>
                    <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300 mt-1">
                      {g.gender || 'Unknown'}
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{g._count._all}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    fuchsia: 'from-fuchsia-500 to-pink-600 shadow-fuchsia-500/30',
    pink: 'from-pink-500 to-rose-600 shadow-pink-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
          {sub && <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">{sub}</div>}
        </div>
        <div className={
          'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] +
          ' text-white flex items-center justify-center shadow-lg shrink-0'
        }>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function PendingCard({ label, value, sub, icon: Icon, to, color }: any) {
  const colors: Record<string, string> = {
    pink: 'from-pink-500 to-rose-600',
    amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-cyan-600',
    emerald: 'from-emerald-500 to-green-600',
  };
  return (
    <Link
      to={to}
      className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 hover:shadow-lg hover:-translate-y-0.5 transition"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
          <div className="text-xs text-slate-500 font-semibold">{sub}</div>
        </div>
        <div className={
          'h-10 w-10 rounded-xl bg-gradient-to-br ' + colors[color] +
          ' text-white flex items-center justify-center shadow group-hover:scale-110 transition-transform'
        }>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

function QuickLink({ to, icon: Icon, label, color }: any) {
  const colors: Record<string, string> = {
    fuchsia: 'from-fuchsia-500 to-pink-600',
    pink: 'from-pink-500 to-rose-600',
    rose: 'from-rose-500 to-red-600',
    violet: 'from-violet-500 to-purple-600',
    amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-cyan-600',
    emerald: 'from-emerald-500 to-green-600',
    cyan: 'from-cyan-500 to-blue-600',
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
