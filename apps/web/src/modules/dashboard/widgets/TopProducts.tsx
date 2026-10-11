/** Best sellers this month: make or stock more of these. */

import { Crown } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { useOverview } from '../data/queries';
import { useMasked } from '../engine/useMasked';
import { fmtQty, ListRow, RowList, WidgetCard } from '../engine/parts';

export function TopProducts({ productPath, hint = 'Is mahine' }: { productPath: (id: string) => string; hint?: string }) {
  const { data } = useOverview();
  const { sales } = useMasked();
  const rows = (data?.topProducts ?? []).slice(0, 8);
  return (
    <WidgetCard title="Sab se zyada bika" description={hint} to="/reports" flush>
      <RowList empty="Abhi koi bikri nahi" emptyIcon={Crown}>
        {rows.map((p, i) => (
          <ListRow
            key={p.productId}
            to={productPath(p.productId)}
            leading={
              <span className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[0.75rem] font-bold',
                i < 3 ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-600',
              )}>{i + 1}</span>
            }
            title={p.product?.name ?? 'Product'}
            meta={`${fmtQty(p.quantitySold)} ${p.product?.unit ?? ''} · ${p.orderCount} bill`}
            value={sales(p.revenue)}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}
