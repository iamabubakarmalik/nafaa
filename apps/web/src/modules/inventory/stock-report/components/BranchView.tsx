/**
 * Branches side by side: value, lines, out and dead stock, sales in the
 * period; the most valuable lines per branch; and stock worth sending from
 * a branch where it sits to one where it sells.
 */

import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, ArrowRightLeft, Building2, Crown } from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { StockBranches } from '../api/stock-report.api';
import { qty } from './meta';

export function BranchView({ data, loading, money, cost, costHidden, onOpen }: {
  data?: StockBranches;
  loading: boolean;
  money: (n: number) => string;
  cost: (n: number) => string;
  costHidden: boolean;
  onOpen: (productId: string) => void;
}) {
  const theme = useChartTheme();
  if (loading || !data) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>;
  if (!data.shops.length) {
    return <p className="rounded-3xl bg-white px-6 py-14 text-center text-[0.875rem] text-slate-500 ring-1 ring-slate-200/80">Branches ka muqabla "Sab branches" chun kar dekhein — upar se branch badlein.</p>;
  }
  const name = (id: string) => data.shops.find((s) => s.shopId === id)?.name ?? '';
  const top = Math.max(...data.shops.map((s) => (costHidden ? s.retail : s.cost)), 1);
  const chart = data.shops.map((s) => ({ name: s.name, value: costHidden ? s.retail : s.cost, sold: s.sold.revenue }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.shops.map((s) => (
          <div key={s.shopId} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-center justify-between gap-2">
              <p className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-900"><Building2 className="h-4 w-4 shrink-0 text-brand-600" /><span className="truncate">{s.name}</span>{s.isMain && <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="Main branch" />}</p>
              <span className="text-[0.75rem] text-slate-500">{s.lines} cheezein</span>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{costHidden ? money(s.retail) : cost(s.cost)}</p>
            <p className="text-[0.75rem] text-slate-500">{costHidden ? 'bechne par' : `cost · bechne par ${money(s.retail)}`}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${((costHidden ? s.retail : s.cost) / top) * 100}%` }} /></div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-[0.75rem]">
              <div><dt className="text-slate-500">Khatam</dt><dd className={cn('font-semibold tabular-nums', s.out ? 'text-rose-700' : 'text-slate-900')}>{s.out}</dd></div>
              <div><dt className="text-slate-500">Kam</dt><dd className={cn('font-semibold tabular-nums', s.low ? 'text-amber-700' : 'text-slate-900')}>{s.low}</dd></div>
              <div><dt className="text-slate-500">Dead</dt><dd className="font-semibold tabular-nums text-violet-700">{s.dead.count} · {cost(s.dead.cost)}</dd></div>
            </dl>
            <p className="mt-2 border-t border-slate-100 pt-2 text-[0.75rem] text-slate-600">Period me sale <b className="tabular-nums text-slate-900">{money(s.sold.revenue)}</b></p>
          </div>
        ))}
      </div>

      <Card className="rounded-2xl" title="Stock aur sale — branch war" description={costHidden ? 'Stock bechne ki qeemat par' : 'Stock cost par'}>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} />
              <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
              <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n === 'value' ? 'Stock' : 'Sale']} {...theme.tooltip} />
              <Legend formatter={(v) => (v === 'value' ? 'Stock' : 'Sale')} />
              <Bar dataKey="value" fill={theme.primary} radius={[6, 6, 0, 0]} barSize={26} />
              <Bar dataKey="sold" fill={theme.highlight} radius={[6, 6, 0, 0]} barSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {data.moves.length > 0 && (
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><ArrowRightLeft className="h-4 w-4 text-brand-600" />Branch se branch bhejein</span>}
          description="Ek branch me khatam ya kam aur bik raha hai, doosri me zyada para hai" actions={<Link to="/transfers" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Transfer banayein →</Link>}>
          <ul className="divide-y divide-slate-100">
            {data.moves.map((m) => (
              <li key={`${m.productId}${m.to}`}>
                <button type="button" onClick={() => onOpen(m.productId)} className="flex w-full flex-wrap items-center justify-between gap-2 py-2 text-left text-[0.8125rem] hover:opacity-80">
                  <span className="min-w-0 font-medium text-slate-800">{m.name}</span>
                  <span className="flex items-center gap-1.5 text-slate-600">{name(m.from)} <ArrowRight className="h-3.5 w-3.5" /> {name(m.to)} · <b className="tabular-nums text-slate-900">{qty(m.qty)} {m.unit}</b></span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="rounded-2xl" title="Qeemti maal — har branch me kitna" description="Bechne ki qeemat par sab se bari 25 cheezein">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-[0.8125rem]">
            <thead className="text-left text-[0.6875rem] uppercase tracking-wide text-slate-500">
              <tr><th className="py-2 pr-2">Cheez</th>{data.shops.map((s) => <th key={s.shopId} className="px-2 py-2 text-right">{s.name}</th>)}<th className="py-2 pl-2 text-right">Kul</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.matrix.map((r) => (
                <tr key={r.productId} className="cursor-pointer hover:bg-slate-50" onClick={() => onOpen(r.productId)}>
                  <td className="py-2 pr-2 font-medium text-slate-900">{r.name}</td>
                  {data.shops.map((s) => {
                    const p = r.shops.find((x) => x.shopId === s.shopId);
                    return <td key={s.shopId} className={cn('px-2 py-2 text-right tabular-nums', !p || p.stock <= 0 ? 'text-rose-600' : 'text-slate-800')}>{qty(p?.stock ?? 0)}{p?.sold ? <span className="block text-[0.6875rem] text-slate-400">biki {qty(p.sold)}</span> : null}</td>;
                  })}
                  <td className="py-2 pl-2 text-right font-semibold tabular-nums">{qty(r.stock)} {r.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
