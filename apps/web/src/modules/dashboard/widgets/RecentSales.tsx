/** Latest bills, with any amount left on credit. */

import { Receipt } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { useOverview } from '../data/queries';
import { PAYMENT_COLORS } from '../engine/useChartTheme';
import { useMasked } from '../engine/useMasked';
import { fmtDateTime, ListRow, RowList, WidgetCard } from '../engine/parts';

export function RecentSales() {
  const { data } = useOverview();
  const { sales } = useMasked();
  return (
    <WidgetCard title="Haaliya bikri" description="Aakhri bill" to="/sales" flush>
      <RowList empty="Abhi koi bill nahi bana" emptyIcon={Receipt}>
        {(data?.recentSales ?? []).slice(0, 8).map((s) => {
          const color = PAYMENT_COLORS[s.paymentMethod] ?? '#64748b';
          return (
            <ListRow
              key={s.id}
              to={`/sales/${s.id}/receipt`}
              leading={
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1f`, color }}>
                  <Receipt className="h-4 w-4" />
                </span>
              }
              title={<span className="font-mono">{s.saleNumber}</span>}
              meta={`${s.customer?.name ?? 'Walk-in'} · ${fmtDateTime(s.soldAt)}`}
              value={sales(s.total)}
              valueHint={Number(s.creditAmount) > 0
                ? <span className="font-medium text-amber-700">{formatPKR(s.creditAmount)} udhaar</span>
                : undefined}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}
