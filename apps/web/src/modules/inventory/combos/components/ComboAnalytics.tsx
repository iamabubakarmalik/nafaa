/**
 * How combos sold in the chosen period: number sold, revenue, profit and
 * margin, the daily trend, the best combos, the weekday pattern, combos that
 * did not sell and combos about to run out of a part.
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarDays, Gift, Moon, Percent, ShoppingBag, TrendingUp, Trophy, Wallet } from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { combosApi } from '../api/combos.api';
import { COMBO_KEY, qtyText } from './meta';

const dayLabel = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
const WEEKDAYS = ['Itwaar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];

export function ComboAnalytics({ range, money, cost }: {
  range: { from?: string; to?: string };
  /** Sales figures (respects "hide sales"). */
  money: (n: number) => string;
  /** Cost and profit figures (respects cost access). */
  cost: (n: number) => string;
}) {
  const theme = useChartTheme();
  const q = useQuery({ queryKey: [COMBO_KEY, 'analytics', range], queryFn: () => combosApi.analytics(range), placeholderData: (p) => p });
  const d = q.data;

  if (q.isLoading || !d) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  }
  const t = d.totals;
  const trend = d.trend.map((x) => ({ ...x, label: dayLabel(x.key) }));
  const top = d.byCombo.slice(0, 10);
  const topMax = Math.max(1, ...top.map((x) => x.revenue));
  const week = d.weekday.map((w) => ({ ...w, label: WEEKDAYS[w.day].slice(0, 3) }));
  const best = [...d.weekday].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={ShoppingBag} label="Combos bike" value={qtyText(t.sold)} sub={`${t.bills} bill · ${d.days} din`} />
        <Kpi icon={Wallet} label="Combo se kamai" value={money(t.revenue)} sub={t.sold > 0 ? `ek combo ausat ${money(t.revenue / t.sold)}` : 'Abhi koi bikri nahi'} tone="emerald" />
        <Kpi icon={TrendingUp} label="Munafa" value={cost(t.profit)} sub={`Lagat ${cost(t.cost)}`} tone={t.profit < 0 ? 'rose' : 'emerald'} />
        <Kpi icon={Percent} label="Margin" value={t.revenue > 0 ? `${Math.round(t.margin)}%` : '—'} sub={t.savingsGiven > 0 ? `Customers ko bachat ${money(t.savingsGiven)}` : 'Bikri par munafa'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-600" />Roz ki bikri</span>} description="Har din kitne combo bike aur kitni kamai hui">
          {!trend.length ? <Empty text="Is muddat me koi combo nahi bika" /> : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis yAxisId="m" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                  <YAxis yAxisId="c" orientation="right" tick={theme.axis} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip formatter={(v, n) => [n === 'Kamai' ? formatPKR(Number(v)) : qtyText(Number(v)), n]} {...theme.tooltip} />
                  <Bar yAxisId="m" dataKey="revenue" name="Kamai" fill={theme.primary} radius={[6, 6, 0, 0]} />
                  <Line yAxisId="c" dataKey="count" name="Combos" stroke={theme.highlight} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-brand-600" />Hafte ke din</span>} description={best && best.count > 0 ? `${WEEKDAYS[best.day]} ko sab se zyada` : 'Kis din zyada bikte hain'}>
          {!trend.length ? <Empty text="Abhi data nahi" /> : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={week} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                  <Tooltip formatter={(v) => [qtyText(Number(v)), 'Combos']} {...theme.tooltip} />
                  <Bar dataKey="count" name="Combos" fill={theme.primarySoft} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" />Sab se zyada bikne wale</span>} description="Kamai ke hisaab se — munafa aur margin ke sath">
        {!top.length ? <Empty text="Is muddat me koi combo nahi bika" /> : (
          <ul className="space-y-3">
            {top.map((x, i) => (
              <li key={x.id ?? x.name}>
                <div className="flex items-center justify-between gap-3 text-[0.8125rem]">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold', i === 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')}>{i + 1}</span>
                    {x.id ? <Link to={`/combos/${x.id}/edit`} className="truncate font-medium text-slate-800 hover:text-brand-700 hover:underline">{x.name}</Link>
                      : <span className="truncate font-medium text-slate-800" title="Ye combo ab nahi hai ya naam badal gaya">{x.name} <span className="text-slate-400">(purana)</span></span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-4 tabular-nums">
                    <span className="hidden text-slate-500 sm:inline">{qtyText(x.count)} bike</span>
                    <span className={cn('hidden w-20 text-right sm:inline', x.profit < 0 ? 'text-rose-700' : 'text-emerald-700')}>{cost(x.profit)}</span>
                    <span className="w-24 text-right font-semibold text-slate-900">{money(x.revenue)}</span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(x.revenue / topMax) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Khatam hone wale</span>} description="Kisi cheez ka stock kam hai — 3 ya kam combo ban sakte hain">
          {!d.runningLow.length ? <Empty text="Sab combos ke liye maal kaafi hai" /> : (
            <ul className="divide-y divide-slate-100">
              {d.runningLow.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-2 text-[0.8125rem]">
                  <Link to={`/combos/${x.id}/edit`} className="min-w-0 truncate font-medium text-slate-800 hover:text-brand-700">{x.name}</Link>
                  <span className="shrink-0 text-right">
                    <span className={cn('font-semibold tabular-nums', x.available === 0 ? 'text-rose-700' : 'text-amber-700')}>{x.available === 0 ? 'Nahi ban sakta' : `${x.available} ban sakte`}</span>
                    {x.limitedBy && <span className="block text-[0.6875rem] text-slate-500">{x.limitedBy === 'limit' ? 'Apni had poori' : `${x.limitedBy} kam hai`}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Moon className="h-4 w-4 text-slate-500" />Nahi bike</span>} description="Chalu combos jo is muddat me ek bhi nahi bike">
          {!d.notSold.length ? <Empty text="Har chalu combo bika — zabardast" /> : (
            <ul className="divide-y divide-slate-100">
              {d.notSold.slice(0, 10).map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-2 text-[0.8125rem]">
                  <Link to={`/combos/${x.id}/edit`} className="flex min-w-0 items-center gap-2 font-medium text-slate-800 hover:text-brand-700"><Gift className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{x.name}</span></Link>
                  <span className="shrink-0 tabular-nums text-slate-600">{formatPKR(x.comboPrice)}</span>
                </li>
              ))}
              {d.notSold.length > 10 && <li className="py-2 text-[0.75rem] text-slate-500">aur {d.notSold.length - 10}…</li>}
            </ul>
          )}
        </Card>
      </div>
      <p className="text-[0.75rem] text-slate-500">Hisaab POS ke combo bills se banta hai. Wapas hua maal kamai aur lagat se nikal diya jata hai.</p>
    </div>
  );
}

function Kpi({ icon: I, label, value, sub, tone = 'brand' }: { icon: typeof Wallet; label: string; value: string; sub?: string; tone?: 'brand' | 'rose' | 'emerald' }) {
  const toneCls = tone === 'rose' ? 'bg-rose-50 text-rose-700' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-50 text-brand-700';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2"><span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', toneCls)}><I className="h-4 w-4" /></span><span className="text-[0.8125rem] text-slate-500">{label}</span></div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-[0.75rem] text-slate-500">{sub}</p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-[0.875rem] text-slate-500">{text}</p>;
}
