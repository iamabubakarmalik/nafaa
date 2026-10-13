/** Tax: invoices accepted by the tax authority, by authority and rate, plus discounts and service charges. */

import { Link } from 'react-router-dom';
import { AlertTriangle, BadgePercent, FileCheck2, Landmark, Percent, Receipt, Sparkles } from 'lucide-react';
import { KpiCard, KpiRow } from '@/design-system/components';
import type { TaxReport } from '../api';
import { DataTable, Panel, type Formatter } from './parts';

export function TaxSection({ data: d, f }: { data: TaxReport; f: Formatter }) {
  const t = d.totals;
  return (
    <div className="space-y-4">
      {d.migrationPending && (
        <p className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-100">
          <AlertTriangle className="h-4 w-4" /> Tax ka record abhi tayyar nahi — server update ke baad yahan aayega.
        </p>
      )}
      <KpiRow>
        <KpiCard icon={Landmark} color="#0f766e" label="Tax jama hua" value={f.money(t.tax)} hint={`${t.bills} bill authority ne maane`} />
        <KpiCard icon={Receipt} color="#2563eb" label="Tax wali sale" value={f.money(t.taxedValue)} hint={`total sale ${f.money(t.sales)}`} />
        <KpiCard icon={Percent} color="#7c3aed" label="Kitni sale tax me" value={`${t.coverage.toFixed(0)}%`} />
        <KpiCard icon={AlertTriangle} color="#e11d48" label="Atke bill" value={String(t.failed + t.pending)} hint={`${t.failed} fail · ${t.pending} intezar`} />
        <KpiCard icon={BadgePercent} color="#db2777" label="Discount diya" value={f.money(t.discount)} hint={`code ${f.money(t.codeDiscount)} · points ${f.money(t.loyaltyDiscount)}`} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={FileCheck2} title="Authority war" hint="Sirf jo bill authority ne maane; wapsi ghata kar"
          actions={<Link to="/tax/reports" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Tax hub →</Link>}>
          <DataTable rows={d.authorities} rowKey={(a) => a.authority} empty="Is period me koi tax bill nahi — tax hub se chalu karein" columns={[
            { label: 'Authority', render: (a) => <span className="font-medium text-slate-900">{a.authority}</span> },
            { label: 'Bill', align: 'right', render: (a) => `${a.bills}${a.returns ? ` (−${a.returns})` : ''}` },
            { label: 'Sale', align: 'right', render: (a) => f.money(a.value) },
            { label: 'Tax', align: 'right', render: (a) => <span className="font-semibold">{f.money(a.tax)}</span> },
            { label: 'Atke', align: 'right', render: (a) => (a.failed + a.pending ? <span className="text-rose-600">{a.failed + a.pending}</span> : '—') },
          ]} />
        </Panel>
        <Panel icon={Percent} title="Rate war">
          <DataTable rows={d.rates} rowKey={(r) => String(r.rate)} empty="Koi tax bill nahi" columns={[
            { label: 'Rate', render: (r) => `${r.rate}%` },
            { label: 'Bill', align: 'right', render: (r) => r.bills },
            { label: 'Sale', align: 'right', render: (r) => f.money(r.value) },
            { label: 'Tax', align: 'right', render: (r) => <span className="font-semibold">{f.money(r.tax)}</span> },
          ]} />
          <p className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[0.8125rem] text-slate-600">
            <Sparkles className="h-4 w-4 text-slate-400" />Service charges is period me: <span className="font-semibold tabular-nums text-slate-900">{f.money(t.service)}</span>
          </p>
        </Panel>
      </div>
    </div>
  );
}
