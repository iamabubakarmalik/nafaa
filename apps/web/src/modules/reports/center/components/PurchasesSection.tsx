/** Kharidari aur suppliers: spend trend, suppliers, items bought and what is still owed. */

import { Link } from 'react-router-dom';
import { ClipboardList, HandCoins, PackageSearch, RotateCcw, TrendingUp, Truck, Wallet } from 'lucide-react';
import { KpiCard, KpiRow } from '@/design-system/components';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { PurchasesReport } from '../api';
import { BarList, DataTable, Delta, Empty, Panel, TrendChart, type Formatter } from './parts';

export function PurchasesSection({ data: d, f, compare }: { data: PurchasesReport; f: Formatter; compare: boolean }) {
  const theme = useChartTheme();
  const t = d.totals;
  const prev = compare ? d.previous : null;
  return (
    <div className="space-y-4">
      <KpiRow>
        <KpiCard icon={Truck} color="#2563eb" label="Maal aaya" value={f.money(t.value)} hint={prev ? <Delta now={t.value} before={prev.value} up="bad" /> : `${t.bills} bill`} />
        <KpiCard icon={Wallet} color="#16a34a" label="Supplier ko diye" value={f.money(t.paid)} hint={`udhaar par ${f.money(t.credit)}`} />
        <KpiCard icon={ClipboardList} color="#7c3aed" label="Bill" value={String(t.bills)} hint={`ausat ${f.money(t.average)}`} />
        <KpiCard icon={RotateCcw} color="#ea580c" label="Supplier ko wapas" value={f.money(t.returned)} hint={`${t.returns} return`} />
        <KpiCard icon={HandCoins} color="#e11d48" label="Suppliers ko dena hai" value={f.money(t.dueTotal)} hint={`${t.dueSuppliers} supplier · abhi tak`} />
      </KpiRow>

      <Panel icon={TrendingUp} title="Purchase ka rujhan" hint={d.grouping === 'month' ? 'Mahine war' : 'Din war'}
        actions={<Link to="/purchases" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Purchase →</Link>}>
        {!t.bills ? <Empty text="Is period me koi purchase nahi" /> : (
          <TrendChart id="rc-pur" f={f} data={d.trend} series={[
            { key: 'value', label: 'Maal', color: theme.primary, fmt: 'money' },
            { key: 'paid', label: 'Diye', color: theme.profit, fmt: 'money' },
          ]} />
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Truck} title="Suppliers" hint="Kis se kitna maal aaya">
          <BarList f={f} fmt="money" empty="Koi purchase nahi" rows={d.suppliers.map((s) => ({
            key: s.id, name: <Link to={`/suppliers/${s.id}`} className="hover:underline">{s.name}</Link>, value: s.value,
            hint: `${s.bills} bill · ${s.share.toFixed(0)}% · diye ${f.money(s.paid)}`,
          }))} />
        </Panel>
        <Panel icon={HandCoins} title="Kis supplier ko dena hai" hint="Sab branches ka mila kar, abhi tak">
          <DataTable rows={d.dues} rowKey={(s) => s.id} empty="Kisi supplier ka baqi nahi" columns={[
            { label: 'Supplier', render: (s) => <Link to={`/suppliers/${s.id}`} className="font-medium text-slate-900 hover:underline">{s.name}</Link> },
            { label: 'Phone', render: (s) => s.phone ?? '—' },
            { label: 'Dena hai', align: 'right', render: (s) => <span className="font-semibold text-rose-700">{f.money(s.due)}</span> },
          ]} />
        </Panel>
      </div>

      <Panel icon={PackageSearch} title="Sab se zyada khareeda maal">
        <DataTable rows={d.items} rowKey={(i, n) => `${i.name}-${n}`} empty="Koi purchase nahi" columns={[
          { label: '#', render: (_i, n) => <span className="text-slate-400">{n + 1}</span> },
          { label: 'Cheez', render: (i) => <span className="font-medium text-slate-900">{i.name}</span> },
          { label: 'Quantity', align: 'right', render: (i) => f.qty(i.qty) },
          { label: 'Bill', align: 'right', render: (i) => i.bills },
          { label: 'Amount', align: 'right', render: (i) => <span className="font-semibold">{f.money(i.value)}</span> },
        ]} />
      </Panel>
    </div>
  );
}
