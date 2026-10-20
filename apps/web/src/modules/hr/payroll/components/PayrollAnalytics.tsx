/**
 * Salary cost over twelve months against sales, what it is made of, the
 * branches, the people and the jobs that cost the most.
 */

import { useQuery } from '@tanstack/react-query';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Briefcase, CalendarRange, HandCoins, Percent, Store, TrendingDown, TrendingUp, Users, Wallet, type LucideIcon } from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { payrollApi } from '../api/payroll.api';
import { PAYROLL_KEY } from './meta';

const MIX_COLORS: Record<string, string> = { base: '#7c3aed', overtime: '#0891b2', commission: '#16a34a', bonuses: '#f59e0b' };

export function PayrollAnalytics({ month, shopId }: { month: string; shopId?: string }) {
  const theme = useChartTheme();
  const q = useQuery({ queryKey: [PAYROLL_KEY, 'analytics', month, shopId], queryFn: () => payrollApi.analytics(month, shopId), placeholderData: (p) => p });
  const d = q.data;

  if (q.isError && !d) return <p className="rounded-3xl bg-white px-6 py-14 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">Analytics load nahi hui — internet check karein aur dobara kholein.</p>;
  if (!d) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;

  const t = d.totals;
  const up = (t.change ?? 0) > 0;
  const mixTotal = d.mix.reduce((a, m) => a + m.amount, 0);
  const months = d.months.map((m) => ({ ...m, short: m.label.slice(0, 3) + " '" + m.key.slice(2, 4) }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Wallet} label="12 mahine ki tankhwah" value={formatPKR(t.gross)} sub={`Ausat ${formatPKR(t.average)} har mahine`} tone="brand" />
        <Kpi icon={Percent} label="Sale ka hissa" value={t.pct == null ? '—' : `${t.pct}%`} sub={`Sale ${formatPKR(t.sales)}`} tone={t.pct != null && t.pct > 25 ? 'rose' : 'emerald'} />
        <Kpi icon={up ? TrendingUp : TrendingDown} label="Pichle mahine se" value={t.change == null ? '—' : `${up ? '+' : ''}${t.change}%`}
          sub={`Is mahine ${formatPKR(t.current)} · pehle ${formatPKR(t.previous)}`} tone={t.change == null ? 'brand' : up ? 'rose' : 'emerald'} />
        <Kpi icon={HandCoins} label="Advance ki qisten" value={formatPKR(t.advanceGiven)} sub={`Fi banda ausat ${formatPKR(t.perStaff)} (is mahine)`} tone="amber" />
      </div>

      <Card className="rounded-2xl" title={<Title icon={CalendarRange}>Har mahine ki tankhwah aur sale ka %</Title>} description="Bar = tankhwah ka expense (kul kamai) aur us mahine katne wali advance · line = sale ka kitna hissa tankhwah me gaya">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={months} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="short" tick={theme.axis} axisLine={false} tickLine={false} />
              <YAxis yAxisId="money" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
              <YAxis yAxisId="pct" orientation="right" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={36} />
              <Tooltip {...theme.tooltip} formatter={(v, name) => (name === 'Sale ka %' ? [`${v}%`, name] : [formatPKR(Number(v)), name])} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="money" dataKey="gross" name="Tankhwah" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar yAxisId="money" dataKey="advanceGiven" name="Advance ki qist" fill={theme.primarySoft} radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Line yAxisId="pct" dataKey="pct" name="Sale ka %" stroke={theme.highlight} strokeWidth={2} dot={{ r: 2 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<Title icon={BarChart3}>Tankhwah kis cheez ki</Title>} description="12 mahine me asal tankhwah, overtime, commission aur bonus">
          {!d.mix.length ? <Empty /> : (
            <ul className="space-y-2.5">
              {d.mix.map((m) => (
                <li key={m.key}>
                  <div className="flex justify-between gap-2 text-[0.8125rem]">
                    <span className="font-medium text-slate-800">{m.label}</span>
                    <span className="tabular-nums text-slate-900">{formatPKR(m.amount)} <span className="text-slate-500">· {mixTotal ? Math.round((m.amount / mixTotal) * 100) : 0}%</span></span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${mixTotal ? (m.amount / mixTotal) * 100 : 0}%`, background: MIX_COLORS[m.key] ?? theme.primary }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Ranked icon={Store} title="Branch" description="Har branch ki tankhwah aur us ki sale ka %" empty={d.byBranch.length < 1}
          rows={d.byBranch.map((b) => ({ key: b.key, label: b.label, amount: b.gross, sub: `${b.staff} staff${b.pct != null ? ` · sale ka ${b.pct}%` : ''}` }))} />
        <Ranked icon={Users} title="Sab se zyada tankhwah" description="12 mahine me kis ko kitna mila (kul kamai)" empty={!d.byStaff.length}
          rows={d.byStaff.map((s) => ({ key: s.key, label: s.label, amount: s.gross, sub: `${s.designation} · ${s.months} mahine · ausat ${formatPKR(s.average)}` }))} />
        <Ranked icon={Briefcase} title="Ohda" description="Kis kaam par kitna expense" empty={!d.byDesignation.length}
          rows={d.byDesignation.map((x) => ({ key: x.key, label: x.label, amount: x.amount }))} />
      </div>

      <Card className="rounded-2xl" title={<Title icon={CalendarRange}>Mahine ba mahine</Title>} description="Kamai, katauti, ada aur baqi" flush>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[44rem] text-[0.75rem]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500">
                {['Mahina', 'Staff', 'Kul kamai', 'Katauti', 'Net', 'Ada', 'Baqi', 'Sale', '%'].map((h, i) => (
                  <th key={h} className={cn('px-3 py-2 font-medium', i === 0 ? 'sticky left-0 bg-white px-4 text-left' : 'text-right')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...d.months].reverse().map((m) => (
                <tr key={m.key} className="border-b border-slate-50">
                  <td className="sticky left-0 bg-white px-4 py-1.5 font-medium text-slate-800">{m.label}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{m.staff || '·'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{m.gross ? axisMoney(m.gross) : '·'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-rose-700">{m.cuts ? axisMoney(m.cuts) : '·'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{m.net ? axisMoney(m.net) : '·'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700">{m.paid ? axisMoney(m.paid) : '·'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-amber-700">{m.due ? axisMoney(m.due) : '·'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{m.sales ? axisMoney(m.sales) : '·'}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums">{m.pct == null ? '·' : `${m.pct}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-3 text-[0.75rem] text-slate-500 sm:px-5">Kul kamai = asal tankhwah + overtime + commission + bonus. Advance pehle diya ja chuka hota hai, is liye jis mahine katta hai us ki Net me se nikal kar aata hai.</p>
      </Card>
    </div>
  );
}

function Title({ icon: I, children }: { icon: LucideIcon; children: string }) {
  return <span className="inline-flex items-center gap-2"><I className="h-4 w-4 text-brand-600" />{children}</span>;
}

function Ranked({ icon, title, description, rows, empty }: {
  icon: LucideIcon; title: string; description: string; empty: boolean; rows: Array<{ key: string; label: string; amount: number; sub?: string }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  return (
    <Card className="rounded-2xl" title={<Title icon={icon}>{title}</Title>} description={description}>
      {empty ? <Empty /> : (
        <ul className="space-y-2.5">
          {rows.slice(0, 8).map((r) => (
            <li key={r.key}>
              <div className="flex justify-between gap-2 text-[0.8125rem]">
                <span className="min-w-0 truncate font-medium text-slate-800">{r.label}</span>
                <span className="shrink-0 tabular-nums text-slate-900">{formatPKR(r.amount)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${(r.amount / max) * 100}%` }} />
              </div>
              {r.sub && <p className="mt-0.5 text-[0.6875rem] text-slate-500">{r.sub}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Kpi({ icon: I, label, value, sub, tone = 'brand' }: { icon: LucideIcon; label: string; value: string; sub?: string; tone?: 'brand' | 'rose' | 'emerald' | 'amber' }) {
  const toneCls = { rose: 'bg-rose-50 text-rose-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', brand: 'bg-brand-50 text-brand-700' }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2"><span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', toneCls)}><I className="h-4 w-4" /></span><span className="text-[0.8125rem] text-slate-500">{label}</span></div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">{sub}</p>}
    </div>
  );
}

function Empty() {
  return <p className="py-10 text-center text-[0.875rem] text-slate-500">Abhi koi tankhwah record nahi</p>;
}
