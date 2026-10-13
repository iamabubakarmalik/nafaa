/**
 * Where stock went in the chosen period: value gained and lost, the daily
 * trend of in against out, the split by type, the main reasons, the products
 * lost most and who made the adjustments.
 */

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownCircle, ArrowUpCircle, ClipboardList, MessageSquareText, PackageX, PieChart as PieIcon, Scale, TrendingUp, Users } from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { stockAdjustmentsApi, type AdjustmentQuery, type AdjustmentType } from '../api/stock-adjustments.api';
import { ADJ_KEY, TYPES, qtyText } from './meta';

const dayLabel = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export function AdjustmentAnalytics({ filters, money }: { filters: Omit<AdjustmentQuery, 'page' | 'limit'>; money: (n: number) => string }) {
  const theme = useChartTheme();
  const tip = theme.tooltip;
  const q = useQuery({ queryKey: [ADJ_KEY, 'analytics', filters], queryFn: () => stockAdjustmentsApi.analytics(filters), placeholderData: (p) => p });
  const d = q.data;

  if (q.isLoading || !d) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  }
  const t = d.totals;
  const net = t.gained - t.lost;
  const trend = d.trend.map((x) => ({ ...x, label: dayLabel(x.key) }));
  const types = d.byType.map((b) => ({ ...b, abs: Math.abs(b.value), meta: TYPES[b.key as AdjustmentType] })).filter((b) => b.meta);
  const lossMax = Math.max(1, ...d.topLosses.map((x) => x.value));
  const reasonMax = Math.max(1, ...d.byReason.map((x) => Math.abs(x.value)));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={ClipboardList} label="Adjustments" value={String(t.count)} sub={`${d.days} din me`} />
        <Kpi icon={ArrowUpCircle} label="Stock barha" value={money(t.gained)} sub="Cost ke hisaab se" tone="emerald" />
        <Kpi icon={ArrowDownCircle} label="Stock ghata" value={money(t.lost)} sub="Kam, kharab aur gum" tone="rose" />
        <Kpi icon={Scale} label="Kul farq" value={`${net >= 0 ? '+' : '−'}${money(Math.abs(net))}`} sub={net < 0 ? 'Is period ka nuqsan' : 'Is period me faida'} tone={net < 0 ? 'rose' : 'emerald'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-600" />Roz ka hisaab</span>} description="Har din kitna stock barha aur kitna ghata (amount)">
          {!trend.length ? <Empty text="Is period me koi adjustment nahi" /> : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                  <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n]} {...tip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="in" name="Barha" fill={theme.profit} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="out" name="Ghata" fill="#e11d48" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><PieIcon className="h-4 w-4 text-brand-600" />Kis type ka</span>} description="Amount ke hisaab se">
          {!types.length ? <Empty text="Koi adjustment nahi" /> : (
            <>
              <div className="h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={types} dataKey="abs" nameKey="key" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">
                      {types.map((b) => <Cell key={b.key} fill={b.meta.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [formatPKR(Number(v)), TYPES[n as AdjustmentType]?.label ?? n]} {...tip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1 text-[0.8125rem]">
                {types.map((b) => (
                  <li key={b.key} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: b.meta.color }} />{b.meta.label} <span className="text-slate-400">· {b.count}</span></span>
                    <span className="tabular-nums text-slate-900">{money(b.abs)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><PackageX className="h-4 w-4 text-rose-600" />Sab se zyada nuqsan</span>} description="Jo maal sab se zyada kam, kharab ya gum hua">
          {!d.topLosses.length ? <Empty text="Koi nuqsan nahi — bohat khoob" /> : (
            <ul className="space-y-2.5">
              {d.topLosses.map((x, i) => (
                <li key={`${x.name}${i}`}>
                  <div className="flex justify-between gap-2 text-[0.8125rem]">
                    <span className="truncate font-medium text-slate-800">{x.name}</span>
                    <span className="shrink-0 tabular-nums text-slate-900">{money(x.value)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-rose-500" style={{ width: `${(x.value / lossMax) * 100}%` }} />
                  </div>
                  <p className="mt-0.5 text-[0.6875rem] text-slate-500">{qtyText(x.qty)} {x.unit} · {x.count} baar</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-brand-600" />Wajah</span>} description="Kis wajah se kitna stock badla">
          {!d.byReason.length ? <Empty text="Koi adjustment nahi" /> : (
            <ul className="space-y-2.5">
              {d.byReason.map((r) => (
                <li key={r.key}>
                  <div className="flex justify-between gap-2 text-[0.8125rem]">
                    <span className="truncate font-medium text-slate-800">{r.key}</span>
                    <span className={cn('shrink-0 tabular-nums', r.value < 0 ? 'text-rose-700' : 'text-emerald-700')}>{r.value < 0 ? '−' : '+'}{money(Math.abs(r.value))}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full', r.value < 0 ? 'bg-rose-400' : 'bg-emerald-500')} style={{ width: `${(Math.abs(r.value) / reasonMax) * 100}%` }} />
                  </div>
                  <p className="mt-0.5 text-[0.6875rem] text-slate-500">{r.count} line</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-brand-600" />Kis ne kiye</span>} description="Har bande ke adjustments aur un ka kul asar">
        {!d.byPerson.length ? <Empty text="Koi adjustment nahi" /> : (
          <ul className="divide-y divide-slate-100">
            {d.byPerson.map((p) => (
              <li key={p.key} className="flex items-center justify-between gap-3 py-2 text-[0.8125rem]">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[0.75rem] font-bold text-brand-700">{p.key.slice(0, 1).toUpperCase()}</span>
                  <span className="truncate font-medium text-slate-800">{p.key}</span>
                </span>
                <span className="flex shrink-0 items-center gap-4">
                  <span className="text-slate-500">{p.count} line</span>
                  <span className={cn('w-24 text-right font-semibold tabular-nums', p.value < 0 ? 'text-rose-700' : 'text-emerald-700')}>{p.value < 0 ? '−' : '+'}{money(Math.abs(p.value))}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Kpi({ icon: I, label, value, sub, tone = 'brand' }: { icon: typeof Scale; label: string; value: string; sub?: string; tone?: 'brand' | 'rose' | 'emerald' }) {
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
