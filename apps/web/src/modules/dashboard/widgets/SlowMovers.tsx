/** Stock that has not sold in 30 days: discount it or stop buying it. */

import { Hourglass, Package } from 'lucide-react';
import { useSlowMovers } from '../data/queries';
import { useMasked } from '../engine/useMasked';
import { fmtDateTime, fmtQty, ListRow, RowList, WidgetCard } from '../engine/parts';

export function SlowMovers({ productPath }: { productPath: (id: string) => string }) {
  const { data = [] } = useSlowMovers();
  const { cost } = useMasked();
  return (
    <WidgetCard title="Atka hua maal" description="30 din se nahi bika — deal banayein ya mangwana band" flush>
      <RowList empty="Shabash — sab maal chal raha hai" emptyIcon={Hourglass}>
        {data.slice(0, 8).map((p) => (
          <ListRow
            key={p.id}
            to={productPath(p.id)}
            icon={Package}
            title={p.name}
            meta={`Stock ${fmtQty(p.stock)} ${p.unit ?? ''} · ${p.lastSoldAt ? `aakhri bikri ${fmtDateTime(p.lastSoldAt)}` : 'kabhi nahi bika'}`}
            value={cost(Number(p.stock || 0) * Number(p.costPrice ?? p.price ?? 0))}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}
