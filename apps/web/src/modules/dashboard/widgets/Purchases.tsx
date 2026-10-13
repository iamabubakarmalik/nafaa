/** Recent stock purchases with any unpaid balance. */

import { Package, ShoppingBag } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { useMoneyMap } from '../data/queries';
import { fmtDateTime, ListRow, RowList, WidgetCard } from '../engine/parts';
import { MiniSelect, useWidgetState } from '../engine/controls';
import { useMasked } from '../engine/useMasked';
import { WidgetToolbar } from './WidgetToolbar';

export function Purchases() {
  const [st, set] = useWidgetState('purchases', { filter: 'all' });
  const { data: m } = useMoneyMap();
  const { cost } = useMasked();
  const recent = (m?.purchases.recent ?? []).filter((p) => st.filter === 'all' || Number(p.total) - Number(p.paidAmount) > 0);
  return (
    <WidgetCard
      title="Maal ki purchase"
      icon={ShoppingBag}
      description={m ? `Aaj ${formatPKR(m.purchases.todayTotal)} · is mahine ${formatPKR(m.purchases.monthTotal)}` : undefined}
      to="/purchases"
      flush
    >
      <WidgetToolbar
        print={() => ({
          title: 'Maal ki purchase', subtitle: st.filter === 'due' ? 'Jin ki payment baqi hai' : 'Haal ki purchase',
          sections: [{ kind: 'table', columns: [{ label: 'Bill' }, { label: 'Supplier' }, { label: 'Kul', align: 'right' }, { label: 'Baqi', align: 'right' }],
            rows: recent.map((p) => [p.purchaseNumber, p.supplier?.name ?? '', cost(p.total), cost(Math.max(Number(p.total) - Number(p.paidAmount), 0))]) }],
        })}>
        <MiniSelect label="Filter" value={st.filter} onChange={(v) => set({ filter: v })} options={[{ value: 'all', label: 'Sab' }, { value: 'due', label: 'Jin ka paisa baqi' }]} />
      </WidgetToolbar>
      <RowList empty="Abhi koi purchase nahi" emptyIcon={ShoppingBag}>
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
