/**
 * The four views of Branch analytics: side-by-side bars with each branch's
 * share, the daily trend, busy hours, and the full table. Every chart colours
 * a branch the same way (see `hueAt`) and carries direct labels or a legend.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Crown, Star } from 'lucide-react';
import { Card } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { axisMoney, hourLabel, hourTick } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { BranchComparison, BranchFigures, ShopAnalytics } from '../api/shops.api';
import { SHOP_TYPES, dayShort } from './meta';

export type Metric = 'net' | 'netProfit' | 'bills';

export const METRICS: Record<Metric, { label: string; money: boolean }> = {
  net: { label: 'Sale', money: true },
  netProfit: { label: 'Net profit', money: true },
  bills: { label: 'Bill', money: false },
};

interface Fmt {
  money: (n: number) => string;
  cost: (n: number | undefined) => string;
}

const valueOf = (s: BranchFigures, m: Metric) => (m === 'net' ? s.net : m === 'bills' ? s.bills : s.netProfit ?? 0);
const prevOf = (s: BranchFigures, m: Metric) => (m === 'net' ? s.prev.net : m === 'bills' ? s.prev.bills : s.prev.netProfit);
const short = (name: string, n = 14) => (name.length > n ? `${name.slice(0, n)}…` : name);

export function CompareView({ data, metric, hue, fmt, live }: {
  data: BranchComparison; metric: Metric; hue: (id: string) => string; fmt: Fmt; live?: ShopAnalytics;
}) {
  const theme = useChartTheme();
  const show = (v: number) => (metric === 'bills' ? String(v) : metric === 'netProfit' ? fmt.cost(v) : fmt.money(v));
  const rows = [...data.shops].sort((a, b) => valueOf(b, metric) - valueOf(a, metric))
    .map((s) => ({ id: s.id, name: short(s.name), now: valueOf(s, metric), before: prevOf(s, metric) }));
  const share = [...data.shops].sort((a, b) => b.share - a.share).map((s) => ({ id: s.id, name: short(s.name, 16), share: s.share, net: s.net }));
  const best = [...data.shops].sort((a, b) => b.net - a.net)[0];
  const hidden = metric === 'netProfit' && data.costHidden;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl" title={`${METRICS[metric].label} — branch war`} description={`Is period ka pichhli barabar period (${dayShort(data.previous.from)} — ${dayShort(data.previous.to)}) se muqabla`}>
        {hidden ? <Note text='Profit dekhne ke liye "Cost dekhna" ki permission chahiye.' /> : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: Math.max(rows.length * 120, 480), height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 24, right: 8, left: 0, bottom: 0 }} barGap={4}>
                  <CartesianGrid vertical={false} stroke={theme.grid} />
                  <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tickFormatter={metric === 'bills' ? undefined : axisMoney} allowDecimals={false} width={48} tick={theme.axis} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v, n) => [show(Number(v)), n === 'now' ? 'Is period' : 'Pichhli period']} {...theme.tooltip} />
                  <Bar dataKey="before" name="before" fill={theme.isDark ? '#334155' : '#cbd5e1'} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="now" name="now" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {rows.map((r) => <Cell key={r.id} fill={hue(r.id)} />)}
                    <LabelList dataKey="now" position="top" formatter={(v: unknown) => (Number(v) ? (metric === 'bills' ? String(v) : axisMoney(Number(v))) : '')} style={{ fontSize: 10, fontWeight: 600, fill: theme.axis.fill }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[0.75rem] text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-600" />Is period (branch ka rang)</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300" />Pichhli period</span>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="rounded-2xl" title="Sale me hissa" description="Total sale me har branch kitna la rahi hai">
          {!share.some((s) => s.net) ? <Note text="Is period me koi sale nahi" /> : (
            <div style={{ height: Math.max(share.length * 40 + 20, 120) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={share} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="name" width={110} tick={theme.axis} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(_v, _n, item) => [`${(item?.payload as { share: number }).share}% · ${fmt.money((item?.payload as { net: number }).net)}`, 'Hissa']} {...theme.tooltip} />
                  <Bar dataKey="share" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {share.map((s) => <Cell key={s.id} fill={hue(s.id)} />)}
                    <LabelList dataKey="share" position="right" formatter={(v: unknown) => `${v}%`} style={{ fontSize: 11, fontWeight: 600, fill: theme.axis.fill }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          {best && best.net > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white p-4 ring-1 ring-amber-200">
              <p className="flex items-center gap-2 text-[0.75rem] font-semibold text-amber-800"><Crown className="h-4 w-4" />Sab se aage</p>
              <p className="mt-1 truncate text-lg font-bold text-slate-900">{best.name}</p>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-[0.75rem]">
                <div><dt className="text-slate-500">Sale</dt><dd className="font-semibold tabular-nums text-slate-900">{fmt.money(best.net)}</dd></div>
                <div><dt className="text-slate-500">Hissa</dt><dd className="font-semibold tabular-nums text-slate-900">{best.share.toFixed(0)}%</dd></div>
                <div><dt className="text-slate-500">Net profit</dt><dd className="font-semibold tabular-nums text-slate-900">{fmt.cost(best.netProfit)}</dd></div>
              </dl>
            </div>
          )}
          {live && (
            <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />Aaj tawajjo chahiye</span>}>
              {live.needsAttention.length === 0 ? <p className="text-[0.8125rem] text-emerald-700">Sab branches theek chal rahi hain.</p> : (
                <ul className="space-y-2">
                  {live.needsAttention.map((n) => (
                    <li key={n.shopId} className="flex items-start gap-2">
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: hue(n.shopId) }} />
                      <div className="min-w-0"><p className="text-[0.8125rem] font-semibold text-slate-900">{n.name}</p><p className="text-[0.75rem] text-amber-800">{n.reasons.join(' · ')}</p></div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export function TrendView({ data, hue, fmt }: { data: BranchComparison; hue: (id: string) => string; fmt: Fmt }) {
  const theme = useChartTheme();
  const rows = data.trend.map((r) => ({ ...r, label: dayShort(String(r.day)) }));
  return (
    <Card className="rounded-2xl" title="Roz ki sale — har branch" description="Return ghata kar, karobari din ke hisaab se">
      {data.range.days < 2 ? <Note text="Trend ke liye kam se kam 2 din chunein" /> : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={theme.grid} />
              <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tickFormatter={axisMoney} width={48} tick={theme.axis} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, n) => [fmt.money(Number(v)), String(n)]} {...theme.tooltip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {data.shops.map((s) => <Line key={s.id} type="monotone" dataKey={s.id} name={s.name} stroke={hue(s.id)} strokeWidth={2} dot={data.range.days <= 14} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export function HoursView({ data, hue }: { data: BranchComparison; hue: (id: string) => string }) {
  const theme = useChartTheme();
  const rows = data.hours.filter((h) => data.shops.some((s) => h[s.id] > 0) || (h.hour >= 9 && h.hour <= 22));
  const peak = data.shops.map((s) => {
    const top = [...data.hours].sort((a, b) => b[s.id] - a[s.id])[0];
    return { id: s.id, name: s.name, hour: top && top[s.id] > 0 ? top.hour : null };
  });
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl" title="Rush time" description="Kis ghante kitne bill bane — branches milakar, rang branch ka">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={theme.grid} />
              <XAxis dataKey="hour" tickFormatter={(h) => hourTick(Number(h))} tick={theme.axis} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} width={32} tick={theme.axis} axisLine={false} tickLine={false} />
              <Tooltip labelFormatter={(h) => hourLabel(Number(h))} formatter={(v, n) => [`${v} bill`, String(n)]} {...theme.tooltip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {data.shops.map((s, i) => <Bar key={s.id} dataKey={s.id} name={s.name} stackId="h" fill={hue(s.id)} maxBarSize={26} radius={i === data.shops.length - 1 ? [4, 4, 0, 0] : undefined} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {peak.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/80">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: hue(p.id) }} />
            <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-slate-800">{p.name}</span>
            <span className="text-[0.8125rem] text-slate-500">{p.hour == null ? 'Koi bill nahi' : <>Rush <b className="text-slate-900">{hourLabel(p.hour)}</b></>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FiguresTable({ data, hue, fmt }: { data: BranchComparison; hue: (id: string) => string; fmt: Fmt }) {
  const t = data.totals;
  const head = ['Branch', 'Bill', 'Sale', 'Return', 'Discount', 'Haath aaya', 'Udhaar', 'Ausat bill', 'Profit', 'Expenses', 'Nuqsan', 'Net profit', 'Hissa', 'Pichhli se'];
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] text-[0.8125rem]">
          <thead className="bg-slate-50/70 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
            <tr>{head.map((h, i) => <th key={h} className={cn('px-3 py-2.5', i === 0 ? 'pl-5 text-left' : 'text-right')}>{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.shops.map((s) => {
              const T = SHOP_TYPES[s.type];
              return (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 pl-5 pr-3">
                    <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: hue(s.id) }} />
                      <T.icon className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{s.name}</span>
                      {s.isMain && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                    </span>
                  </td>
                  <N>{s.bills}</N><N strong>{fmt.money(s.net)}</N><N>{fmt.money(s.refunds)}</N><N>{fmt.money(s.discount)}</N>
                  <N>{fmt.money(s.cashIn)}</N><N>{fmt.money(s.credit)}</N><N>{fmt.money(s.avgBill)}</N>
                  <N>{fmt.cost(s.grossProfit)}</N><N>{fmt.money(s.expenses)}</N><N>{fmt.cost(s.writeOff)}</N><N strong>{fmt.cost(s.netProfit)}</N>
                  <N>{s.share.toFixed(1)}%</N><N><Growth v={s.growth} /></N>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 bg-slate-50/70 font-semibold text-slate-900">
            <tr>
              <td className="py-2.5 pl-5 pr-3">Kul</td>
              <N>{t.bills}</N><N strong>{fmt.money(t.net)}</N><N>{fmt.money(t.refunds)}</N><N>{fmt.money(t.discount)}</N>
              <N>{fmt.money(t.cashIn)}</N><N>{fmt.money(t.credit)}</N><N>{fmt.money(t.bills ? t.net / t.bills : 0)}</N>
              <N>{fmt.cost(t.grossProfit)}</N><N>{fmt.money(t.expenses)}</N><N>{fmt.cost(t.writeOff)}</N><N strong>{fmt.cost(t.netProfit)}</N>
              <N>100%</N><N><Growth v={t.prevNet > 0 ? ((t.net - t.prevNet) / t.prevNet) * 100 : t.net > 0 ? 100 : 0} /></N>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="border-t border-slate-100 px-5 py-2.5 text-[0.75rem] text-slate-500">
        Sale = bill − return. Net profit = sale − cost − expenses − nuqsan (kharab/gum maal). Wohi hisaab jo <Link to="/reports" className="font-semibold text-brand-700 hover:underline">Reports</Link> me hai.
      </p>
    </div>
  );
}

function N({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return <td className={cn('whitespace-nowrap px-3 py-2.5 text-right tabular-nums', strong ? 'font-semibold text-slate-900' : 'text-slate-600')}>{children}</td>;
}

export function Growth({ v }: { v: number }) {
  if (!Number.isFinite(v) || v === 0) return <span className="text-slate-400">—</span>;
  const up = v > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return <span className={cn('inline-flex items-center gap-0.5 font-semibold', up ? 'text-emerald-600' : 'text-rose-600')}><Icon className="h-3.5 w-3.5" />{Math.abs(v).toFixed(0)}%</span>;
}

function Note({ text }: { text: string }) {
  return <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-[0.8125rem] text-slate-500">{text}</p>;
}
