/**
 * Raw-material movements for a period: the record of goods received, used,
 * wasted and counted, and the analytics of money spent and used per day and
 * per material, with the store value by kind.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownToLine, Boxes, CalendarDays, Flame, PieChart, Scale, Utensils } from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { ingredientsApi, type Ingredient, type MovementKind } from '../../api/ingredients.api';
import { AnalyticsSkeleton, CardTitle, LoadFailed, RankedBars, StatTile } from '../charts';
import { RAW_KEY, dateTime, fmtQty, keyLabel } from '../meta';
import { kindOf, rawCategoryOf } from './IngredientModals';

function useMovements(range: { from: string; to: string } | null, type?: MovementKind) {
  return useQuery({ queryKey: [RAW_KEY, 'movements', range, type], queryFn: () => ingredientsApi.movements({ ...(range ?? {}), type }), placeholderData: (p) => p });
}

export function MovementRecord({ range, type, search }: { range: { from: string; to: string } | null; type?: MovementKind; search: string }) {
  const { cost } = useMasked();
  const q = useMovements(range, type);
  const t = search.trim().toLowerCase();
  const rows = (q.data?.rows ?? []).filter((r) => !t || r.ingredient.name.toLowerCase().includes(t) || (r.reason ?? '').toLowerCase().includes(t) || (r.notes ?? '').toLowerCase().includes(t));
  if (q.isError && !q.data) return <LoadFailed what="Record" retry={() => q.refetch()} />;
  if (!q.data) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>;
  if (!rows.length) return <div className="rounded-3xl bg-white px-6 py-14 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">Is muddat me koi record nahi</div>;
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-[0.8125rem]">
          <thead>
            <tr className="bg-slate-50/70 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Kab</th><th className="px-2 py-2.5">Kya</th><th className="px-2 py-2.5">Saamaan</th><th className="px-2 py-2.5">Wajah / note</th>
              <th className="px-2 py-2.5 text-right">Miqdar</th><th className="px-4 py-2.5 text-right">Rakam</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-4 py-2 text-slate-500">{dateTime(r.createdAt)}</td>
                <td className={cn('px-2 py-2 font-semibold', kindOf(r.transactionType).tone)}>{kindOf(r.transactionType).label}</td>
                <td className="px-2 py-2 font-medium text-slate-900">{r.ingredient.name}</td>
                <td className="max-w-[16rem] truncate px-2 py-2 text-slate-600">{r.reason || r.notes || '—'}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{fmtQty(r.quantity)} {r.unit}</td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{r.cost != null ? cost(Math.abs(r.cost)) : '••••'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {q.data.rows.length >= 300 && <p className="border-t border-slate-100 px-4 py-2 text-[0.75rem] text-slate-500">Aakhri 300 dikh rahe hain — chhoti muddat chunein</p>}
    </div>
  );
}

export function RawAnalytics({ range, items }: { range: { from: string; to: string } | null; items: Ingredient[] }) {
  const theme = useChartTheme();
  const { cost, costHidden } = useMasked();
  const q = useMovements(range);
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) if (i.isActive !== false) m.set(i.category, (m.get(i.category) ?? 0) + Math.max(i.currentStock, 0) * i.costPerUnit);
    return [...m.entries()].map(([k, v]) => ({ key: k, value: v })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  }, [items]);
  const d = q.data;
  if (q.isError && !d) return <LoadFailed what="Analytics" retry={() => q.refetch()} />;
  if (!d) return <AnalyticsSkeleton />;
  const t = d.totals;
  const money = (n?: number) => (costHidden || n == null ? '••••' : cost(n));
  const days = d.byDay.map((b) => ({ label: keyLabel(b.key), ...(b.cost ?? {}) }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={ArrowDownToLine} label="Khareeda" value={money(t.PURCHASE.cost)} sub={`${t.PURCHASE.count} dafa maal aaya`} tone="green" />
        <StatTile icon={Utensils} label="Banane me laga" value={money(t.CONSUMPTION.cost)} sub={`${t.CONSUMPTION.count} dafa istemal`} tone="brand" />
        <StatTile icon={Flame} label="Zaya" value={money(t.WASTE.cost)} sub={`${t.WASTE.count} dafa`} tone="rose" />
        <StatTile icon={Scale} label="Ginti ka farq" value={money(t.ADJUSTMENT.cost)} sub={`${t.ADJUSTMENT.count} dafa theek kiya`} tone="violet" />
      </div>
      {!costHidden && (
        <Card className="rounded-2xl" title={<CardTitle icon={CalendarDays}>Har din</CardTitle>} description="Kitne ka aaya, kitne ka laga, kitne ka zaya">
          {!days.length ? <p className="py-10 text-center text-sm text-slate-500">Is muddat me kuch nahi</p> : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                  <Tooltip formatter={(v, n) => [cost(Number(v)), n]} {...theme.tooltip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="PURCHASE" name="Aaya" fill={theme.profit} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="CONSUMPTION" name="Laga" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="WASTE" name="Zaya" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<CardTitle icon={Boxes}>Sab se zyada kya laga</CardTitle>} description="Banane me istemal ki lagat">
          <RankedBars rows={d.byIngredient.filter((i) => i.used > 0).map((i) => ({ key: i.id, label: i.name, value: i.cost ?? i.used, display: costHidden ? `${fmtQty(i.used)} ${i.unit}` : `${fmtQty(i.used)} ${i.unit} · ${cost(i.cost ?? 0)}`, sub: i.wasted ? `${fmtQty(i.wasted)} ${i.unit} zaya` : undefined }))} empty="Is muddat me recipe se kuch istemal nahi hua" />
        </Card>
        <Card className="rounded-2xl" title={<CardTitle icon={PieChart}>Gudaam me paisa</CardTitle>} description="Abhi ka stock, aaj ke rate se">
          <RankedBars rows={byCategory.map((c) => ({ key: c.key, label: `${rawCategoryOf(c.key).emoji} ${rawCategoryOf(c.key).label}`, value: c.value, display: money(c.value), color: '#a16207' }))} empty="Gudaam khali hai" />
        </Card>
      </div>
    </div>
  );
}
