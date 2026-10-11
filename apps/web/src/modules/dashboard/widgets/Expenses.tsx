/**
 * Where this month's expenses went, largest first. Bars rather than a pie:
 * lengths are easier to compare, and every bar carries its name and amount
 * so nothing depends on color alone.
 */

import { Wallet } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { useMoneyMap } from '../data/queries';
import { MiniSelect, useWidgetState } from '../engine/controls';
import { useMasked } from '../engine/useMasked';
import { WidgetToolbar } from './WidgetToolbar';
import { useChartTheme } from '../engine/useChartTheme';
import { EmptyHint, WidgetCard } from '../engine/parts';

const FALLBACK = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const FALLBACK_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#22a722', '#9085e9', '#e66767'];

export function Expenses() {
  const [st, set] = useWidgetState('expenses', { sort: 'amount', show: '8' });
  const { data: m } = useMoneyMap();
  const { isDark } = useChartTheme();
  const { cost } = useMasked();
  const all = [...(m?.expenses.byCategory ?? [])].sort((a, b) => (st.sort === 'count' ? b.count - a.count : b.amount - a.amount));
  const rows = all.slice(0, Number(st.show));
  const total = m?.expenses.month ?? 0;
  const max = Math.max(...rows.map((r) => r.amount), 1);
  const palette = isDark ? FALLBACK_DARK : FALLBACK;

  return (
    <WidgetCard title="Kharcha kahan gaya" icon={Wallet}
      description={m ? `Is mahine ${formatPKR(total)} · pichhla mahina ${formatPKR(m.expenses.lastMonth ?? 0)}` : 'Is mahine'} to="/expenses">
      <WidgetToolbar inset={false}
        print={() => ({
          title: 'Kharcha kahan gaya', subtitle: 'Is mahine',
          sections: [{ kind: 'table', columns: [{ label: 'Category' }, { label: 'Entries', align: 'right' }, { label: 'Raqam', align: 'right' }],
            rows: all.map((r) => [r.name, String(r.count), cost(r.amount)]), footer: ['Kul', String(all.reduce((x, r) => x + r.count, 0)), cost(total)] }],
        })}>
        <MiniSelect label="Tarteeb" value={st.sort} onChange={(v) => set({ sort: v })} options={[{ value: 'amount', label: 'Raqam se' }, { value: 'count', label: 'Entries se' }]} />
        <MiniSelect label="Kitni" value={st.show} onChange={(v) => set({ show: v })} options={[{ value: '5', label: 'Top 5' }, { value: '8', label: 'Top 8' }, { value: '50', label: 'Sab' }]} />
      </WidgetToolbar>
      {rows.length === 0 ? (
        <EmptyHint icon={Wallet} text="Is mahine koi kharcha darj nahi" />
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => {
            // The API's default category color (#f59e0b) would make every bar amber.
            const color = r.color && r.color !== '#f59e0b' ? r.color : palette[i % palette.length];
            return (
              <div key={r.categoryId ?? `none-${i}`}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-[0.8125rem]">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate font-medium text-slate-800">{r.name}</span>
                    <span className="shrink-0 text-[0.75rem] text-slate-400">×{r.count}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                    {formatPKR(r.amount)}
                    <span className="ml-1.5 text-[0.75rem] font-normal text-slate-500">{total > 0 ? Math.round((r.amount / total) * 100) : 0}%</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${Math.max((r.amount / max) * 100, 2)}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
          <div className="flex items-baseline justify-between border-t border-slate-100 pt-2 text-[0.8125rem]">
            <span className="font-medium text-slate-500">Kul kharcha</span>
            <span className="font-bold tabular-nums text-slate-900">{formatPKR(total)}</span>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
