/** Maal: best and weakest sellers, categories, brands and stock that did not sell. */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Layers, PackageX, Tag, Trophy } from 'lucide-react';
import { Segmented } from '@/design-system/components';
import type { ItemRow, ItemsReport } from '../api';
import { BarList, DataTable, Donut, Panel, type Formatter } from './parts';

type ListId = 'revenue' | 'profit' | 'qty' | 'lowest';

export function ItemsSection({ data: d, f, label }: { data: ItemsReport; f: Formatter; label: string }) {
  const showCost = !f.costHidden && d.totals.profit != null;
  const [list, setList] = useState<ListId>('revenue');
  const rows: ItemRow[] = list === 'profit' ? d.topProfit : list === 'qty' ? d.topQty : list === 'lowest' ? d.lowest : d.topRevenue;
  const cats = d.categories.slice(0, 8);
  return (
    <div className="space-y-4">
      {showCost && d.totals.noCostLines > 0 && (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {d.totals.noCostLines} sale lines par cost 0 thi — un ka profit poori sale gina gaya. Product par cost bharein taake aage sahi aaye.
        </p>
      )}

      <Panel icon={Trophy} title={`${label} — kya bika`} hint={`${d.totals.products} cheezein bikin · ${f.qty(d.totals.qty)} nag`}
        actions={<Segmented label="List" value={list} onChange={setList} items={[
          { value: 'revenue', label: 'Sale' }, ...(showCost ? [{ value: 'profit' as const, label: 'Profit' }] : []),
          { value: 'qty', label: 'Quantity' }, { value: 'lowest', label: 'Kam bika' },
        ]} />}>
        <DataTable rows={rows} rowKey={(r) => r.id} empty="Is period me kuch nahi bika" columns={[
          { label: '#', render: (_r, i) => <span className="text-slate-400">{i + 1}</span> },
          { label: 'Cheez', render: (r) => <span className="font-medium text-slate-900">{r.name}{r.category && <span className="ml-1.5 text-[0.75rem] font-normal text-slate-500">{r.category}</span>}</span> },
          { label: 'Quantity', align: 'right', render: (r) => `${f.qty(r.qty)} ${r.unit}` },
          { label: 'Bill', align: 'right', render: (r) => r.bills },
          { label: 'Sale', align: 'right', render: (r) => <span className="font-semibold">{f.money(r.revenue)}</span> },
          { label: 'Profit', align: 'right', hide: !showCost, render: (r) => <span className={(r.profit ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-700'}>{f.cost(r.profit)}</span> },
          { label: 'Margin', align: 'right', hide: !showCost, render: (r) => `${(r.margin ?? 0).toFixed(0)}%` },
        ]} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Layers} title="Category war">
          {cats.length ? <Donut f={f} fmt="money" data={cats.map((c) => ({ name: c.name, value: c.revenue, color: c.color ?? undefined }))} /> : null}
          <div className="mt-3">
            <DataTable rows={d.categories} rowKey={(c) => c.id ?? 'none'} empty="Koi sale nahi" columns={[
              { label: 'Category', render: (c) => c.name },
              { label: 'Cheezein', align: 'right', render: (c) => c.products },
              { label: 'Sale', align: 'right', render: (c) => f.money(c.revenue) },
              { label: 'Profit', align: 'right', hide: !showCost, render: (c) => f.cost(c.profit) },
            ]} />
          </div>
        </Panel>
        <Panel icon={Tag} title="Brand war">
          <BarList f={f} fmt="money" empty="Koi sale nahi"
            rows={d.brands.slice(0, 15).map((b) => ({ key: b.id ?? 'none', name: b.name, value: b.revenue, hint: `${b.products} cheezein${showCost ? ` · profit ${f.cost(b.profit)}` : ''}` }))} />
        </Panel>
      </div>

      <Panel icon={PackageX} title="Ruka hua maal" hint={`Stock me hai magar is period me nahi bika · ${d.totals.slowCount} cheezein${showCost && d.totals.stockValue != null ? ` · cost ${f.cost(d.totals.stockValue)}` : ''}`}
        actions={<Link to="/low-stock" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Low stock →</Link>}>
        <DataTable rows={d.slow} rowKey={(r) => r.id} empty="Sab maal bik raha hai" columns={[
          { label: 'Cheez', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
          { label: 'Stock', align: 'right', render: (r) => `${f.qty(r.stock)} ${r.unit}` },
          { label: 'Cost', align: 'right', hide: !showCost, render: (r) => f.cost(r.stockValue) },
          { label: 'Aakhri bar bika', align: 'right', render: (r) => (r.lastSold ? f.date(r.lastSold) : 'Kabhi nahi') },
        ]} />
      </Panel>
    </div>
  );
}
