/**
 * Stitching analytics for a period of booking dates: orders booked and
 * delivered by day, garments that are stitched most, each karigar's work,
 * and how often suits are ready on the promised day.
 */

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Ban, CalendarDays, CheckCircle2, Clock, Scissors, Shirt, UserRound, Wallet } from 'lucide-react';
import { Card } from '@/design-system/components';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { tailoringApi } from '../../api/tailoring.api';
import { AnalyticsSkeleton, CardTitle, LoadFailed, RankedBars, StatTile } from '../charts';
import { TAILORING_KEY, garmentLabel } from '../meta';

const dayLabel = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export function TailoringAnalytics({ range }: { range: { from: string; to: string } | null }) {
  const theme = useChartTheme();
  const { sales } = useMasked();
  const q = useQuery({ queryKey: [TAILORING_KEY, 'summary', range], queryFn: () => tailoringApi.summary(range ?? undefined), placeholderData: (p) => p });
  const d = q.data;
  if (q.isError && !d) return <LoadFailed what="Analytics" retry={() => q.refetch()} />;
  if (!d) return <AnalyticsSkeleton />;
  const p = d.period;
  const days = p.byDay.map((b) => ({ ...b, label: dayLabel(b.day) }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Scissors} label="Book hue" value={p.booked} sub={sales(p.bookedValue)} tone="brand" />
        <StatTile icon={CheckCircle2} label="De diye" value={p.delivered} sub={`${sales(p.deliveredValue)} ki silai`} tone="green" />
        <StatTile icon={Clock} label="Waqt par diye" value={p.onTimePct === null ? '—' : `${p.onTimePct}%`} sub={p.avgDays === null ? 'Abhi koi diya nahi' : `Ausat ${p.avgDays} din me tayyar`} tone="violet" />
        <StatTile icon={Ban} label="Cancel" value={p.cancelled} sub="Is period me book ho kar cancel" tone="rose" />
      </div>

      <Card className="rounded-2xl" title={<CardTitle icon={CalendarDays}>Har din ka kaam</CardTitle>} description="Kitne order book hue aur kitne diye — diye hue ki silai ki amount">
        {!days.length ? <p className="py-10 text-center text-sm text-slate-500">Is period me koi order nahi</p> : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                <Tooltip formatter={(v, n) => [v, n === 'booked' ? 'Book hue' : 'De diye']} {...theme.tooltip} />
                <Bar dataKey="booked" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="delivered" fill={theme.highlight} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<CardTitle icon={Shirt}>Kya zyada silwaya</CardTitle>} description="Book hue kapre — pieces aur amount">
          <RankedBars rows={p.garments.map((g) => ({ key: g.key, label: garmentLabel(g.key), value: g.pieces, display: `${g.pieces} pc · ${sales(g.value)}` }))} />
        </Card>
        <Card className="rounded-2xl" title={<CardTitle icon={UserRound}>Karigar ka kaam</CardTitle>} description="Diye hue orders, karigar ke hisaab se">
          <RankedBars rows={p.tailors.map((t) => ({ key: t.id || 'none', label: t.name, value: t.orders, display: `${t.orders} · ${sales(t.value)}`, color: '#8b5cf6' }))} empty="Is period me koi order diya nahi gaya" />
        </Card>
      </div>

      <Card className="rounded-2xl" title={<CardTitle icon={Wallet}>Abhi chal rahe orders ka paisa</CardTitle>}>
        <dl className="grid gap-3 text-[0.875rem] sm:grid-cols-3">
          <div><dt className="text-slate-500">Kul amount</dt><dd className="text-lg font-bold tabular-nums">{sales(d.open.value)}</dd></div>
          <div><dt className="text-slate-500">Advance mila (khate me jama)</dt><dd className="text-lg font-bold tabular-nums text-success-700">{sales(d.open.advance)}</dd></div>
          <div><dt className="text-slate-500">Lena baqi</dt><dd className="text-lg font-bold tabular-nums text-amber-700">{sales(d.open.due)}</dd></div>
        </dl>
      </Card>
    </div>
  );
}
