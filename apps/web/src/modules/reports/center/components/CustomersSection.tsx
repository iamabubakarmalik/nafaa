/** Customers: new against returning, walk-in share, best customers and udhaar with its age. */

import { Link } from 'react-router-dom';
import { BookOpen, Crown, HandCoins, Hourglass, UserPlus, Users } from 'lucide-react';
import { KpiCard, KpiRow } from '@/design-system/components';
import type { CustomersReport } from '../api';
import { BarList, DataTable, Delta, Donut, Panel, type Formatter } from './parts';

export function CustomersSection({ data: d, f, compare }: { data: CustomersReport; f: Formatter; compare: boolean }) {
  const t = d.totals;
  return (
    <div className="space-y-4">
      <KpiRow>
        <KpiCard icon={Users} color="#2563eb" label="Customers aaye" value={String(t.customers)} hint={`${t.repeat} ek se zyada dafa`} />
        <KpiCard icon={UserPlus} color="#16a34a" label="Naye customer" value={String(t.newCount)} hint={`${f.money(t.newValue)} · ${t.signups} naye khate`} />
        <KpiCard icon={Crown} color="#7c3aed" label="Purane customer" value={String(t.returning)} hint={f.money(t.returningValue)} />
        <KpiCard icon={BookOpen} color="#d97706" label="Udhaar diya" value={f.money(t.creditGiven)}
          hint={compare && d.previous ? <Delta now={t.creditGiven} before={d.previous.creditGiven} up="bad" /> : 'is period me'} />
        <KpiCard icon={HandCoins} color="#059669" label="Udhaar wapas mila" value={f.money(t.recovered)} hint={`${t.payments} payment`} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Users} title="Sale kis se hui" hint="Naye, purane aur baghair naam (walk-in)">
          <Donut f={f} fmt="money" data={[
            { name: 'Naye customer', value: t.newValue, color: '#16a34a' },
            { name: 'Purane customer', value: t.returningValue, color: '#7c3aed' },
            { name: `Walk-in (${t.walkInBills} bill)`, value: t.walkInValue, color: '#94a3b8' },
          ].filter((x) => x.value > 0)} />
        </Panel>
        <Panel icon={Hourglass} title="Udhaar kitna purana" hint={`${t.debtors} customer par ${f.money(t.outstanding)} baqi · aakhri payment se ginti`}
          actions={<Link to="/khata" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Khata →</Link>}>
          <BarList f={f} fmt="money" empty="Kisi par udhaar nahi"
            rows={d.aging.filter((a) => a.count).map((a, i) => ({ key: a.key, name: a.label, value: a.amount, hint: `${a.count} customer`, color: ['#16a34a', '#d97706', '#ea580c', '#e11d48'][i] }))} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Crown} title="Sab se bare customer" hint="Is period ki sale">
          <DataTable rows={d.top} rowKey={(c) => c.id} empty="Kisi naam wale customer ne nahi khareeda" columns={[
            { label: 'Customer', render: (c) => <Link to={`/customers/${c.id}`} className="font-medium text-slate-900 hover:underline">{c.name}</Link> },
            { label: 'Bill', align: 'right', render: (c) => c.bills },
            { label: 'Sale', align: 'right', render: (c) => <span className="font-semibold">{f.money(c.net)}</span> },
            { label: 'Baqi', align: 'right', render: (c) => (c.balance > 0 ? <span className="text-amber-700">{f.money(c.balance)}</span> : '—') },
          ]} />
        </Panel>
        <Panel icon={BookOpen} title="Sab se zyada udhaar" hint="Abhi tak ka baqi">
          <DataTable rows={d.debtors} rowKey={(c) => c.id} empty="Kisi par udhaar nahi" columns={[
            { label: 'Customer', render: (c) => <span className="font-medium text-slate-900">{c.name}{c.phone && <span className="ml-1.5 text-[0.75rem] font-normal text-slate-500">{c.phone}</span>}</span> },
            { label: 'Aakhri payment', align: 'right', render: (c) => (c.lastPayment ? f.date(c.lastPayment) : 'Kabhi nahi') },
            { label: 'Din', align: 'right', render: (c) => (c.days == null ? '—' : <span className={c.days > 60 ? 'font-semibold text-rose-600' : ''}>{c.days}</span>) },
            { label: 'Baqi', align: 'right', render: (c) => <span className="font-semibold text-amber-700">{f.money(c.balance)}</span> },
          ]} />
        </Panel>
      </div>
    </div>
  );
}
