/** Kharidari aur suppliers: spend trend, suppliers, items bought and what is still owed. */

import { Link } from 'react-router-dom';
import { ClipboardList, HandCoins, PackageSearch, RotateCcw, TrendingUp, Truck, Wallet } from 'lucide-react';
import { KpiCard, KpiRow } from '@/design-system/components';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { PurchasesReport } from '../api';
import { BarList, DataTable, Delta, Empty, Panel, TrendChart, type Formatter } from './parts';
import { t as tr } from '@core/i18n';

export function PurchasesSection({ data: d, f, compare }: { data: PurchasesReport; f: Formatter; compare: boolean }) {
  const theme = useChartTheme();
  const t = d.totals;
  const prev = compare ? d.previous : null;
  return (
    <div className="space-y-4">
      <KpiRow>
        <KpiCard icon={Truck} color="#2563eb" label={tr('Maal aaya')} value={f.money(t.value)} hint={prev ? <Delta now={t.value} before={prev.value} up="bad" /> : tr('{{bills}} bill', { bills: t.bills })} />
        <KpiCard icon={Wallet} color="#16a34a" label={tr('Supplier ko diye')} value={f.money(t.paid)} hint={tr('udhaar par {{credit}}', { credit: f.money(t.credit) })} />
        <KpiCard icon={ClipboardList} color="#7c3aed" label={tr('Bill')} value={String(t.bills)} hint={tr('ausat {{average}}', { average: f.money(t.average) })} />
        <KpiCard icon={RotateCcw} color="#ea580c" label={tr('Supplier ko wapas')} value={f.money(t.returned)} hint={tr('{{returns}} return', { returns: t.returns })} />
        <KpiCard icon={HandCoins} color="#e11d48" label={tr('Suppliers ko dena hai')} value={f.money(t.dueTotal)} hint={tr('{{dueSuppliers}} supplier · abhi tak', { dueSuppliers: t.dueSuppliers })} />
      </KpiRow>

      <Panel icon={TrendingUp} title={tr('Purchase ka rujhan')} hint={d.grouping === 'month' ? tr('Mahine war') : tr('Din war')}
        actions={<Link to="/purchases" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Purchase →')}</Link>}>
        {!t.bills ? <Empty text={tr('Is period me koi purchase nahi')} /> : (
          <TrendChart id="rc-pur" f={f} data={d.trend} series={[
            { key: 'value', label: tr('Maal'), color: theme.primary, fmt: 'money' },
            { key: 'paid', label: tr('Diye'), color: theme.profit, fmt: 'money' },
          ]} />
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Truck} title={tr('Suppliers')} hint={tr('Kis se kitna maal aaya')}>
          <BarList f={f} fmt="money" empty={tr('Koi purchase nahi')} rows={d.suppliers.map((s) => ({
            key: s.id, name: <Link to={`/suppliers/${s.id}`} className="hover:underline">{s.name}</Link>, value: s.value,
            hint: tr('{{bills}} bill · {{value}}% · diye {{paid}}', { bills: s.bills, value: s.share.toFixed(0), paid: f.money(s.paid) }),
          }))} />
        </Panel>
        <Panel icon={HandCoins} title={tr('Kis supplier ko dena hai')} hint={tr('Sab branches ka mila kar, abhi tak')}>
          <DataTable rows={d.dues} rowKey={(s) => s.id} empty={tr('Kisi supplier ka baqi nahi')} columns={[
            { label: tr('Supplier'), render: (s) => <Link to={`/suppliers/${s.id}`} className="font-medium text-slate-900 hover:underline">{s.name}</Link> },
            { label: tr('Phone'), render: (s) => s.phone ?? '—' },
            { label: tr('Dena hai'), align: 'right', render: (s) => <span className="font-semibold text-rose-700">{f.money(s.due)}</span> },
          ]} />
        </Panel>
      </div>

      <Panel icon={PackageSearch} title={tr('Sab se zyada khareeda maal')}>
        <DataTable rows={d.items} rowKey={(i, n) => `${i.name}-${n}`} empty={tr('Koi purchase nahi')} columns={[
          { label: '#', render: (_i, n) => <span className="text-slate-400">{n + 1}</span> },
          { label: tr('Cheez'), render: (i) => <span className="font-medium text-slate-900">{i.name}</span> },
          { label: tr('Quantity'), align: 'right', render: (i) => f.qty(i.qty) },
          { label: tr('Bill'), align: 'right', render: (i) => i.bills },
          { label: tr('Amount'), align: 'right', render: (i) => <span className="font-semibold">{f.money(i.value)}</span> },
        ]} />
      </Panel>
    </div>
  );
}
