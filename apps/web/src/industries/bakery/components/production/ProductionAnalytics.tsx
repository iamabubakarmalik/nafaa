/**
 * Baking analytics for a period: planned against made and failed by day,
 * the products that fail most, shifts, bakers and raw-material cost.
 */

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarDays, CheckCircle2, ChefHat, Clock, Flame, Layers, Users, Wheat } from 'lucide-react';
import { Card } from '@/design-system/components';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { productionApi } from '../../api/production.api';
import { AnalyticsSkeleton, CardTitle, EmptyChart, LoadFailed, RankedBars, StatTile } from '../charts';
import { PRODUCTION_KEY, fmtQty, keyLabel } from '../meta';

export function ProductionAnalytics({ range }: { range: { from: string; to: string } | null }) {
  const theme = useChartTheme();
  const { cost, costHidden } = useMasked();
  const q = useQuery({ queryKey: [PRODUCTION_KEY, 'insights', range], queryFn: () => productionApi.insights(range ?? undefined), placeholderData: (p) => p });
  const d = q.data;
  if (q.isError && !d) return <LoadFailed what="Analytics" retry={() => q.refetch()} />;
  if (!d) return <AnalyticsSkeleton />;
  const t = d.totals;
  const days = d.byDay.map((b) => ({ ...b, label: keyLabel(b.key) }));
  const worst = d.byProduct.filter((p) => p.failed > 0).sort((a, b) => b.failRate - a.failRate || b.failed - a.failed);

  return (
    <div className="space-y-4">
      {t.failRate > 5 && (
        <p className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-[0.8125rem] text-rose-900 ring-1 ring-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Har 100 me se {Math.round(t.failRate)} kharab ho rahe hain. Neeche dekhein kis cheez me sab se zyada — oven ka temperature ya batch ka size dekhein.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Layers} label="Socha tha" value={fmtQty(t.planned)} sub={`${t.plans} plan · ${t.items} cheezein`} />
        <StatTile icon={CheckCircle2} label="Ban gaya" value={fmtQty(t.produced)} sub={`${t.doneRate}% poora${t.pending ? ` · ${t.pending} abhi baqi` : ''}`} tone="green" />
        <StatTile icon={Flame} label="Kharab hua" value={fmtQty(t.failed)} sub={`${t.failRate}% nuqsaan`} tone={t.failRate > 5 ? 'rose' : 'amber'} />
        <StatTile icon={Wheat} label="Saamaan ki cost" value={costHidden ? '••••' : cost(t.cost ?? 0)} sub="Jin cheezon par recipe se saamaan ghata" tone="violet" />
      </div>

      <Card className="rounded-2xl" title={<CardTitle icon={CalendarDays}>Har din</CardTitle>} description="Socha kitna, bana kitna, kharab kitna">
        {!days.length ? <EmptyChart text="Is period me koi plan nahi" /> : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                <Tooltip {...theme.tooltip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="planned" name="Socha" fill={theme.primarySoft} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="produced" name="Bana" fill={theme.profit} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="failed" name="Kharab" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<CardTitle icon={ChefHat}>Sab se zyada kya banta hai</CardTitle>} description="Bane hue pieces">
          <RankedBars rows={d.byProduct.map((p) => ({ key: p.productId ?? p.name, label: p.name, value: p.produced, display: `${fmtQty(p.produced)} / ${fmtQty(p.planned)}`, sub: p.failed ? `${fmtQty(p.failed)} kharab · ${p.failRate}%` : undefined }))} empty="Abhi kuch nahi bana" />
        </Card>
        <Card className="rounded-2xl" title={<CardTitle icon={Flame}>Kis cheez me kharabi zyada</CardTitle>} description="Kharab hone ki sharah">
          <RankedBars rows={worst.map((p) => ({ key: p.productId ?? p.name, label: p.name, value: p.failRate, display: `${p.failRate}%`, sub: `${fmtQty(p.failed)} kharab, ${fmtQty(p.produced)} theek`, color: '#e11d48' }))} empty="Kuch kharab nahi hua — shabash" />
        </Card>
        <Card className="rounded-2xl" title={<CardTitle icon={Clock}>Shift</CardTitle>} description="Kis shift me kitna kaam">
          <RankedBars rows={d.byShift.map((s) => ({ key: s.key, label: s.key, value: s.produced, display: `${fmtQty(s.produced)} bane`, sub: s.failed ? `${s.failRate}% kharab` : undefined, color: '#0ea5e9' }))} />
        </Card>
        <Card className="rounded-2xl" title={<CardTitle icon={Users}>Baker</CardTitle>} description="Jin lines par baker ka naam likha">
          <RankedBars rows={d.byBaker.map((s) => ({ key: s.key, label: s.key, value: s.produced, display: `${fmtQty(s.produced)} bane`, sub: s.failed ? `${s.failRate}% kharab` : undefined, color: '#8b5cf6' }))} empty="Kisi line par baker ka naam nahi" />
        </Card>
      </div>
    </div>
  );
}
