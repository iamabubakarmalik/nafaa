/**
 * Profit grouped by one dimension (category, brand, supplier, staff) and by
 * day or month, each row against the previous period.
 */

import { Table, THead, TBody, Tr, Th, Td } from '@/design-system/components';
import type { ElementType } from 'react';
import { cn } from '@core/lib/cn';
import type { ProfitDim, ProfitOverview } from '../api';
import { Change, MarginBar } from './ProductRows';
import { change, dayLabel, qty } from './meta';

interface Fmt { money: (n: number) => string; cost: (n: number) => string; costHidden: boolean }

const GRID = 'lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.9fr)]';

export function DimTable({ rows, title, note, fmt, onPick }: {
  rows: ProfitDim[];
  title: string;
  note?: string;
  fmt: Fmt;
  /** Filters the page by this row (category, brand, staff). */
  onPick?: (row: ProfitDim) => void;
}) {
  if (!rows.length) return <Empty text="Is period me kuch nahi bika" />;
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      {note && <p className="border-b border-slate-100 px-4 py-2.5 text-[0.75rem] text-slate-500">{note}</p>}
      <div className={cn('hidden gap-x-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500 lg:grid', GRID)}>
        <span>{title}</span><span className="text-right">Sale · hissa</span><span className="text-right">Cost</span><span className="text-right">Profit</span><span className="text-right">Margin</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => {
          const loss = (r.profit ?? 0) < 0;
          const pickable = !!onPick && r.id !== 'none';
          const Tag: ElementType = pickable ? 'button' : 'div';
          return (
            <li key={r.id}>
              <Tag type={pickable ? 'button' : undefined} onClick={pickable ? () => onPick?.(r) : undefined} title={pickable ? 'Is par filter lagayein' : undefined}
                className={cn('grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-left', GRID, pickable && 'hover:bg-slate-50')}>
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color ?? '#94a3b8' }} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-900">{r.name}</span>
                    <span className="block text-[0.75rem] text-slate-500">
                      {[r.products ? `${r.products} cheezein` : null, r.bills ? `${r.bills} bill` : null, `${qty(r.qty)} biki`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </span>
                <span className="text-right lg:hidden">
                  <span className={cn('block font-bold tabular-nums', loss && !fmt.costHidden ? 'text-rose-700' : 'text-slate-900')}>{fmt.cost(r.profit ?? 0)}</span>
                  <span className="block text-[0.75rem] tabular-nums text-slate-500">{fmt.money(r.revenue)} · {r.share.toFixed(0)}%</span>
                </span>
                <span className="hidden text-right lg:block">
                  <span className="block font-medium tabular-nums text-slate-900">{fmt.money(r.revenue)}</span>
                  <span className="mt-1 ml-auto block h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.min(r.share, 100)}%` }} /></span>
                  <span className="text-[0.6875rem] text-slate-400">{r.share.toFixed(1)}% · pehle {fmt.money(r.prevRevenue)}</span>
                </span>
                <span className="hidden text-right tabular-nums text-slate-700 lg:block">{fmt.cost(r.cost ?? 0)}</span>
                <span className="hidden text-right lg:block">
                  <span className={cn('block font-bold tabular-nums', loss && !fmt.costHidden ? 'text-rose-700' : 'text-slate-900')}>{fmt.cost(r.profit ?? 0)}</span>
                  {!fmt.costHidden && <Change c={change(r.profit, r.prevProfit)} />}
                </span>
                <span className="hidden text-right lg:block"><MarginBar margin={r.margin} hidden={fmt.costHidden} /></span>
              </Tag>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function DayTable({ data, fmt }: { data: ProfitOverview; fmt: Fmt }) {
  const rows = [...data.trend].reverse().filter((d) => d.bills > 0 || d.revenue !== 0);
  if (!rows.length) return <Empty text="Is period me koi sale nahi" />;
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <div className="overflow-x-auto">
        <Table minWidth="40rem" className="[&>table]:text-[0.875rem]">
          <THead className="bg-slate-50/70 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
            <Tr>
              <Th className="px-4 py-2.5">{data.range.byMonth ? 'Mahina' : 'Din'}</Th>
              <Th className="px-3 py-2.5 text-right">Bill</Th>
              <Th className="px-3 py-2.5 text-right">Sale</Th>
              <Th className="px-3 py-2.5 text-right">Discount</Th>
              <Th className="px-3 py-2.5 text-right">Return</Th>
              <Th className="px-3 py-2.5 text-right">Cost</Th>
              <Th className="px-3 py-2.5 text-right">Profit</Th>
              <Th className="px-4 py-2.5 text-right">Margin</Th>
            </Tr>
          </THead>
          <TBody className="divide-y divide-slate-100">
            {rows.map((d) => (
              <Tr key={d.key}>
                <Td className="px-4 py-2.5 font-medium text-slate-900">{dayLabel(d.key)}</Td>
                <Td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{d.bills}</Td>
                <Td className="px-3 py-2.5 text-right tabular-nums text-slate-900">{fmt.money(d.revenue)}</Td>
                <Td className="px-3 py-2.5 text-right tabular-nums text-pink-700">{d.discount ? fmt.money(d.discount) : '—'}</Td>
                <Td className="px-3 py-2.5 text-right tabular-nums text-orange-700">{d.refund ? fmt.money(d.refund) : '—'}</Td>
                <Td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{fmt.cost(d.cost ?? 0)}</Td>
                <Td className={cn('px-3 py-2.5 text-right font-semibold tabular-nums', (d.profit ?? 0) < 0 && !fmt.costHidden ? 'text-rose-700' : 'text-slate-900')}>{fmt.cost(d.profit ?? 0)}</Td>
                <Td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{fmt.costHidden ? '••' : `${(d.margin ?? 0).toFixed(1)}%`}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
    </section>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="rounded-3xl bg-white px-6 py-14 text-center text-[0.875rem] text-slate-500 ring-1 ring-slate-200/80">{text}</div>;
}
