/**
 * The month's profit chain: sales → cost of goods → bill profit → (khata
 * split) → expenses, stock loss and gain, other income → net. Shows whether
 * profit fell because of prices, spending or money still on khata.
 *
 * Profit figures come from the API (business-math.helper), so they match the
 * reports: the headline gross profit follows the shop's khata basis
 * (Settings → Reports). Money-map figures are preferred because their day and
 * month boundaries use the shop's timezone; overview stats are the fallback.
 */

import { HandCoins, Receipt, Sparkles, Target, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { ProfitSplitCard } from '@modules/reports/ProfitSplit';
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
  const split = money?.profit.monthSplit ?? s?.profitSplitMonth;
  const billProfit = split?.billProfit ?? revenue - cogs;
  const gross = money?.profit.monthGross ?? s?.grossProfitMonth ?? billProfit;
  const net = money?.profit.monthNet ?? s?.netProfitMonth ?? gross - expenses;
  const stockLoss = s?.stockLossMonth ?? 0;
  const stockGain = s?.stockGainMonth ?? 0;
  const income = money?.profit.monthOtherIncome ?? s?.otherIncomeMonth ?? 0;
  const pct = (n: number) => (revenue > 0 ? `${((n / revenue) * 100).toFixed(1)}% margin` : '—');
  const todayNet = money?.profit.todayNet ?? s?.netProfitToday ?? 0;
  const paidBasis = split?.basis !== 'BILL';

  return (
    <WidgetCard
      title="Profit aur nuksan"
      description="Is mahine — bechne se haath mein bachne tak"
      to="/profit-loss"
      linkLabel="Profit-loss"
      icon={Target}
      actions={<Change value={s?.salesGrowthVsLastMonth ?? 0} suffix="pichhle mahine se" />}
    >
      <WidgetToolbar inset={false}
        print={() => ({
          title: 'Profit aur nuksan', subtitle: 'Is mahine',
          sections: [{ kind: 'rows', rows: [
            { label: `Sale (${s?.ordersMonth ?? 0} bill)`, value: formatPKR(revenue) },
            { label: '- Maal ki cost', value: formatPKR(cogs) },
            { label: '= Bill ka profit', value: formatPKR(billProfit), strong: true },
            ...(split ? [
              { label: 'Haath mein aaya profit', value: formatPKR(split.realised), sub: true },
              { label: 'Udhaar mein profit', value: formatPKR(split.pending), sub: true },
            ] : []),
            { label: '- Expenses', value: formatPKR(expenses) },
            ...(stockLoss ? [{ label: '- Stock nuksan', value: formatPKR(stockLoss) }] : []),
            ...(stockGain ? [{ label: '+ Stock faida', value: formatPKR(stockGain) }] : []),
            ...(income ? [{ label: '+ Doosri aamdani', value: formatPKR(income) }] : []),
            { label: '= Net profit', value: formatPKR(net), strong: true },
          ] }, { kind: 'rows', title: 'Aaj', rows: [
            { label: 'Sale', value: formatPKR(s?.salesToday ?? 0) },
            { label: 'Expense', value: formatPKR(money?.expenses.today ?? s?.expensesToday ?? 0) },
            { label: 'Net profit', value: formatPKR(todayNet), strong: true },
          ] }],
        })} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <MetricTile icon={TrendingUp} tone="brand" label="Sale" value={formatPKR(revenue)} hint={`${s?.ordersMonth ?? 0} bill`} />
        <MetricTile icon={TrendingDown} tone="danger" label="− Maal ki cost" value={formatPKR(cogs)} />
        <MetricTile icon={Sparkles} tone="success" label="= Bill ka profit" value={formatPKR(billProfit)} hint={pct(billProfit)} />
        {paidBasis && split
          ? <MetricTile icon={HandCoins} tone="success" label="Haath mein aaya" value={formatPKR(gross)} hint={`udhaar mein ${formatPKR(split.pending)}`} />
          : <MetricTile icon={Wallet} tone="warning" label="− Expenses" value={formatPKR(expenses)} hint="Bijli, kiraya, tankhwah" />}
        <MetricTile icon={Target} tone={net >= 0 ? 'success' : 'danger'} label="= Net profit" value={formatPKR(net)} hint={pct(net)} alert={net < 0} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-500">
        {paidBasis && split && <span>Expenses <b className="font-semibold tabular-nums text-slate-900">− {formatPKR(expenses)}</b></span>}
        {stockLoss > 0 && <span>Stock nuksan <b className="font-semibold tabular-nums text-rose-700">− {formatPKR(stockLoss)}</b></span>}
        {stockGain > 0 && <span>Stock faida <b className="font-semibold tabular-nums text-success-700">+ {formatPKR(stockGain)}</b></span>}
        {income > 0 && <span>Doosri aamdani <b className="font-semibold tabular-nums text-success-700">+ {formatPKR(income)}</b></span>}
        <span className="ml-auto text-[0.75rem]">Net = profit − expenses − stock nuksan + stock faida + doosri aamdani</span>
      </div>
      <ProfitSplitCard split={split} periodLabel="is mahine" compact className="mt-3" />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-[0.8125rem]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600"><Receipt className="h-3.5 w-3.5" /> Aaj</span>
        <span className="text-slate-500">Sale <b className="font-semibold tabular-nums text-slate-900">{formatPKR(s?.salesToday ?? 0)}</b></span>
        <span className="text-slate-500">Expense <b className="font-semibold tabular-nums text-slate-900">{formatPKR(money?.expenses.today ?? s?.expensesToday ?? 0)}</b></span>
        {s?.profitSplitToday && s.profitSplitToday.pending > 0.5 && (
          <span className="text-slate-500">Udhaar mein <b className="font-semibold tabular-nums text-amber-700">{formatPKR(s.profitSplitToday.pending)}</b></span>
        )}
        <span className="text-slate-500">
          Net profit <b className={cn('font-semibold tabular-nums', todayNet >= 0 ? 'text-success-700' : 'text-rose-700')}>{formatPKR(todayNet)}</b>
        </span>
      </div>
    </WidgetCard>
  );
}
