/**
 * Today at a glance, on the accent color: sales so far, how the day built
 * up hour by hour, progress to the daily target and the cash/online split.
 */

import { useMemo, type ReactNode } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Target } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { useDayReport, useHourlySales, useOverview } from '../data/queries';
import { ProgressRing } from '../engine/charts';
import { fmtQty, hourLabel } from '../engine/parts';
import { MASK, useMasked } from '../engine/useMasked';
import { useDashboardContext } from '../engine/useDashboardLayout';

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/10 px-3 py-2 ring-1 ring-inset ring-white/15">
      <div className="truncate text-[0.6875rem] font-medium uppercase tracking-wide text-white/70">{label}</div>
      <div className="mt-0.5 truncate text-[0.9375rem] font-semibold tabular-nums text-white">{value}</div>
    </div>
  );
}

export function TodayHero() {
  const { data: o } = useOverview();
  const { data: day } = useDayReport();
  const { data: hourly } = useHourlySales(1);
  const { target, openCustomize } = useDashboardContext();
  const { sales, salesHidden } = useMasked();
  const s = o?.stats;
  const today = s?.salesToday ?? 0;
  const yesterday = s?.salesYesterday ?? 0;
  const change = yesterday > 0 ? ((today - yesterday) / yesterday) * 100 : 0;

  const curve = useMemo(() => {
    const now = hourly?.currentHour ?? 23;
    let running = 0;
    return (hourly?.hours ?? [])
      .filter((h) => h.hour <= now)
      .map((h) => ({ hour: h.hour, label: hourLabel(h.hour), total: (running += h.total) }))
      .filter((p, i, all) => p.total > 0 || all.slice(i).some((x) => x.total > 0));
  }, [hourly]);

  const cash = day?.cashCollected ?? 0;
  const online = day?.onlineCollected ?? 0;
  const cashPct = cash + online > 0 ? (cash / (cash + online)) * 100 : 0;
  const progress = target > 0 ? today / target : 0;
  const dateLine = new Intl.DateTimeFormat('en-PK', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-5 text-white shadow-lg sm:p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 -z-10 h-72 w-72 rounded-full bg-black/10 blur-3xl" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-medium text-white/75">Aaj ki sale · {dateLine}</p>
          <div className="mt-1 truncate text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">{sales(today)}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.8125rem]">
            {!salesHidden && change !== 0 && (
              <span className={cn('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold', change > 0 ? 'bg-white/20' : 'bg-black/20')}>
                {change > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {Math.abs(change).toFixed(1)}%
              </span>
            )}
            <span className="text-white/75">kal poore din: {sales(yesterday)}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            <Stat label="Bill" value={s?.ordersToday ?? 0} />
            <Stat label="Ausat" value={sales(s?.aovToday)} />
            <Stat label="Items" value={fmtQty(day?.sales.itemsSold ?? 0)} />
            <Stat label="Udhaar diya" value={sales(day?.sales.credit)} />
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between text-[0.75rem] text-white/75">
            <span>Din bhar ka safar</span>
            {hourly?.peakHour != null && <span>Rush: {hourLabel(hourly.peakHour)}</span>}
          </div>
          <div className="h-32 sm:h-36">
            {salesHidden || curve.length < 2 ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/25 text-[0.8125rem] text-white/70">
                {salesHidden ? 'Sale chhupi hui hai' : 'Pehli sale ke baad yahan graph banega'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={curve} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fff" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#fff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" hide />
                  <Tooltip
                    formatter={(v) => [formatPKR(Number(v)), 'Ab tak']}
                    contentStyle={{ borderRadius: 10, border: 'none', background: 'rgba(15,23,42,0.92)', color: '#fff', fontSize: 12 }}
                    labelStyle={{ color: '#cbd5e1' }}
                    cursor={{ stroke: 'rgba(255,255,255,0.4)' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#fff" strokeWidth={2.25} fill="url(#hero-fill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[0.75rem] text-white/80">
              <span>Cash {salesHidden ? MASK : formatPKR(cash)}</span>
              <span>Online {salesHidden ? MASK : formatPKR(online)}</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full bg-white transition-all" style={{ width: `${cashPct}%` }} />
            </div>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          {target > 0 ? (
            <button type="button" onClick={() => openCustomize('target')} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" title="Target badlein">
              <ProgressRing value={progress} size={140} stroke={11} className="text-white">
                <span className="text-2xl font-bold tabular-nums">{salesHidden ? MASK : `${Math.round(progress * 100)}%`}</span>
                <span className="text-[0.6875rem] text-white/75">target ka</span>
                {!salesHidden && (
                  <span className="mt-0.5 text-[0.6875rem] font-medium text-white/90">
                    {today >= target ? 'Poora ho gaya!' : `${formatPKR(target - today)} baqi`}
                  </span>
                )}
              </ProgressRing>
            </button>
          ) : (
            <button type="button" onClick={() => openCustomize('target')}
              className="flex h-[140px] w-[140px] flex-col items-center justify-center gap-1.5 rounded-full border-2 border-dashed border-white/40 text-center text-[0.8125rem] text-white/85 transition hover:bg-white/10">
              <Target className="h-5 w-5" />
              Rozana target<br />set karein
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
