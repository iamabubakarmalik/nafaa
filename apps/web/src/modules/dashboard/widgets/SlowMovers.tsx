/** In-stock products with no sale in 30/60/90 days, sorted by tied-up value or stock. */

import { Hourglass, Package } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { useDashboardList, type SlowList } from '../data/queries';
import { LIMIT_OPTIONS, MiniSelect, useWidgetState } from '../engine/controls';
import { useMasked } from '../engine/useMasked';
import { fmtDateTime, fmtQty, ListRow, RowList, WidgetCard } from '../engine/parts';
import { CategorySelect, ListToolbar } from './ListToolbar';

const DAYS = [{ value: '30', label: '30 din se' }, { value: '60', label: '60 din se' }, { value: '90', label: '90 din se' }];

export function SlowMovers({ productPath }: { productPath: (id: string) => string }) {
  const [s, set] = useWidgetState('slow-movers', { days: '30', sort: 'value', limit: '10', categoryId: '' });
  const { cost } = useMasked();
  const { data, isLoading } = useDashboardList<SlowList>({ kind: 'slow', days: s.days, sort: s.sort, limit: s.limit, categoryId: s.categoryId || undefined });
  const rows = data?.items ?? [];

  return (
    <WidgetCard
      title="Atka hua maal"
      icon={Hourglass}
      description={data ? `${data.total} cheezein ${s.days} din se nahi biki · ${cost(data.totalValue)} ka maal` : `${s.days} din se nahi bika`}
      flush
    >
      <ListToolbar
        print={() => ({
          title: 'Atka hua maal',
          subtitle: `${s.days} din se nahi bika`,
          sections: [{
            kind: 'table',
            columns: [{ label: 'Item' }, { label: 'Stock', align: 'right' }, { label: 'Aakhri bikri', wideOnly: true }, { label: 'Maal', align: 'right' }],
            rows: rows.map((r) => [r.name, `${fmtQty(r.stock)} ${r.unit}`, r.lastSoldAt ? fmtDateTime(r.lastSoldAt) : 'Kabhi nahi', cost(r.value)]),
            footer: ['Kul', '', '', cost(data?.totalValue ?? 0)],
          }],
        })}
      >
        <MiniSelect label="Muddat" value={s.days} onChange={(days) => set({ days })} options={DAYS} />
        <MiniSelect label="Tarteeb" value={s.sort} onChange={(sort) => set({ sort })} options={[{ value: 'value', label: 'Maal ki qeemat' }, { value: 'stock', label: 'Stock ginti' }]} />
        <MiniSelect label="Kitne" value={s.limit} onChange={(limit) => set({ limit })} options={LIMIT_OPTIONS} />
        <CategorySelect value={s.categoryId} onChange={(categoryId) => set({ categoryId })} />
      </ListToolbar>
      {isLoading ? (
        <div className="space-y-2 px-5 pb-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto">
          <RowList empty="Shabash — sab maal chal raha hai" emptyIcon={Hourglass}>
            {rows.map((p) => (
              <ListRow
                key={p.id}
                to={productPath(p.id)}
                icon={Package}
                title={p.name}
                meta={`Stock ${fmtQty(p.stock)} ${p.unit} · ${p.lastSoldAt ? `aakhri bikri ${fmtDateTime(p.lastSoldAt)}` : 'kabhi nahi bika'}`}
                value={cost(p.value)}
              />
            ))}
          </RowList>
        </div>
      )}
    </WidgetCard>
  );
}
