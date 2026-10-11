/**
 * Where this month's expenses went, largest first. Bars rather than a pie:
 * lengths are easier to compare, and every bar carries its name and amount
 * so nothing depends on color alone.
 */

import { Wallet } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { useMoneyMap } from '../data/queries';
import { useChartTheme } from '../engine/useChartTheme';
import { EmptyHint, WidgetCard } from '../engine/parts';

const FALLBACK = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const FALLBACK_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#22a722', '#9085e9', '#e66767'];

export function Expenses() {
  const { data: m } = useMoneyMap();
  const { isDark } = useChartTheme();
  const rows = [...(m?.expenses.byCategory ?? [])].sort((a, b) => b.amount - a.amount);
  const total = m?.expenses.month ?? 0;
  const max = Math.max(...rows.map((r) => r.amount), 1);
  const palette = isDark ? FALLBACK_DARK : FALLBACK;

  return (
    <WidgetCard title="Kharcha kahan gaya" description="Is mahine, sab se bara pehle" to="/expenses">
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
