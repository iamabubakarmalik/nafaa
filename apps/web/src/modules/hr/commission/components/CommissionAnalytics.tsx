/**
 * Twelve months of commission up to the chosen month: totals and the share
 * of sale paid as commission, commission against payouts by month, each
 * person's month by month, the split by rule and a people table.
 */

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, CalendarRange, Gauge, HandCoins, Percent, Users, Wallet, type LucideIcon } from 'lucide-react';
import { Card, Skeleton, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { commissionApi } from '../api/commission.api';
import { COMMISSION_KEY, periodLabel, signed } from './meta';

const PALETTE = ['#7c3aed', '#0891b2', '#16a34a', '#ea580c', '#db2777', '#2563eb', '#ca8a04', '#64748b'];

export function CommissionAnalytics({ period, onPerson }: { period: string; onPerson: (userId: string, name: string) => void }) {
  const theme = useChartTheme();
  const q = useQuery({ queryKey: [COMMISSION_KEY, 'analytics', period], queryFn: () => commissionApi.analytics(period, 12), placeholderData: (p) => p });
  const d = q.data;

  if (q.isError && !d) return <p className="rounded-3xl bg-white px-6 py-14 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">Analytics load nahi hui — internet check karein aur dobara kholein.</p>;
  if (!d) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;

  const months = d.series.map((s) => ({ ...s, label: periodLabel(s.period, true) }));
  const top = d.people.slice(0, 6);
  const stacked = d.series.map((s) => ({ label: periodLabel(s.period, true), ...Object.fromEntries(top.map((p) => [p.userId, s.people[p.userId] ?? 0])) }));
  const ruleMax = Math.max(1, ...d.byRule.map((r) => Math.abs(r.amount)));
  const empty = !d.totals.earned && !d.totals.sale;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={HandCoins} label="12 mahine ki commission" value={signed(d.totals.earned)} sub={d.totals.best ? `Sab se zyada ${periodLabel(d.totals.best.period, true)}: ${formatPKR(d.totals.best.earned)}` : '—'} />
        <Kpi icon={Wallet} label="Ada hui" value={formatPKR(d.totals.paid)} sub={`Baqi ${formatPKR(Math.max(0, d.totals.earned - d.totals.paid))}`} tone="emerald" />
        <Kpi icon={BarChart3} label="Chaalu bandon ki sale" value={formatPKR(d.totals.sale)} sub="Return nikaal kar" />
        <Kpi icon={Percent} label="Sale ka kitna hissa" value={`${d.totals.rate}%`} sub="Commission ÷ sale" tone="amber" />
      </div>

      {empty ? (
        <p className="rounded-3xl bg-white px-6 py-14 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">In 12 mahine me chaalu bandon ki koi sale nahi.</p>
      ) : (<>
        <Card className="rounded-2xl" title={<Title icon={CalendarRange}>Commission aur payment</Title>} description="Har mahine kitni bani aur kitni ada hui">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n === 'earned' ? 'Commission' : 'Ada']} {...theme.tooltip} />
                <Bar dataKey="earned" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="paid" fill={theme.profit} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {d.scope === 'all' && top.length > 1 && (
          <Card className="rounded-2xl" title={<Title icon={Users}>Har banda, har mahina</Title>} description={`Sab se zyada kamane wale ${top.length} bande`}>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stacked} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                  <Tooltip formatter={(v, n) => [formatPKR(Number(v)), top.find((p) => p.userId === n)?.name ?? n]} {...theme.tooltip} />
                  <Legend formatter={(v) => top.find((p) => p.userId === v)?.name ?? v} wrapperStyle={{ fontSize: 12 }} />
                  {top.map((p, i) => <Bar key={p.userId} dataKey={p.userId} stackId="a" fill={PALETTE[i % PALETTE.length]} maxBarSize={32} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl" title={<Title icon={Gauge}>Kis rule se kitni</Title>} description="12 mahine me har rule ka hissa">
            {!d.byRule.length ? <p className="py-10 text-center text-sm text-slate-500">Koi commission nahi bani</p> : (
              <ul className="space-y-2.5">
                {d.byRule.map((r) => (
                  <li key={r.label}>
                    <div className="flex justify-between gap-2 text-[0.8125rem]"><span className="truncate font-medium text-slate-800">{r.label}</span><span className="shrink-0 tabular-nums">{signed(r.amount)}</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(Math.abs(r.amount) / ruleMax) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="rounded-2xl" title={<Title icon={Users}>Bande</Title>} description="Click karein to us ka is mahine ka statement khulega" flush>
            <Table minWidth="28rem" className="mt-3 [&_table]:text-[0.8125rem]">
              <THead><Tr>
                <Th className="px-4 py-2">Banda</Th><Th className="px-2 py-2 text-right">Sale</Th>
                <Th className="px-2 py-2 text-right">Commission</Th><Th className="px-2 py-2 text-right">%</Th><Th className="px-4 py-2 text-right">Ada</Th>
              </Tr></THead>
              <TBody>
                {d.people.map((p) => (
                  <Tr key={p.userId} interactive onClick={() => onPerson(p.userId, p.name)}>
                    <Td className="max-w-[10rem] truncate px-4 py-2 font-medium text-slate-900">{p.name}</Td>
                    <Td className="px-2 py-2 text-right tabular-nums">{axisMoney(p.sale)}</Td>
                    <Td className="px-2 py-2 text-right font-semibold tabular-nums">{signed(p.earned)}</Td>
                    <Td className="px-2 py-2 text-right tabular-nums text-slate-500">{p.rate}%</Td>
                    <Td className="px-4 py-2 text-right tabular-nums">{formatPKR(p.paid)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>
        </div>
      </>)}
    </div>
  );
}

function Title({ icon: I, children }: { icon: LucideIcon; children: string }) {
  return <span className="inline-flex items-center gap-2"><I className="h-4 w-4 text-brand-600" />{children}</span>;
}

function Kpi({ icon: I, label, value, sub, tone = 'brand' }: { icon: LucideIcon; label: string; value: string; sub?: string; tone?: 'brand' | 'emerald' | 'amber' }) {
  const toneCls = { emerald: 'bg-success-50 text-success-700', amber: 'bg-amber-50 text-amber-700', brand: 'bg-brand-50 text-brand-700' }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2"><span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', toneCls)}><I className="h-4 w-4" /></span><span className="text-[0.8125rem] text-slate-500">{label}</span></div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">{sub}</p>}
    </div>
  );
}
