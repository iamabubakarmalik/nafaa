/** How money came in this month: cash, card, wallets, credit. */

import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { useOverview } from '../data/queries';
import { PAYMENT_COLORS, useChartTheme } from '../engine/useChartTheme';
import { useMasked } from '../engine/useMasked';
import { EmptyHint, WidgetCard } from '../engine/parts';

const LABELS: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card', JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa',
  BANK_TRANSFER: 'Bank transfer', CREDIT: 'Udhaar', ONLINE: 'Online',
};

export function PaymentMix() {
  const { data } = useOverview();
  const theme = useChartTheme();
  const { sales, salesHidden } = useMasked();

  const rows = useMemo(() => (data?.paymentBreakdown ?? [])
    .map((p) => ({ key: p.method, name: LABELS[p.method] ?? p.method, value: Number(p.total || 0), color: PAYMENT_COLORS[p.method] ?? '#64748b' }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value), [data]);
  const total = rows.reduce((x, r) => x + r.value, 0);

  return (
    <WidgetCard title="Paisa kaise aaya" description="Is mahine">
      {rows.length === 0 ? (
        <EmptyHint icon={Wallet} text="Abhi koi bikri nahi" />
      ) : (
        <div className="flex flex-col gap-4">
          {!salesHidden && (
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
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.key} className="flex items-center gap-2 text-[0.8125rem]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="min-w-0 flex-1 truncate text-slate-700">{r.name}</span>
                <span className="tabular-nums text-slate-500">{total > 0 ? Math.round((r.value / total) * 100) : 0}%</span>
                <span className="w-24 text-right font-semibold tabular-nums text-slate-900">{sales(r.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </WidgetCard>
  );
}
