/** Customers: new against returning, walk-in share, best customers and udhaar with its age. */

import { Link } from 'react-router-dom';
import { BookOpen, Crown, HandCoins, Hourglass, UserPlus, Users } from 'lucide-react';
import { KpiCard, KpiRow } from '@/design-system/components';
import type { CustomersReport } from '../api';
import { BarList, DataTable, Delta, Donut, Panel, type Formatter } from './parts';
import { t as tr } from '@core/i18n';

export function CustomersSection({ data: d, f, compare }: { data: CustomersReport; f: Formatter; compare: boolean }) {
  const t = d.totals;
  return (
    <div className="space-y-4">
      <KpiRow>
        <KpiCard icon={Users} color="#2563eb" label={tr('Customers aaye')} value={String(t.customers)} hint={tr('{{repeat}} ek se zyada dafa', { repeat: t.repeat })} />
        <KpiCard icon={UserPlus} color="#16a34a" label={tr('Naye customer')} value={String(t.newCount)} hint={tr('{{newValue}} · {{signups}} naye khate', { newValue: f.money(t.newValue), signups: t.signups })} />
        <KpiCard icon={Crown} color="#7c3aed" label={tr('Purane customer')} value={String(t.returning)} hint={f.money(t.returningValue)} />
        <KpiCard icon={BookOpen} color="#d97706" label={tr('Udhaar diya')} value={f.money(t.creditGiven)}
          hint={compare && d.previous ? <Delta now={t.creditGiven} before={d.previous.creditGiven} up="bad" /> : tr('is period me')} />
        <KpiCard icon={HandCoins} color="#059669" label={tr('Udhaar wapas mila')} value={f.money(t.recovered)} hint={tr('{{payments}} payment', { payments: t.payments })} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Users} title={tr('Sale kis se hui')} hint={tr('Naye, purane aur baghair naam (walk-in)')}>
          <Donut f={f} fmt="money" data={[
            { name: 'Naye customer', value: t.newValue, color: '#16a34a' },
            { name: 'Purane customer', value: t.returningValue, color: '#7c3aed' },
            { name: `Walk-in (${t.walkInBills} bill)`, value: t.walkInValue, color: '#94a3b8' },
          ].filter((x) => x.value > 0)} />
        </Panel>
        <Panel icon={Hourglass} title={tr('Udhaar kitna purana')} hint={tr('{{debtors}} customer par {{outstanding}} baqi · aakhri payment se ginti', { debtors: t.debtors, outstanding: f.money(t.outstanding) })}
          actions={<Link to="/khata" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Khata →')}</Link>}>
          <BarList f={f} fmt="money" empty={tr('Kisi par udhaar nahi')}
            rows={d.aging.filter((a) => a.count).map((a, i) => ({ key: a.key, name: a.label, value: a.amount, hint: tr('{{count}} customer', { count: a.count }), color: ['#16a34a', '#d97706', '#ea580c', '#e11d48'][i] }))} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Crown} title={tr('Sab se bare customer')} hint={tr('Is period ki sale')}>
          <DataTable rows={d.top} rowKey={(c) => c.id} empty={tr('Kisi naam wale customer ne nahi khareeda')} columns={[
            { label: tr('Customer'), render: (c) => <Link to={`/customers/${c.id}`} className="font-medium text-slate-900 hover:underline">{c.name}</Link> },
            { label: tr('Bill'), align: 'right', render: (c) => c.bills },
            { label: tr('Sale'), align: 'right', render: (c) => <span className="font-semibold">{f.money(c.net)}</span> },
            { label: tr('Baqi'), align: 'right', render: (c) => (c.balance > 0 ? <span className="text-amber-700">{f.money(c.balance)}</span> : '—') },
          ]} />
        </Panel>
        <Panel icon={BookOpen} title={tr('Sab se zyada udhaar')} hint={tr('Abhi tak ka baqi')}>
          <DataTable rows={d.debtors} rowKey={(c) => c.id} empty={tr('Kisi par udhaar nahi')} columns={[
            { label: tr('Customer'), render: (c) => <span className="font-medium text-slate-900">{c.name}{c.phone && <span className="ms-1.5 text-[0.75rem] font-normal text-slate-500">{c.phone}</span>}</span> },
            { label: tr('Aakhri payment'), align: 'right', render: (c) => (c.lastPayment ? f.date(c.lastPayment) : tr('Kabhi nahi')) },
            { label: tr('Din'), align: 'right', render: (c) => (c.days == null ? '—' : <span className={c.days > 60 ? 'font-semibold text-rose-600' : ''}>{c.days}</span>) },
            { label: tr('Baqi'), align: 'right', render: (c) => <span className="font-semibold text-amber-700">{f.money(c.balance)}</span> },
          ]} />
        </Panel>
      </div>
    </div>
  );
}
