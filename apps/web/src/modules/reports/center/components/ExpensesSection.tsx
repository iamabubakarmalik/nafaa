/** Kharche: total against sales, trend, categories, payment methods and the biggest bills. */

import { Link } from 'react-router-dom';
import { CalendarClock, Hourglass, Layers, Percent, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { KpiCard, KpiRow } from '@/design-system/components';
import { PAYMENT_COLORS, PAYMENT_LABELS, useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { ExpensesReport } from '../api';
import { DataTable, Delta, Donut, Empty, Panel, TrendChart, type Formatter } from './parts';

export function ExpensesSection({ data: d, f, compare }: { data: ExpensesReport; f: Formatter; compare: boolean }) {
  const theme = useChartTheme();
  const t = d.totals;
  return (
    <div className="space-y-4">
      <KpiRow cols={4}>
        <KpiCard icon={Receipt} color="#e11d48" label="Kul kharche" value={f.money(t.amount)} hint={compare && d.previous ? <Delta now={t.amount} before={d.previous.amount} up="bad" /> : `${t.count} kharche`} />
        <KpiCard icon={CalendarClock} color="#2563eb" label="Roz ka ausat" value={f.money(t.perDay)} />
        <KpiCard icon={Percent} color="#7c3aed" label="Bikri ka hissa" value={`${t.ofSales.toFixed(1)}%`} hint="har 100 ki bikri par" />
        <KpiCard icon={Hourglass} color="#d97706" label="Abhi dena hai" value={f.money(t.pending)} hint="pending kharche" />
      </KpiRow>

      <Panel icon={TrendingUp} title="Kharchon ka rujhan" hint={d.grouping === 'month' ? 'Mahine war' : 'Din war'}
        actions={<Link to="/expenses" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Kharche →</Link>}>
        {!t.count ? <Empty text="Is muddat me koi kharcha nahi" /> : (
          <TrendChart id="rc-exp" f={f} data={d.trend} series={[{ key: 'amount', label: 'Kharcha', color: '#e11d48', fmt: 'money' }]} />
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Layers} title="Category war">
          {!d.categories.length ? <Empty text="Koi kharcha nahi" /> : (
            <Donut f={f} fmt="money" data={d.categories.map((c) => ({ name: `${c.name} (${c.count})`, value: c.amount, color: c.color ?? undefined }))} />
          )}
        </Panel>
        <Panel icon={Wallet} title="Kaise diye">
          {!d.methods.length ? <Empty text="Koi kharcha nahi" /> : (
            <Donut f={f} fmt="money" colors={[theme.primary]} data={d.methods.map((m) => ({ name: PAYMENT_LABELS[m.method] ?? m.method, value: m.amount, color: PAYMENT_COLORS[m.method] }))} />
          )}
        </Panel>
      </div>

      <Panel icon={Receipt} title="Sab se bare kharche">
        <DataTable rows={d.biggest} rowKey={(e) => e.id} empty="Koi kharcha nahi" columns={[
          { label: 'Tareekh', render: (e) => f.date(e.date) },
          { label: 'Kharcha', render: (e) => <span className="font-medium text-slate-900">{e.title}</span> },
          { label: 'Category', render: (e) => e.category ?? '—' },
          { label: 'Halat', render: (e) => (e.status === 'PENDING' ? <span className="text-amber-700">Dena hai</span> : 'Diya') },
          { label: 'Raqam', align: 'right', render: (e) => <span className="font-semibold">{f.money(e.amount)}</span> },
        ]} />
      </Panel>
    </div>
  );
}
