/** In-stock products with no sale in 30/60/90 days, sorted by tied-up value or stock. */

import { Hourglass, Package } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { useDashboardList, type SlowList } from '../data/queries';
import { LIMIT_OPTIONS, MiniSelect, useWidgetState } from '../engine/controls';
import { useMasked } from '../engine/useMasked';
import { fmtDateTime, fmtQty, ListRow, RowList, WidgetCard } from '../engine/parts';
import { CategorySelect, WidgetToolbar } from './WidgetToolbar';
import { t } from '@core/i18n';

const DAYS = [{ value: '30', label: t('30 din se') }, { value: '60', label: t('60 din se') }, { value: '90', label: t('90 din se') }];

export function SlowMovers({ productPath }: { productPath: (id: string) => string }) {
  const [s, set] = useWidgetState('slow-movers', { days: '30', sort: 'value', limit: '10', categoryId: '' });
  const { cost } = useMasked();
  const { data, isLoading } = useDashboardList<SlowList>({ kind: 'slow', days: s.days, sort: s.sort, limit: s.limit, categoryId: s.categoryId || undefined });
  const rows = data?.items ?? [];

  return (
    <WidgetCard
      title={t('Atka hua maal')}
      icon={Hourglass}
      description={data ? t('{{total}} cheezein {{days}} din se nahi biki · {{totalValue}} ka maal', { total: data.total, days: s.days, totalValue: cost(data.totalValue) }) : t('{{days}} din se nahi bika', { days: s.days })}
      flush
    >
      <WidgetToolbar
        print={() => ({
          title: t('Atka hua maal'),
          subtitle: t('{{days}} din se nahi bika', { days: s.days }),
          sections: [{
            kind: 'table',
            columns: [{ label: t('Item') }, { label: t('Stock'), align: 'right' }, { label: t('Aakhri sale'), wideOnly: true }, { label: t('Maal'), align: 'right' }],
            rows: rows.map((r) => [r.name, `${fmtQty(r.stock)} ${r.unit}`, r.lastSoldAt ? fmtDateTime(r.lastSoldAt) : t('Kabhi nahi'), cost(r.value)]),
            footer: [t('Kul'), '', '', cost(data?.totalValue ?? 0)],
          }],
        })}
      >
        <MiniSelect label={t('Period')} value={s.days} onChange={(days) => set({ days })} options={DAYS} />
        <MiniSelect label={t('Sort')} value={s.sort} onChange={(sort) => set({ sort })} options={[{ value: 'value', label: t('Maal ki qeemat') }, { value: 'stock', label: t('Stock ginti') }]} />
        <MiniSelect label={t('Kitne')} value={s.limit} onChange={(limit) => set({ limit })} options={LIMIT_OPTIONS} />
        <CategorySelect value={s.categoryId} onChange={(categoryId) => set({ categoryId })} />
      </WidgetToolbar>
      {isLoading ? (
        <div className="space-y-2 px-5 pb-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto">
          <RowList empty={t('Shabash — sab maal chal raha hai')} emptyIcon={Hourglass}>
            {rows.map((p) => (
              <ListRow
                key={p.id}
                to={productPath(p.id)}
                icon={Package}
                title={p.name}
                meta={t('Stock {{stock}} {{unit}} · {{value}}', { stock: fmtQty(p.stock), unit: p.unit, value: p.lastSoldAt ? t('aakhri sale {{lastSoldAt}}', { lastSoldAt: fmtDateTime(p.lastSoldAt) }) : t('kabhi nahi bika') })}
                value={cost(p.value)}
              />
            ))}
          </RowList>
        </div>
      )}
    </WidgetCard>
  );
}
