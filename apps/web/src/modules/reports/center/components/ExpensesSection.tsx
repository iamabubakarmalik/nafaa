/** Kharche: total against sales, trend, categories, payment methods and the biggest bills. */

import { Link } from 'react-router-dom';
import { CalendarClock, Hourglass, Layers, Percent, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { KpiCard, KpiRow } from '@/design-system/components';
import { PAYMENT_COLORS, PAYMENT_LABELS, useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { ExpensesReport } from '../api';
import { DataTable, Delta, Donut, Empty, Panel, TrendChart, type Formatter } from './parts';
import { t as tr } from '@core/i18n';

export function ExpensesSection({ data: d, f, compare }: { data: ExpensesReport; f: Formatter; compare: boolean }) {
  const theme = useChartTheme();
  const t = d.totals;
  return (
    <div className="space-y-4">
      <KpiRow cols={4}>
        <KpiCard icon={Receipt} color="#e11d48" label={tr('Total expenses')} value={f.money(t.amount)} hint={compare && d.previous ? <Delta now={t.amount} before={d.previous.amount} up="bad" /> : tr('{{count}} expenses', { count: t.count })} />
        <KpiCard icon={CalendarClock} color="#2563eb" label={tr('Roz ka ausat')} value={f.money(t.perDay)} />
        <KpiCard icon={Percent} color="#7c3aed" label={tr('Sale ka hissa')} value={`${t.ofSales.toFixed(1)}%`} hint={tr('har 100 ki sale par')} />
        <KpiCard icon={Hourglass} color="#d97706" label={tr('Abhi dena hai')} value={f.money(t.pending)} hint={tr('pending expenses')} />
      </KpiRow>

      <Panel icon={TrendingUp} title={tr('Kharchon ka rujhan')} hint={d.grouping === 'month' ? tr('Mahine war') : tr('Din war')}
        actions={<Link to="/expenses" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Expenses →')}</Link>}>
        {!t.count ? <Empty text={tr('Is period me koi expense nahi')} /> : (
          <TrendChart id="rc-exp" f={f} data={d.trend} series={[{ key: 'amount', label: tr('Expense'), color: '#e11d48', fmt: 'money' }]} />
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Layers} title={tr('Category war')}>
          {!d.categories.length ? <Empty text={tr('Koi expense nahi')} /> : (
            <Donut f={f} fmt="money" data={d.categories.map((c) => ({ name: `${c.name} (${c.count})`, value: c.amount, color: c.color ?? undefined }))} />
          )}
        </Panel>
        <Panel icon={Wallet} title={tr('Kaise diye')}>
          {!d.methods.length ? <Empty text={tr('Koi expense nahi')} /> : (
            <Donut f={f} fmt="money" colors={[theme.primary]} data={d.methods.map((m) => ({ name: PAYMENT_LABELS[m.method] ?? m.method, value: m.amount, color: PAYMENT_COLORS[m.method] }))} />
          )}
        </Panel>
      </div>

      <Panel icon={Receipt} title={tr('Sab se bare expenses')}>
        <DataTable rows={d.biggest} rowKey={(e) => e.id} empty={tr('Koi expense nahi')} columns={[
          { label: tr('Date'), render: (e) => f.date(e.date) },
          { label: tr('Expense'), render: (e) => <span className="font-medium text-slate-900">{e.title}</span> },
          { label: tr('Category'), render: (e) => e.category ?? '—' },
          { label: tr('Halat'), render: (e) => (e.status === 'PENDING' ? <span className="text-amber-700">{tr('Dena hai')}</span> : tr('Diya')) },
          { label: tr('Amount'), align: 'right', render: (e) => <span className="font-semibold">{f.money(e.amount)}</span> },
        ]} />
      </Panel>
    </div>
  );
}
