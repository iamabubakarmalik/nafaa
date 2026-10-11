/** Products at or below their alert level, filterable to out-of-stock or low. */

import { Package, PackageCheck } from 'lucide-react';
import { Badge, Skeleton } from '@/design-system/components';
import { useDashboardList, type LowList } from '../data/queries';
import { LIMIT_OPTIONS, MiniSelect, useWidgetState } from '../engine/controls';
import { fmtQty, IconBubble, ListRow, RowList, WidgetCard } from '../engine/parts';
import { CategorySelect, ListToolbar } from './ListToolbar';

export function LowStock({ productPath, title = 'Kam stock', hint = 'dobara mangwane ka waqt' }: {
  productPath: (id: string) => string; title?: string; hint?: string;
}) {
  const [s, set] = useWidgetState('low-stock', { filter: 'all', limit: '10', categoryId: '' });
  const { data, isLoading } = useDashboardList<LowList>({ kind: 'low', filter: s.filter, limit: s.limit, categoryId: s.categoryId || undefined });
  const rows = data?.items ?? [];

  return (
    <WidgetCard
      title={title}
      icon={Package}
      description={data ? `${data.total} cheezein · ${data.outCount} khatam — ${hint}` : hint}
      to="/low-stock"
      flush
    >
      <ListToolbar
        print={() => ({
          title,
          subtitle: 'Mangwane ki list',
          sections: [{
            kind: 'table',
            columns: [{ label: 'Item' }, { label: 'Stock', align: 'right' }, { label: 'Alert', align: 'right', wideOnly: true }, { label: 'Mangwana', align: 'right' }],
            rows: rows.map((r) => [r.name, `${fmtQty(r.stock)} ${r.unit}`, fmtQty(r.lowStockAlert), '______']),
          }],
        })}
      >
        <MiniSelect label="Filter" value={s.filter} onChange={(filter) => set({ filter })}
          options={[{ value: 'all', label: 'Sab' }, { value: 'out', label: 'Sirf khatam' }, { value: 'low', label: 'Sirf kam' }]} />
        <MiniSelect label="Kitne" value={s.limit} onChange={(limit) => set({ limit })} options={LIMIT_OPTIONS} />
        <CategorySelect value={s.categoryId} onChange={(categoryId) => set({ categoryId })} />
      </ListToolbar>
      {isLoading ? (
        <div className="space-y-2 px-5 pb-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto">
          <RowList empty="Sab cheezein poori hain" emptyIcon={PackageCheck}>
            {rows.map((p) => {
              const out = p.stock <= 0;
              return (
                <ListRow
                  key={p.id}
                  to={productPath(p.id)}
                  leading={<IconBubble icon={Package} tone={out ? 'danger' : 'warning'} />}
                  title={p.name}
                  meta={`${fmtQty(p.stock)} ${p.unit} baqi · alert ${fmtQty(p.lowStockAlert)}${p.category ? ` · ${p.category}` : ''}`}
                  value={<Badge variant={out ? 'danger' : 'warning'} size="xs">{out ? 'Khatam' : 'Kam'}</Badge>}
                />
              );
            })}
          </RowList>
        </div>
      )}
    </WidgetCard>
  );
}
