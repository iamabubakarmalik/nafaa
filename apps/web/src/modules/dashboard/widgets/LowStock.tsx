/** Products at or below their alert level. */

import { Package, PackageCheck } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { useOverview } from '../data/queries';
import { fmtQty, IconBubble, ListRow, RowList, WidgetCard } from '../engine/parts';

export function LowStock({ productPath, title = 'Kam stock', hint = 'Dobara mangwane ka waqt' }: {
  productPath: (id: string) => string; title?: string; hint?: string;
}) {
  const { data } = useOverview();
  const s = data?.stats;
  return (
    <WidgetCard
      title={title}
      description={s ? `${s.lowStockCount} kam · ${s.outOfStockCount} khatam — ${hint}` : hint}
      to="/low-stock"
      flush
    >
      <RowList empty="Sab cheezein poori hain" emptyIcon={PackageCheck}>
        {(data?.lowStockProducts ?? []).slice(0, 8).map((p) => {
          const out = Number(p.stock) <= 0;
          return (
            <ListRow
              key={p.id}
              to={productPath(p.id)}
              leading={<IconBubble icon={Package} tone={out ? 'danger' : 'warning'} />}
              title={p.name}
              meta={`${fmtQty(p.stock)} ${p.unit} baqi · alert ${p.lowStockAlert}`}
              value={<Badge variant={out ? 'danger' : 'warning'} size="xs">{out ? 'Khatam' : 'Kam'}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}
