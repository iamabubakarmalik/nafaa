/** Best sellers with period, sort, count and category controls. */

import { Crown } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useDashboardList, type TopList } from '../data/queries';
import { LIMIT_OPTIONS, MiniSelect, useWidgetState } from '../engine/controls';
import { useMasked } from '../engine/useMasked';
import { fmtQty, ListRow, RowList, WidgetCard } from '../engine/parts';
import { CategorySelect, WidgetToolbar } from './WidgetToolbar';

const PERIODS = [
  { value: '1', label: 'Aaj' }, { value: '7', label: '7 din' }, { value: '30', label: '30 din' }, { value: '90', label: '90 din' },
];
const PERIOD_LABEL: Record<string, string> = { '1': 'aaj', '7': 'pichhle 7 din', '30': 'pichhle 30 din', '90': 'pichhle 90 din' };

export function TopProducts({ productPath, hint }: { productPath: (id: string) => string; hint?: string }) {
  const [s, set] = useWidgetState('top-products', { days: '30', sort: 'revenue', limit: '10', categoryId: '' });
  const { costHidden, sales, cost } = useMasked();
  const sort = costHidden && s.sort === 'profit' ? 'revenue' : s.sort;
  const { data, isLoading } = useDashboardList<TopList>({ kind: 'top', days: s.days, sort, limit: s.limit, categoryId: s.categoryId || undefined });
  const rows = data?.items ?? [];
  const sortOptions = [{ value: 'revenue', label: 'Raqam se' }, { value: 'qty', label: 'Ginti se' }, ...(costHidden ? [] : [{ value: 'profit', label: 'Munafe se' }])];

  return (
    <WidgetCard title="Sab se zyada bika" icon={Crown} description={hint ?? `${PERIOD_LABEL[s.days]} · ${data?.total ?? 0} cheezein biki`} flush>
      <WidgetToolbar
        print={() => ({
          title: 'Sab se zyada bika',
          subtitle: `${PERIOD_LABEL[s.days]} · ${sortOptions.find((o) => o.value === sort)?.label}`,
          sections: [{
            kind: 'table',
            columns: [{ label: '#' }, { label: 'Item' }, { label: 'Qty', align: 'right' }, { label: 'Bill', align: 'right', wideOnly: true }, { label: 'Raqam', align: 'right' }],
            rows: rows.map((r, i) => [String(i + 1), r.name, `${fmtQty(r.qty)} ${r.unit}`, String(r.bills), sales(r.revenue)]),
          }],
        })}
      >
        <MiniSelect label="Muddat" value={s.days} onChange={(days) => set({ days })} options={PERIODS} />
        <MiniSelect label="Tarteeb" value={sort} onChange={(v) => set({ sort: v })} options={sortOptions} />
        <MiniSelect label="Kitne" value={s.limit} onChange={(limit) => set({ limit })} options={LIMIT_OPTIONS} />
        <CategorySelect value={s.categoryId} onChange={(categoryId) => set({ categoryId })} />
      </WidgetToolbar>
      {isLoading ? (
        <div className="space-y-2 px-5 pb-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto">
          <RowList empty="Is muddat me koi bikri nahi" emptyIcon={Crown}>
            {rows.map((p, i) => (
              <ListRow
                key={p.id}
                to={productPath(p.id)}
                leading={
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[0.75rem] font-bold',
                    i < 3 ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-600')}>{i + 1}</span>
                }
                title={p.name}
                meta={`${fmtQty(p.qty)} ${p.unit} · ${p.bills} bill${p.category ? ` · ${p.category}` : ''}`}
                value={sort === 'qty' ? `${fmtQty(p.qty)} ${p.unit}` : sort === 'profit' ? cost(p.profit) : sales(p.revenue)}
                valueHint={sort !== 'revenue' ? <span className="text-slate-500">{sales(p.revenue)}</span> : undefined}
              />
            ))}
          </RowList>
        </div>
      )}
    </WidgetCard>
  );
}
