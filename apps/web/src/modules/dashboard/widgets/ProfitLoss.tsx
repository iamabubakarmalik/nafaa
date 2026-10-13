/**
 * The month's profit chain: sales → cost of goods → gross profit →
 * expenses → net. Shows whether profit fell because of prices or spending.
 *
 * Money-map figures are preferred because their day and month boundaries
 * use the shop's timezone; overview stats are the fallback.
 */

import { Receipt, Sparkles, Target, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { useMoneyMap, useOverview } from '../data/queries';
import { Change, MetricTile, WidgetCard } from '../engine/parts';
import { WidgetToolbar } from './WidgetToolbar';

export function ProfitLoss() {
  const { data: o } = useOverview();
  const { data: money } = useMoneyMap();
  const s = o?.stats;

  const revenue = money?.profit.monthRevenue ?? s?.salesMonth ?? 0;
  const cogs = money?.profit.monthCogs ?? s?.cogsMonth ?? 0;
  const expenses = money?.profit.monthExpenses ?? s?.expensesMonth ?? 0;
  const gross = revenue - cogs;
  const net = gross - expenses;
  const pct = (n: number) => (revenue > 0 ? `${((n / revenue) * 100).toFixed(1)}% margin` : '—');
  const todayNet = money?.profit.todayNet ?? s?.netProfitToday ?? 0;

  return (
    <WidgetCard
      title="Nafa aur nuqsan"
      description="Is mahine — bechne se haath me bachne tak"
      to="/profit-report"
      linkLabel="Report"
      icon={Target}
      actions={<Change value={s?.salesGrowthVsLastMonth ?? 0} suffix="pichhle mahine se" />}
    >
      <WidgetToolbar inset={false}
        print={() => ({
          title: 'Nafa aur nuqsan', subtitle: 'Is mahine',
          sections: [{ kind: 'rows', rows: [
            { label: `Sale (${s?.ordersMonth ?? 0} bill)`, value: formatPKR(revenue) },
            { label: '- Maal ki cost', value: formatPKR(cogs) },
            { label: '= Seedha profit', value: formatPKR(gross), strong: true },
            { label: '- Expenses', value: formatPKR(expenses) },
            { label: '= Haath me bacha', value: formatPKR(net), strong: true },
          ] }, { kind: 'rows', title: 'Aaj', rows: [
            { label: 'Sale', value: formatPKR(s?.salesToday ?? 0) },
            { label: 'Expense', value: formatPKR(money?.expenses.today ?? s?.expensesToday ?? 0) },
            { label: 'Bacha', value: formatPKR(todayNet), strong: true },
          ] }],
        })} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <MetricTile icon={TrendingUp} tone="brand" label="Sale" value={formatPKR(revenue)} hint={`${s?.ordersMonth ?? 0} bill`} />
        <MetricTile icon={TrendingDown} tone="danger" label="− Maal ki cost" value={formatPKR(cogs)} />
        <MetricTile icon={Sparkles} tone="success" label="= Seedha profit" value={formatPKR(gross)} hint={pct(gross)} />
        <MetricTile icon={Wallet} tone="warning" label="− Expenses" value={formatPKR(expenses)} hint="Bijli, kiraya, tankhwah" />
        <MetricTile icon={Target} tone={net >= 0 ? 'success' : 'danger'} label="= Haath me bacha" value={formatPKR(net)} hint={pct(net)} alert={net < 0} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-[0.8125rem]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600"><Receipt className="h-3.5 w-3.5" /> Aaj</span>
        <span className="text-slate-500">Sale <b className="font-semibold tabular-nums text-slate-900">{formatPKR(s?.salesToday ?? 0)}</b></span>
        <span className="text-slate-500">Expense <b className="font-semibold tabular-nums text-slate-900">{formatPKR(money?.expenses.today ?? s?.expensesToday ?? 0)}</b></span>
        <span className="text-slate-500">
          Bacha <b className={cn('font-semibold tabular-nums', todayNet >= 0 ? 'text-success-700' : 'text-rose-700')}>{formatPKR(todayNet)}</b>
        </span>
      </div>
    </WidgetCard>
  );
}
