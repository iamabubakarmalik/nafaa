/**
 * The wastage log for a period: thrown batches, pieces that failed in
 * baking, wasted raw materials and damage reports of made goods, with the
 * reason and the value at cost; and its analytics by day, reason, item and
 * source.
 */

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, ChefHat, Flame, Layers, MessageSquareWarning, Package, Percent, Trash2, Wheat } from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { freshnessApi, type WasteSource } from '../../api/freshness.api';
import { AnalyticsSkeleton, CardTitle, LoadFailed, RankedBars, StatTile } from '../charts';
import { FRESH_KEY, dateTime, fmtQty, keyLabel } from '../meta';

export const SOURCE: Record<WasteSource, { label: string; icon: typeof Flame; color: string }> = {
  BATCH: { label: 'Shelf se phenka', icon: Trash2, color: '#e11d48' },
  BAKING: { label: 'Banate waqt kharab', icon: ChefHat, color: '#ea580c' },
  RAW: { label: 'Raw material', icon: Wheat, color: '#a16207' },
  DAMAGE: { label: 'Damage report', icon: Package, color: '#7c3aed' },
};

export function useWastage(range: { from: string; to: string } | null) {
  return useQuery({ queryKey: [FRESH_KEY, 'wastage', range], queryFn: () => freshnessApi.wastage(range ?? undefined), placeholderData: (p) => p });
}

export function WasteRecord({ range, source, search }: { range: { from: string; to: string } | null; source: '' | WasteSource; search: string }) {
  const { cost } = useMasked();
  const q = useWastage(range);
  const t = search.trim().toLowerCase();
  const rows = (q.data?.rows ?? []).filter((r) => (!source || r.source === source) && (!t || r.name.toLowerCase().includes(t) || r.reason.toLowerCase().includes(t)));
  if (q.isError && !q.data) return <LoadFailed what="Waste ka record" retry={() => q.refetch()} />;
  if (!q.data) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;
  if (!rows.length) return (
    <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
      <Flame className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-3 font-semibold text-slate-900">Is period me koi waste nahi likha</p>
      <p className="mt-1 text-sm text-slate-500">Shelf ka maal "Phenk diya", baking me kharab "Ban gaya" ke waqt, aur raw material "Waste hua" se yahan aata hai.</p>
    </div>
  );
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      {rows.map((r) => {
        const s = SOURCE[r.source];
        return (
          <li key={r.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}17`, color: s.color }}><s.icon className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5"><span className="truncate font-semibold text-slate-900">{r.name}</span><span className="rounded-full px-2 py-0.5 text-[0.6875rem] font-medium" style={{ backgroundColor: `${s.color}14`, color: s.color }}>{s.label}</span></p>
              <p className="truncate text-[0.75rem] text-slate-500">{r.reason}{r.ref ? ` · ${r.ref}` : ''} · {dateTime(r.at)}</p>
            </div>
            <div className="text-right">
              <p className="font-bold tabular-nums text-slate-900">{fmtQty(r.qty)} <span className="text-[0.75rem] font-medium">{r.unit}</span></p>
              <p className="text-[0.6875rem] tabular-nums text-rose-700">{r.cost != null ? cost(r.cost) : '••••'}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function WasteAnalytics({ range, onReason }: { range: { from: string; to: string } | null; onReason: (reason: string) => void }) {
  const theme = useChartTheme();
  const { cost, costHidden } = useMasked();
  const q = useWastage(range);
  const d = q.data;
  if (q.isError && !d) return <LoadFailed what="Analytics" retry={() => q.refetch()} />;
  if (!d) return <AnalyticsSkeleton />;
  const t = d.totals;
  const money = (n?: number) => (costHidden || n == null ? '••••' : cost(n));
  const days = d.byDay.map((b) => ({ ...b, label: keyLabel(b.key) }));
  return (
    <div className="space-y-4">
      {t.wastePct != null && t.wastePct > 10 && (
        <p className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-[0.8125rem] text-rose-900 ring-1 ring-rose-200">
          <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0" />Har 100 bane hue me se {Math.round(t.wastePct)} phenkne par rahe hain. Neeche dekhein kis cheez me sab se zyada — us ka batch chhota karein ya "Kya banana hai" ka andaza istemal karein.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Flame} label="Waste ki cost" value={money(t.cost)} sub={`${t.count} dafa`} tone="rose" />
        <StatTile icon={Trash2} label="Bane hue pieces waste" value={fmtQty(t.pieces)} sub={t.made ? `${fmtQty(t.made)} bane the` : 'Is period me batch nahi bane'} tone="amber" />
        <StatTile icon={Percent} label="Waste ki sharah" value={t.wastePct == null ? '—' : `${t.wastePct}%`} sub="10% se kam rakhein" tone={t.wastePct != null && t.wastePct > 10 ? 'rose' : 'green'} />
        <StatTile icon={Layers} label="Sab se bari wajah" value={d.byReason[0]?.key ?? '—'} sub={d.byReason[0] ? money(d.byReason[0].cost) : undefined} tone="violet" />
      </div>
      {!costHidden && (
        <Card className="rounded-2xl" title={<CardTitle icon={CalendarDays}>Har din ka waste</CardTitle>} description="Cost ke hisaab se">
          {!days.length ? <p className="py-10 text-center text-sm text-slate-500">Is period me kuch waste nahi</p> : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                  <Tooltip formatter={(v) => [cost(Number(v)), 'Waste']} {...theme.tooltip} />
                  <Bar dataKey="cost" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<CardTitle icon={MessageSquareWarning}>Wajah</CardTitle>} description="Kyun phenkna para — click karein to record me sirf woh">
          <RankedBars onPick={onReason} rows={d.byReason.map((b) => ({ key: b.key, label: b.key, value: b.cost ?? b.qty, display: `${b.count} dafa · ${money(b.cost)}`, color: '#e11d48' }))} />
        </Card>
        <Card className="rounded-2xl" title={<CardTitle icon={Package}>Kis cheez ka zyada</CardTitle>} description="Cheez ke hisaab se">
          <RankedBars rows={d.byItem.map((b) => ({ key: b.key, label: b.key, value: b.cost ?? b.qty, display: `${fmtQty(b.qty)} · ${money(b.cost)}`, color: '#ea580c' }))} />
        </Card>
      </div>
      <Card className="rounded-2xl" title={<CardTitle icon={Layers}>Kahan se</CardTitle>} description="Shelf, baking, raw material ya damage">
        <div className="grid gap-3 sm:grid-cols-4">
          {(Object.keys(SOURCE) as WasteSource[]).map((k) => {
            const b = d.bySource.find((x) => x.key === k);
            const s = SOURCE[k];
            return (
              <div key={k} className={cn('rounded-xl p-3 ring-1 ring-slate-200', !b && 'opacity-60')}>
                <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium" style={{ color: s.color }}><s.icon className="h-4 w-4" />{s.label}</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{money(b?.cost ?? 0)}</p>
                <p className="text-[0.6875rem] text-slate-500">{b ? `${b.count} dafa · ${fmtQty(b.qty)}` : 'Kuch nahi'}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
