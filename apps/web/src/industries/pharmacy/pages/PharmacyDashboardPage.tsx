import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { Link as RLink } from 'react-router-dom';
import {
  Pill, AlertTriangle, Clock, RefreshCw, Thermometer, ShieldAlert,
  FileText, User, Snowflake, Package, TrendingUp, ArrowRight,
  CheckCircle2, Sparkles, Stethoscope, Beaker, Award, Bell,
  BarChart3, Calendar, ClipboardCheck, Ban, DollarSign,
} from 'lucide-react';
import { pharmacyDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { format, differenceInDays } from 'date-fns';

export default function PharmacyDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['pharmacy-dashboard'],
    queryFn: () => pharmacyDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const totals = overview?.totals ?? { medicines: 0, controlledCount: 0, coldChainCount: 0 };
  const rx = overview?.prescriptions ?? { pending: 0, verified: 0, dispensedToday: 0 };
  const alerts = overview?.alerts ?? { expiringSoon: 0, expired: 0, refillsDueToday: 0, recentTempBreaches: 0 };
  const topSelling = overview?.topSelling ?? [];
  const expiringList = overview?.expiringList ?? [];

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-teal-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Pharmacy Command Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              💊 Pharmacy Overview
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Prescriptions, expiry alerts, cold chain — sab kuch ek jagah
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
            <RLink to="/pharmacy/prescriptions/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <FileText className="h-4 w-4" />
                New Prescription
              </Button>
            </RLink>
          </div>
        </div>
      </section>

      {/* CRITICAL ALERTS */}
      {(alerts.expired > 0 || alerts.expiringSoon > 0 || alerts.recentTempBreaches > 0) && (
        <section className="rounded-3xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 text-white p-4 shadow-lg border-2 border-rose-300">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1 grid sm:grid-cols-3 gap-3">
              {alerts.expired > 0 && (
                <RLink to="/pharmacy/expiring" className="rounded-xl bg-white/10 hover:bg-white/20 p-3 transition">
                  <div className="text-xs uppercase font-extrabold text-white/90">🚨 Expired</div>
                  <div className="text-2xl font-extrabold tabular-nums">{alerts.expired}</div>
                  <div className="text-xs font-semibold text-white/80">batches with stock</div>
                </RLink>
              )}
              {alerts.expiringSoon > 0 && (
                <RLink to="/pharmacy/expiring" className="rounded-xl bg-white/10 hover:bg-white/20 p-3 transition">
                  <div className="text-xs uppercase font-extrabold text-white/90">⏳ Expiring Soon</div>
                  <div className="text-2xl font-extrabold tabular-nums">{alerts.expiringSoon}</div>
                  <div className="text-xs font-semibold text-white/80">within 30 days</div>
                </RLink>
              )}
              {alerts.recentTempBreaches > 0 && (
                <RLink to="/pharmacy/temperature-log" className="rounded-xl bg-white/10 hover:bg-white/20 p-3 transition">
                  <div className="text-xs uppercase font-extrabold text-white/90">🌡️ Temp Breaches</div>
                  <div className="text-2xl font-extrabold tabular-nums">{alerts.recentTempBreaches}</div>
                  <div className="text-xs font-semibold text-white/80">last 7 days</div>
                </RLink>
              )}
            </div>
          </div>
        </section>
      )}

      {/* KPI GRID */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Medicines" value={totals.medicines} icon={Pill} color="teal" />
        <KpiCard label="Controlled Drugs" value={totals.controlledCount} icon={ShieldAlert} color="rose" sub="Narcotic register req." />
        <KpiCard label="Cold Chain" value={totals.coldChainCount} icon={Snowflake} color="blue" sub="Refrigerated stock" />
        <KpiCard label="Refills Due" value={alerts.refillsDueToday} icon={Bell} color="amber" sub="Today" highlight={alerts.refillsDueToday > 0} />
      </section>

      {/* PRESCRIPTIONS */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-violet-600" />
              Prescriptions Workflow
            </h3>
            <p className="text-xs text-slate-500 font-semibold">Pending → Verified → Dispensed</p>
          </div>
          <RLink to="/pharmacy/prescriptions" className="text-xs font-extrabold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1">
            View All <ArrowRight className="h-3 w-3" />
          </RLink>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <RLink to="/pharmacy/prescriptions?status=PENDING" className="rounded-2xl bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-200 dark:border-blue-800 p-4 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-blue-700">Pending Review</div>
                <div className="text-3xl font-extrabold text-blue-700 tabular-nums mt-1">{rx.pending}</div>
                <div className="text-xs text-blue-600 font-semibold mt-1">Needs pharmacist verify</div>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </RLink>
          <RLink to="/pharmacy/prescriptions?status=VERIFIED" className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 p-4 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-emerald-700">Ready to Dispense</div>
                <div className="text-3xl font-extrabold text-emerald-700 tabular-nums mt-1">{rx.verified}</div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">Verified prescriptions</div>
              </div>
              <ClipboardCheck className="h-8 w-8 text-emerald-400" />
            </div>
          </RLink>
          <div className="rounded-2xl bg-violet-50 dark:bg-violet-950/40 border-2 border-violet-200 dark:border-violet-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-violet-700">Dispensed Today</div>
                <div className="text-3xl font-extrabold text-violet-700 tabular-nums mt-1">{rx.dispensedToday}</div>
                <div className="text-xs text-violet-600 font-semibold mt-1">Successfully filled</div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-violet-400" />
            </div>
          </div>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/pharmacy/prescriptions" icon={FileText} label="Prescriptions" color="violet" />
        <QuickLink to="/pharmacy/medicines" icon={Pill} label="Medicines" color="teal" />
        <QuickLink to="/pharmacy/salts" icon={Beaker} label="Salts" color="cyan" />
        <QuickLink to="/pharmacy/doctors" icon={Stethoscope} label="Doctors" color="emerald" />
        <QuickLink to="/pharmacy/expiring" icon={Clock} label="Expiring" color="rose" />
        <QuickLink to="/pharmacy/controlled-log" icon={ShieldAlert} label="Narcotic Log" color="red" />
        <QuickLink to="/pharmacy/refill-reminders" icon={Bell} label="Refills" color="amber" />
        <QuickLink to="/pharmacy/temperature-log" icon={Thermometer} label="Cold Chain" color="blue" />
      </section>

      {/* TWO COLUMN */}
      <section className="grid lg:grid-cols-2 gap-6">
        {/* TOP SELLING */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">🏆 Top Selling Today</h3>
              <p className="text-xs text-slate-500 font-semibold">Best sellers by revenue</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {topSelling.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">No sales yet today</div>
            ) : (
              topSelling.map((s: any, i: number) => (
                <div key={s.productId} className="px-6 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0">
                    {i + 1}
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                    {s.product?.images?.[0]?.url ? (
                      <img src={s.product.images[0].url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Pill className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate text-slate-900 dark:text-white">{s.product?.name}</div>
                    {s.product?.productSalts?.[0] && (
                      <div className="text-[10px] text-slate-500 font-semibold truncate">
                        {s.product.productSalts[0].salt?.name} {s.product.productSalts[0].strength}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(s._sum?.total ?? 0)}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">{s._sum?.quantity} units</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* EXPIRING SOON */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                Expiring Batches
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Within next 30 days</p>
            </div>
            <RLink to="/pharmacy/expiring" className="text-xs font-extrabold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1">
              Full List <ArrowRight className="h-3 w-3" />
            </RLink>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-[400px] overflow-y-auto">
            {expiringList.length === 0 ? (
              <div className="p-12 text-center text-sm text-emerald-700 font-extrabold">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
                All batches safe — nothing expiring soon
              </div>
            ) : (
              expiringList.map((b: any) => {
                const daysLeft = differenceInDays(new Date(b.expiryDate), new Date());
                const critical = daysLeft <= 7;
                const warn = daysLeft <= 15;
                return (
                  <div key={b.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                      {b.product?.images?.[0]?.url ? (
                        <img src={b.product.images[0].url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Pill className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm truncate text-slate-900 dark:text-white">{b.product?.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono font-bold">
                        Batch: {b.batchNumber} • Qty: {b.quantity}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={
                        'text-xs font-extrabold ' +
                        (critical ? 'text-rose-700' : warn ? 'text-amber-700' : 'text-slate-700')
                      }>
                        {daysLeft <= 0 ? 'EXPIRED' : daysLeft + ' days'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        {format(new Date(b.expiryDate), 'dd MMM yyyy')}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color, highlight }: any) {
  const colors: Record<string, string> = {
    teal: 'from-teal-500 to-cyan-600 shadow-teal-500/30',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
  };
  return (
    <div className={
      'rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ' +
      (highlight
        ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-amber-300 dark:border-amber-800 animate-pulse'
        : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800')
    }>
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

function QuickLink({ to, icon: Icon, label, color }: any) {
  const colors: Record<string, string> = {
    violet: 'from-violet-500 to-purple-600',
    teal: 'from-teal-500 to-cyan-600',
    cyan: 'from-cyan-500 to-blue-600',
    emerald: 'from-emerald-500 to-green-600',
    rose: 'from-rose-500 to-red-600',
    red: 'from-red-500 to-rose-700',
    amber: 'from-amber-500 to-yellow-600',
    blue: 'from-blue-500 to-blue-700',
  };
  return (
    <RLink
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
    </RLink>
  );
}
