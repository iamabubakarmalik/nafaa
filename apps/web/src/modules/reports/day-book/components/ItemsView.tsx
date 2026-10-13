/**
 * Maal tab: every item sold in the day with quantity, returns, bills,
 * revenue (after the bill discount) and profit; grouped or flat, sorted
 * and narrowed by category and the page search. Categories chart on top.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Layers, Package } from 'lucide-react';
import { Segmented } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { DayBook } from '../api';
import { qty, type Money } from '../print';
import { Empty, Panel, Tag, TableWrap, td, tdR, th, thR } from './parts';

type Sort = 'revenue' | 'qty' | 'profit' | 'name';

export function ItemsView({ d, m, q }: { d: DayBook; m: Money; q: string }) {
  const theme = useChartTheme();
  const [sort, setSort] = useState<Sort>('revenue');
  const [cat, setCat] = useState<string | null | 'all'>('all');
  const items = useMemo(() => {
    const list = d.items.filter((i) => (cat === 'all' || (i.categoryId ?? null) === cat)
      && (!q || i.name.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)));
    const key = (i: (typeof list)[number]) => (sort === 'qty' ? i.qty : sort === 'profit' ? i.profit ?? 0 : i.revenue);
    return [...list].sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : key(b) - key(a)));
  }, [d.items, cat, q, sort]);
  const sum = items.reduce((a, i) => ({ qty: a.qty + i.qty, revenue: a.revenue + i.revenue, profit: a.profit + (i.profit ?? 0) }), { qty: 0, revenue: 0, profit: 0 });
  const chart = d.categories.slice(0, 10).map((c) => ({ name: c.name, value: c.revenue, color: c.color ?? theme.primary, id: c.id }));

  if (!d.items.length) return <Panel icon={Package} title="Kya bika"><Empty icon={Package} text="Is din kuch nahi bika" /></Panel>;

  return (
    <div className="space-y-4">
      <Panel icon={Layers} title="Category war sale" hint="Bar par dabayein: sirf us category ka maal">
        <div style={{ height: Math.max(chart.length * 34, 120) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} horizontal={false} />
              <XAxis type="number" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} />
              <YAxis type="category" dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} width={120} />
              <Tooltip {...theme.tooltip} formatter={(v) => [m.sales(Number(v)), 'Sale']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16} cursor="pointer"
                onClick={(e) => { const id = (e as { payload?: { id: string | null } }).payload?.id; if (id !== undefined) setCat(id === cat ? 'all' : id); }}>
                {chart.map((c) => <Cell key={c.name} fill={c.color} fillOpacity={cat === 'all' || cat === c.id ? 1 : 0.35} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel icon={Package} title="Item war hisaab" flush
        hint={`${items.length} item · ${qty(sum.qty)} cheezein · ${m.sales(sum.revenue)}${m.costHidden ? '' : ` · profit ${m.cost(sum.profit)}`}. Amount bill ke discount ke baad, return nikal kar.`}
        actions={<Segmented label="Sort" value={sort} onChange={setSort} items={[
          { value: 'revenue', label: 'Amount' }, { value: 'qty', label: 'Qty' }, ...(m.costHidden ? [] : [{ value: 'profit' as const, label: 'Profit' }]), { value: 'name', label: 'Naam' },
        ]} />}>
        <div className="flex flex-wrap gap-1.5 px-4 pb-3 sm:px-5">
          <Chip active={cat === 'all'} onClick={() => setCat('all')}>Sab</Chip>
          {d.categories.map((c) => (
            <Chip key={c.id ?? 'none'} active={cat === c.id} onClick={() => setCat(c.id)} color={c.color}>{c.name} · {qty(c.qty)}</Chip>
          ))}
        </div>
        <div className="px-4 pb-4 sm:px-5">
          {!items.length ? <Empty icon={Package} text="Koi item nahi mila" hint="Search ya category badlein" /> : (
            <TableWrap minWidth="40rem">
              <thead><tr>
                <th className={th}>Cheez</th><th className={thR}>Bika</th><th className={thR}>Wapas</th><th className={thR}>Net qty</th><th className={thR}>Bill</th><th className={thR}>Amount</th>
                {!m.costHidden && <><th className={thR}>Cost</th><th className={thR}>Profit</th></>}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i) => {
                  const margin = i.revenue > 0 && i.profit != null ? (i.profit / i.revenue) * 100 : null;
                  return (
                    <tr key={i.productId ?? i.name} className="hover:bg-slate-50/70">
                      <td className={td}>
                        {i.productId ? <Link to={`/products/${i.productId}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{i.name}</Link> : <span className="font-medium text-slate-900">{i.name}</span>}
                        <p className="text-[0.6875rem] text-slate-500">{i.category}{i.sku ? ` · ${i.sku}` : ''}</p>
                      </td>
                      <td className={tdR}>{qty(i.soldQty)} <span className="text-slate-400">{i.unit}</span></td>
                      <td className={tdR}>{i.returnedQty ? <Tag tone="rose">{qty(i.returnedQty)}</Tag> : '—'}</td>
                      <td className={`${tdR} font-semibold text-slate-900`}>{qty(i.qty)}</td>
                      <td className={tdR}>{i.bills}</td>
                      <td className={`${tdR} font-semibold text-slate-900`}>{m.sales(i.revenue)}</td>
                      {!m.costHidden && <>
                        <td className={tdR}>{m.cost(i.cost)}</td>
                        <td className={cn(tdR, (i.profit ?? 0) < 0 ? 'text-rose-700' : 'text-success-700')}>{m.cost(i.profit)}{margin != null && <span className="block text-[0.6875rem] text-slate-400">{margin.toFixed(0)}%</span>}</td>
                      </>}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr className="border-t border-slate-200 font-semibold text-slate-900">
                <td className={td}>Kul</td><td className={tdR} /><td className={tdR} /><td className={tdR}>{qty(sum.qty)}</td><td className={tdR} />
                <td className={tdR}>{m.sales(sum.revenue)}</td>
                {!m.costHidden && <><td className={tdR} /><td className={tdR}>{m.cost(sum.profit)}</td></>}
              </tr></tfoot>
            </TableWrap>
          )}
        </div>
      </Panel>
    </div>
  );
}

function Chip({ active, onClick, color, children }: { active: boolean; onClick: () => void; color?: string | null; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[0.75rem] font-semibold ring-1 transition',
        active ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      {children}
    </button>
  );
}
