/**
 * Agri tab: profit by kind (seed, fertiliser, spray, feed, tools), by
 * season, per kilo for bagged goods, and what is left at the bulk rate.
 * A bag shows a big profit per bag but a small one per kilo, and a farmer
 * taking twenty bags at the bulk rate can halve the margin.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Package } from 'lucide-react';
import { Card, Segmented, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { agriProductsApi, type AgriProductProfile } from '@industries/agri/api/products.api';
import { isMeasured, SEASONS } from '@industries/agri/lib/agriUnits';
import { deriveAgriKind, isFeedKind, isFertKind, isSeedKind, isSprayKind, prettyAgriKind, type AgriKind } from '@industries/agri/lib/agriCategory';
import type { ProfitPanelProps } from '../../config';
import { pct, qty } from '../meta';
import { usePeriodItems } from './usePeriodItems';

type Group = 'seed' | 'fert' | 'spray' | 'feed' | 'tool';
const GROUP_LABEL: Record<Group, string> = { seed: '🌱 Beej', fert: '🧪 Khaad', spray: '🐛 Dawa', feed: '🐄 Feed', tool: '🔧 Auzaar / baqi' };
const groupOf = (k: AgriKind): Group => (isSeedKind(k) ? 'seed' : isFertKind(k) ? 'fert' : isSprayKind(k) ? 'spray' : isFeedKind(k) ? 'feed' : 'tool');

export function AgriPanel({ filters, fmt }: ProfitPanelProps) {
  const theme = useChartTheme();
  const items = usePeriodItems(filters);
  const profiles = useQuery({ queryKey: ['agri-profiles-all'], queryFn: () => agriProductsApi.list({}).catch(() => [] as AgriProductProfile[]), staleTime: 5 * 60_000 });
  const [by, setBy] = useState<'kind' | 'season'>('kind');
  const [onlyProblems, setOnlyProblems] = useState(false);

  const rows = useMemo(() => {
    const profileBy = new Map((profiles.data ?? []).map((p) => [p.productId, p]));
    return (items.data?.items ?? []).filter((r) => r.productId).map((r) => {
      const p = profileBy.get(r.productId!);
      const kind = (p?.category as AgriKind | undefined) ?? deriveAgriKind(r.category?.name, r.name);
      const pack = p?.packSize && Number(p.packSize) > 0 && !isMeasured(r.unit) ? Number(p.packSize) : 0;
      const bulkPct = Number(p?.bulkDiscountPct || 0);
      const bulkPrice = bulkPct > 0 ? r.avgPrice * (1 - bulkPct / 100) : 0;
      const bulkMargin = bulkPrice > 0 ? ((bulkPrice - (r.avgCost ?? 0)) / bulkPrice) * 100 : null;
      return {
        ...r, kind, group: groupOf(kind), season: p?.season ?? null, pack, packUnit: p?.packUnit ?? 'kg',
        perPack: pack > 0 && r.qty > 0 ? (r.profit ?? 0) / (r.qty * pack) : null,
        bulkPct, bulkPrice, bulkMargin,
        // Margin at the bulk rate below half the normal margin is a hidden problem.
        bulkRisk: bulkMargin !== null && bulkMargin < (r.margin ?? 0) / 2,
      };
    });
  }, [items.data, profiles.data]);

  const chart = useMemo(() => {
    const m = new Map<string, { name: string; sale: number; profit: number }>();
    for (const r of rows) {
      const name = by === 'kind' ? GROUP_LABEL[r.group] : (() => { const s = SEASONS.find((x) => x.v === r.season); return s ? `${s.e} ${s.l}` : 'Likha nahi'; })();
      const e = m.get(name) ?? { name, sale: 0, profit: 0 };
      e.sale += r.revenue; e.profit += r.profit ?? 0;
      m.set(name, e);
    }
    return [...m.values()].sort((a, b) => b.sale - a.sale);
  }, [rows, by]);

  const bulkGap = rows.reduce((s, r) => s + (r.bulkPrice ? (r.avgPrice - r.bulkPrice) * r.qty : 0), 0);
  const shown = onlyProblems ? rows.filter((r) => r.bulkRisk || (r.profit ?? 0) < 0 || (r.noCostLines ?? 0) > 0) : rows;

  if (items.isLoading || profiles.isLoading) return <Skeleton className="h-72 rounded-3xl" />;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl" title={by === 'kind' ? 'Type war' : 'Mausam war'} description={fmt.costHidden ? 'Sale' : 'Sale aur profit'}
        actions={<Segmented label="Kis hisaab se" value={by} onChange={setBy} items={[{ value: 'kind', label: 'Type' }, { value: 'season', label: 'Mausam' }]} />}>
        {!chart.length ? <p className="py-8 text-center text-[0.875rem] text-slate-500">Koi sale nahi</p> : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n === 'profit' ? 'Profit' : 'Sale']} {...theme.tooltip} />
                <Bar dataKey="sale" fill={theme.primarySoft} radius={[6, 6, 0, 0]} barSize={22} />
                {!fmt.costHidden && <Bar dataKey="profit" fill={theme.profit} radius={[6, 6, 0, 0]} barSize={22} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {!fmt.costHidden && (
        <Card className="rounded-2xl" flush title="Bori aur thok ka hisaab" description={bulkGap > 0 ? `Agar sab thok rate par bikta to ${fmt.money(bulkGap)} kam milte (andaza)` : 'Thok rate kisi product par nahi bhara'}
          actions={(
            <button type="button" onClick={() => setOnlyProblems((v) => !v)}
              className={cn('inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[0.8125rem] font-semibold ring-1', onlyProblems ? 'bg-amber-50 text-amber-800 ring-amber-300' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
              <AlertTriangle className="h-4 w-4" />Sirf masle wali
            </button>
          )}>
          {!shown.length ? <p className="px-4 py-10 text-center text-[0.875rem] text-slate-500">{onlyProblems ? 'Koi masla nahi' : 'Koi sale nahi'}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-[0.8125rem]">
                <thead className="bg-slate-50/70 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-2">Cheez</th><th className="px-3 py-2 text-right">Biki</th><th className="px-3 py-2 text-right">Profit</th><th className="px-3 py-2 text-right">Per kilo / naap</th><th className="px-3 py-2 text-right">Thok rate</th><th className="px-4 py-2 text-right">Thok margin</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shown.map((r) => (
                    <tr key={r.key}>
                      <td className="px-4 py-2">
                        <span className="block font-medium text-slate-900">{r.name}</span>
                        <span className="text-[0.6875rem] text-slate-500">{prettyAgriKind(r.kind)}{r.season ? ` · ${SEASONS.find((s) => s.v === r.season)?.l ?? ''}` : ''}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{qty(r.qty)} {r.unit}{r.pack > 0 && <span className="block text-[0.6875rem] text-slate-400"><Package className="mr-0.5 inline h-3 w-3" />{qty(r.qty * r.pack)} {r.packUnit}</span>}</td>
                      <td className={cn('px-3 py-2 text-right font-semibold tabular-nums', (r.profit ?? 0) < 0 && 'text-rose-700')}>{fmt.cost(r.profit ?? 0)}<span className="block text-[0.6875rem] font-normal text-slate-400">{pct(r.margin)}</span></td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.perPack !== null ? `${fmt.cost(r.perPack)} / ${r.packUnit}` : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.bulkPrice ? `${fmt.money(r.bulkPrice)} (−${r.bulkPct}%)` : '—'}</td>
                      <td className={cn('px-4 py-2 text-right tabular-nums', r.bulkRisk && 'font-semibold text-rose-700')}>{r.bulkMargin !== null ? pct(r.bulkMargin) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
