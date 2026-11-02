/** Maal: best and weakest sellers, categories, brands and stock that did not sell. */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Layers, PackageX, Tag, Trophy } from 'lucide-react';
import { Segmented } from '@/design-system/components';
import type { ItemRow, ItemsReport } from '../api';
import { BarList, DataTable, Donut, Panel, type Formatter } from './parts';
import { t } from '@core/i18n';

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
          {t('{{noCostLines}} sale lines par cost 0 thi — un ka profit poori sale gina gaya. Product par cost bharein taake aage sahi aaye.', { noCostLines: d.totals.noCostLines })}
        </p>
      )}

      <Panel icon={Trophy} title={t('{{label}} — kya bika', { label })} hint={t('{{products}} cheezein bikin · {{qty}} nag', { products: d.totals.products, qty: f.qty(d.totals.qty) })}
        actions={<Segmented label={t('List')} value={list} onChange={setList} items={[
          { value: 'revenue', label: t('Sale') }, ...(showCost ? [{ value: 'profit' as const, label: t('Profit') }] : []),
          { value: 'qty', label: t('Quantity') }, { value: 'lowest', label: t('Kam bika') },
        ]} />}>
        <DataTable rows={rows} rowKey={(r) => r.id} empty={t('Is period me kuch nahi bika')} columns={[
          { label: '#', render: (_r, i) => <span className="text-slate-400">{i + 1}</span> },
          { label: t('Cheez'), render: (r) => <span className="font-medium text-slate-900">{r.name}{r.category && <span className="ms-1.5 text-[0.75rem] font-normal text-slate-500">{r.category}</span>}</span> },
          { label: t('Quantity'), align: 'right', render: (r) => `${f.qty(r.qty)} ${r.unit}` },
          { label: t('Bill'), align: 'right', render: (r) => r.bills },
          { label: t('Sale'), align: 'right', render: (r) => <span className="font-semibold">{f.money(r.revenue)}</span> },
          { label: t('Profit'), align: 'right', hide: !showCost, render: (r) => <span className={(r.profit ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-700'}>{f.cost(r.profit)}</span> },
          { label: t('Margin'), align: 'right', hide: !showCost, render: (r) => `${(r.margin ?? 0).toFixed(0)}%` },
        ]} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Layers} title={t('Category war')}>
          {cats.length ? <Donut f={f} fmt="money" data={cats.map((c) => ({ name: c.name, value: c.revenue, color: c.color ?? undefined }))} /> : null}
          <div className="mt-3">
            <DataTable rows={d.categories} rowKey={(c) => c.id ?? 'none'} empty={t('Koi sale nahi')} columns={[
              { label: t('Category'), render: (c) => c.name },
              { label: t('Cheezein'), align: 'right', render: (c) => c.products },
              { label: t('Sale'), align: 'right', render: (c) => f.money(c.revenue) },
              { label: t('Profit'), align: 'right', hide: !showCost, render: (c) => f.cost(c.profit) },
            ]} />
          </div>
        </Panel>
        <Panel icon={Tag} title={t('Brand war')}>
          <BarList f={f} fmt="money" empty={t('Koi sale nahi')}
            rows={d.brands.slice(0, 15).map((b) => ({ key: b.id ?? 'none', name: b.name, value: b.revenue, hint: t('{{products}} cheezein{{value}}', { products: b.products, value: showCost ? t(' · profit {{profit}}', { profit: f.cost(b.profit) }) : '' }) }))} />
        </Panel>
      </div>

      <Panel icon={PackageX} title={t('Ruka hua maal')} hint={t('Stock me hai magar is period me nahi bika · {{slowCount}} cheezein{{value}}', { slowCount: d.totals.slowCount, value: showCost && d.totals.stockValue != null ? t(' · cost {{stockValue}}', { stockValue: f.cost(d.totals.stockValue) }) : '' })}
        actions={<Link to="/low-stock" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{t('Low stock →')}</Link>}>
        <DataTable rows={d.slow} rowKey={(r) => r.id} empty={t('Sab maal bik raha hai')} columns={[
          { label: t('Cheez'), render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
          { label: t('Stock'), align: 'right', render: (r) => `${f.qty(r.stock)} ${r.unit}` },
          { label: t('Cost'), align: 'right', hide: !showCost, render: (r) => f.cost(r.stockValue) },
          { label: t('Aakhri bar bika'), align: 'right', render: (r) => (r.lastSold ? f.date(r.lastSold) : t('Kabhi nahi')) },
        ]} />
      </Panel>
    </div>
  );
}
