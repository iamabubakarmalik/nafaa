/** How money came in over a period: cash, card, wallets, and what went on credit. */

import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { useInsights, type InsightDays } from '../data/queries';
import { MiniSelect, PERIOD_OPTIONS, periodLabel, useWidgetState } from '../engine/controls';
import { PAYMENT_COLORS, PAYMENT_LABELS, useChartTheme } from '../engine/useChartTheme';
import { useMasked } from '../engine/useMasked';
import { EmptyHint, WidgetCard } from '../engine/parts';
import { WidgetToolbar } from './WidgetToolbar';

export function PaymentMix() {
  const [s, set] = useWidgetState('payment-mix', { days: '30', view: 'donut' });
  const { data, isLoading } = useInsights(Number(s.days) as InsightDays);
  const theme = useChartTheme();
  const { sales, salesHidden } = useMasked();

  const rows = useMemo(() => {
    const list = (data?.payments ?? []).map((p) => ({ key: p.method as string, name: PAYMENT_LABELS[p.method] ?? p.method, value: p.collected, bills: p.bills, color: PAYMENT_COLORS[p.method] ?? '#64748b' }));
    if (data?.credit) list.push({ key: 'CREDIT', name: 'Udhaar', value: data.credit, bills: 0, color: PAYMENT_COLORS.CREDIT });
    return list.filter((r) => r.value > 0);
  }, [data]);
  const total = rows.reduce((x, r) => x + r.value, 0);
  const cash = rows.find((r) => r.key === 'CASH')?.value ?? 0;
  const online = rows.filter((r) => r.key !== 'CASH' && r.key !== 'CREDIT').reduce((x, r) => x + r.value, 0);

  return (
    <WidgetCard title="Paisa kaise aaya" icon={Wallet} description={periodLabel(s.days)}>
      <WidgetToolbar inset={false}
        print={() => ({
          title: 'Paisa kaise aaya', subtitle: periodLabel(s.days),
          sections: [{ kind: 'rows', rows: [...rows.map((r) => ({ label: `${r.name}${r.bills ? ` (${r.bills} bill)` : ''}`, value: sales(r.value) })), { label: 'Kul', value: sales(total), strong: true }] }],
        })}>
        <MiniSelect label="Muddat" value={s.days} onChange={(v) => set({ days: v })} options={PERIOD_OPTIONS} />
        <MiniSelect label="Dikhawa" value={s.view} onChange={(v) => set({ view: v })} options={[{ value: 'donut', label: 'Gol chart' }, { value: 'bars', label: 'Patiyan' }]} />
      </WidgetToolbar>
      {isLoading ? <Skeleton className="h-48 w-full" /> : rows.length === 0 ? (
        <EmptyHint icon={Wallet} text="Is muddat me koi bikri nahi" />
      ) : (
        <div className="flex flex-col gap-4">
          {!salesHidden && s.view === 'donut' && (
            <div className="relative mx-auto h-[160px] w-full max-w-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rows} dataKey="value" innerRadius="62%" outerRadius="100%" paddingAngle={2} stroke="none">
                    {rows.map((r) => <Cell key={r.key} fill={r.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatPKR(Number(v))} contentStyle={theme.tooltip.contentStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[0.6875rem] text-slate-500">Kul</span>
                <span className="text-[0.875rem] font-bold tabular-nums text-slate-900">{sales(total)}</span>
              </div>
            </div>
          )}
          <ul className="space-y-2.5">
            {rows.map((r) => (
              <li key={r.key} className="text-[0.8125rem]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="min-w-0 flex-1 truncate text-slate-700">{r.name}{r.bills ? <span className="text-slate-400"> · {r.bills}</span> : null}</span>
                  <span className="tabular-nums text-slate-500">{total > 0 ? Math.round((r.value / total) * 100) : 0}%</span>
                  <span className="w-24 text-right font-semibold tabular-nums text-slate-900">{sales(r.value)}</span>
                </div>
                {s.view === 'bars' && (
                  <div className="ml-[18px] mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${total ? (r.value / total) * 100 : 0}%`, backgroundColor: r.color }} />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
            <div className="rounded-lg bg-success-50 px-2.5 py-2">
              <div className="text-[0.6875rem] font-medium text-success-800">Cash</div>
              <div className="text-[0.875rem] font-bold tabular-nums text-success-900">{sales(cash)}</div>
            </div>
            <div className="rounded-lg bg-sky-50 px-2.5 py-2">
              <div className="text-[0.6875rem] font-medium text-sky-800">Online</div>
              <div className="text-[0.875rem] font-bold tabular-nums text-sky-900">{sales(online)}</div>
            </div>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
