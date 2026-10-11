/** Recent stock purchases with any unpaid balance. */

import { Package, ShoppingBag } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { useMoneyMap } from '../data/queries';
import { fmtDateTime, ListRow, RowList, WidgetCard } from '../engine/parts';

export function Purchases() {
  const { data: m } = useMoneyMap();
  const recent = m?.purchases.recent ?? [];
  return (
    <WidgetCard
      title="Maal ki kharidari"
      description={m ? `Aaj ${formatPKR(m.purchases.todayTotal)} · is mahine ${formatPKR(m.purchases.monthTotal)}` : undefined}
      to="/purchases"
      flush
    >
      <RowList empty="Abhi koi kharidari nahi" emptyIcon={ShoppingBag}>
        {recent.slice(0, 6).map((p) => {
          const due = Number(p.total) - Number(p.paidAmount);
          return (
            <ListRow
              key={p.id}
              to={`/purchases/${p.id}`}
              icon={Package}
              title={p.supplier?.name || 'Supplier'}
              meta={`${p.purchaseNumber} · ${fmtDateTime(p.purchasedAt)}`}
              value={formatPKR(p.total)}
              valueHint={due > 0 ? <span className="font-medium text-amber-700">Baqi {formatPKR(due)}</span> : undefined}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}
