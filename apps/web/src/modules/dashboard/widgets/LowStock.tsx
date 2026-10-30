/** Products at or below their alert level, filterable to out-of-stock or low. */

import { Package, PackageCheck } from 'lucide-react';
import { Badge, Skeleton } from '@/design-system/components';
import { useDashboardList, type LowList } from '../data/queries';
import { LIMIT_OPTIONS, MiniSelect, useWidgetState } from '../engine/controls';
import { fmtQty, IconBubble, ListRow, RowList, WidgetCard } from '../engine/parts';
import { CategorySelect, WidgetToolbar } from './WidgetToolbar';
import { t } from '@core/i18n';

export function LowStock({ productPath, title = t('Kam stock'), hint = t('dobara mangwane ka waqt') }: {
  productPath: (id: string) => string; title?: string; hint?: string;
}) {
  const [s, set] = useWidgetState('low-stock', { filter: 'all', limit: '10', categoryId: '' });
  const { data, isLoading } = useDashboardList<LowList>({ kind: 'low', filter: s.filter, limit: s.limit, categoryId: s.categoryId || undefined });
  const rows = data?.items ?? [];

  return (
    <WidgetCard
      title={title}
      icon={Package}
      description={data ? t('{{total}} cheezein · {{outCount}} khatam — {{hint}}', { total: data.total, outCount: data.outCount, hint }) : hint}
      to="/low-stock"
      flush
    >
      <WidgetToolbar
        print={() => ({
          title,
          subtitle: t('Mangwane ki list'),
          sections: [{
            kind: 'table',
            columns: [{ label: t('Item') }, { label: t('Stock'), align: 'right' }, { label: t('Alert'), align: 'right', wideOnly: true }, { label: t('Mangwana'), align: 'right' }],
            rows: rows.map((r) => [r.name, `${fmtQty(r.stock)} ${r.unit}`, fmtQty(r.lowStockAlert), '______']),
          }],
        })}
      >
        <MiniSelect label={t('Filter')} value={s.filter} onChange={(filter) => set({ filter })}
          options={[{ value: 'all', label: t('Sab') }, { value: 'out', label: t('Sirf khatam') }, { value: 'low', label: t('Sirf kam') }]} />
        <MiniSelect label={t('Kitne')} value={s.limit} onChange={(limit) => set({ limit })} options={LIMIT_OPTIONS} />
        <CategorySelect value={s.categoryId} onChange={(categoryId) => set({ categoryId })} />
      </WidgetToolbar>
      {isLoading ? (
        <div className="space-y-2 px-5 pb-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto">
          <RowList empty={t('Sab cheezein poori hain')} emptyIcon={PackageCheck}>
            {rows.map((p) => {
              const out = p.stock <= 0;
              return (
                <ListRow
                  key={p.id}
                  to={productPath(p.id)}
                  leading={<IconBubble icon={Package} tone={out ? 'danger' : 'warning'} />}
                  title={p.name}
                  meta={t('{{stock}} {{unit}} baqi · alert {{lowStockAlert}}{{value}}', { stock: fmtQty(p.stock), unit: p.unit, lowStockAlert: fmtQty(p.lowStockAlert), value: p.category ? ` · ${p.category}` : '' })}
                  value={<Badge variant={out ? 'danger' : 'warning'} size="xs">{out ? t('Khatam') : t('Kam')}</Badge>}
                />
              );
            })}
          </RowList>
        </div>
      )}
    </WidgetCard>
  );
}
