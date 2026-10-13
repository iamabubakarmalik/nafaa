/**
 * Where money came from and went in the chosen period: in and out by
 * business day (by month for long periods), by source, by account, and
 * paid expenses by category.
 */

import { useQuery } from '@tanstack/react-query';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownCircle, ArrowUpCircle, Landmark, Receipt, Scale, TrendingUp, type LucideIcon } from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { moneyApi, type MoneyPeriod } from '../api/money.api';
import { ACCOUNTS, MONEY_KEY, SOURCES } from './meta';

const label = (k: string, monthly: boolean) =>
  monthly
    ? new Date(`${k}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' })
    : new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export function MoneyAnalytics({ filters, money }: { filters: MoneyPeriod; money: (n: number) => string }) {
  const theme = useChartTheme();
  const q = useQuery({ queryKey: [MONEY_KEY, 'analytics', filters], queryFn: () => moneyApi.analytics(filters), placeholderData: (p) => p });
  const d = q.data;

  if (q.isError) return <Card className="rounded-2xl"><Empty text="Analytics load nahi hui. Period ek saal se chhoti rakhein aur dobara koshish karein." /></Card>;
  if (q.isLoading || !d) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  }
  const monthly = d.grouping === 'month';
  const trend = d.trend.map((x) => ({ ...x, label: label(x.key, monthly) }));
  const ins = d.bySource.filter((s) => s.direction === 'in');
  const outs = d.bySource.filter((s) => s.direction === 'out');
  const busiest = [...d.trend].sort((a, b) => b.in - a.in)[0];
  const accounts = d.byAccount.filter((a) => a.in || a.out);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={ArrowDownCircle} label="Kul aaya" value={money(d.totals.in)} sub={`${ins.reduce((s, x) => s + x.count, 0)} entries`} tone="emerald" />
        <Kpi icon={ArrowUpCircle} label="Kul gaya" value={money(d.totals.out)} sub={`${outs.reduce((s, x) => s + x.count, 0)} entries`} tone="rose" />
        <Kpi icon={Scale} label="Bacha (net)" value={money(d.totals.net)} sub={d.totals.net >= 0 ? 'Aaya zyada, gaya kam' : 'Gaya zyada, aaya kam'} tone={d.totals.net >= 0 ? 'brand' : 'amber'} />
        <Kpi icon={TrendingUp} label={monthly ? 'Sab se acha mahina' : 'Sab se acha din'} value={busiest && busiest.in > 0 ? label(busiest.key, monthly) : '—'}
          sub={busiest && busiest.in > 0 ? `${money(busiest.in)} aaya` : 'Abhi kuch nahi aaya'} />
      </div>

      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-600" />{monthly ? 'Har mahine aaya aur gaya' : 'Roz aaya aur gaya'}</span>}
        description={monthly ? 'Lambi period hai, is liye mahine ke hisaab se' : 'Har karobari din — line bacha hua (net) dikhati hai'}>
        {!trend.some((t) => t.in || t.out) ? <Empty text="Is period me paisa na aaya na gaya" /> : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip formatter={(v, nm) => [formatPKR(Number(v)), nm]} {...theme.tooltip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="in" name="Aaya" fill={theme.profit} radius={[4, 4, 0, 0]} />
                <Bar dataKey="out" name="Gaya" fill="#e11d48" radius={[4, 4, 0, 0]} />
                <Line dataKey="net" name="Bacha" stroke={theme.primary} strokeWidth={2} dot={false} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Ranked icon={ArrowDownCircle} title="Paisa kahan se aaya" description="Sale, khata wasooli aur golak me daala cash" money={money}
          rows={ins.map((s) => ({ key: s.source, label: SOURCES[s.source].label, color: SOURCES[s.source].color, value: s.amount, sub: `${s.count} entries · ${SOURCES[s.source].hint}` }))} />
        <Ranked icon={ArrowUpCircle} title="Paisa kahan gaya" description="Purchase, supplier, kharch, return aur nikala cash" money={money}
          rows={outs.map((s) => ({ key: s.source, label: SOURCES[s.source].label, color: SOURCES[s.source].color, value: s.amount, sub: `${s.count} entries · ${SOURCES[s.source].hint}` }))} />
        <Ranked icon={Landmark} title="Account ke hisaab se" description="Har account me kitna aaya — gaya neeche likha hai" money={money}
          rows={accounts.map((a) => ({ key: a.method, label: ACCOUNTS[a.method].label, color: ACCOUNTS[a.method].color, value: a.in, sub: `Gaya ${money(a.out)} · bacha ${money(a.net)}` }))} />
        <Ranked icon={Receipt} title="Kharch kis par" description="Sirf adaa kiye gaye kharch" money={money}
          rows={d.expenseCategories.map((c) => ({ key: c.id ?? 'none', label: c.name, color: c.color, value: c.amount, sub: `${c.count} kharch` }))} />
      </div>
    </div>
  );
}

interface RankRow { key: string; label: string; color: string; value: number; sub: string }

function Ranked({ icon: I, title, description, rows, money }: {
  icon: LucideIcon; title: string; description: string; rows: RankRow[]; money: (n: number) => string;
}) {
  const list = rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...list.map((r) => r.value));
  const total = list.reduce((s, r) => s + r.value, 0);
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><I className="h-4 w-4 text-brand-600" />{title}</span>} description={description}>
      {!list.length ? <Empty text="Koi entry nahi" /> : (
        <ul className="space-y-2.5">
          {list.map((r) => (
            <li key={r.key}>
              <div className="flex justify-between gap-2 text-[0.8125rem]">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                  <span className="truncate font-medium text-slate-800">{r.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-slate-900">{money(r.value)}<span className="ml-1 text-[0.75rem] text-slate-500">{Math.round((r.value / total) * 100)}%</span></span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
              </div>
              <p className="mt-0.5 truncate text-[0.6875rem] text-slate-500">{r.sub}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Kpi({ icon: I, label: l, value, sub, tone = 'brand' }: { icon: LucideIcon; label: string; value: string; sub?: string; tone?: 'brand' | 'rose' | 'emerald' | 'amber' }) {
  const toneCls = { rose: 'bg-rose-50 text-rose-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', brand: 'bg-brand-50 text-brand-700' }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2"><span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', toneCls)}><I className="h-4 w-4" /></span><span className="text-[0.8125rem] text-slate-500">{l}</span></div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-[0.75rem] text-slate-500">{sub}</p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-[0.875rem] text-slate-500">{text}</p>;
}
