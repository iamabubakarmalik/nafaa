/** Best sellers with period, sort, count and category controls. */

import { Crown } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useDashboardList, type TopList } from '../data/queries';
import { LIMIT_OPTIONS, MiniSelect, useWidgetState } from '../engine/controls';
import { useMasked } from '../engine/useMasked';
import { fmtQty, ListRow, RowList, WidgetCard } from '../engine/parts';
import { CategorySelect, WidgetToolbar } from './WidgetToolbar';
import { t } from '@core/i18n';

const PERIODS = [
  { value: '1', label: t('Aaj') }, { value: '7', label: t('7 din') }, { value: '30', label: t('30 din') }, { value: '90', label: t('90 din') },
];
const PERIOD_LABEL: Record<string, string> = { '1': 'aaj', '7': t('pichhle 7 din'), '30': t('pichhle 30 din'), '90': t('pichhle 90 din') };

export function TopProducts({ productPath, hint }: { productPath: (id: string) => string; hint?: string }) {
  const [s, set] = useWidgetState('top-products', { days: '30', sort: 'revenue', limit: '10', categoryId: '' });
  const { costHidden, sales, cost } = useMasked();
  const sort = costHidden && s.sort === 'profit' ? 'revenue' : s.sort;
  const { data, isLoading } = useDashboardList<TopList>({ kind: 'top', days: s.days, sort, limit: s.limit, categoryId: s.categoryId || undefined });
  const rows = data?.items ?? [];
  const sortOptions = [{ value: 'revenue', label: t('Amount se') }, { value: 'qty', label: t('Ginti se') }, ...(costHidden ? [] : [{ value: 'profit', label: t('Profit se') }])];

  return (
    <WidgetCard title={t('Sab se zyada bika')} icon={Crown} description={hint ?? t('{{value}} · {{value2}} cheezein biki', { value: PERIOD_LABEL[s.days], value2: data?.total ?? 0 })} flush>
      <WidgetToolbar
        print={() => ({
          title: t('Sab se zyada bika'),
          subtitle: `${PERIOD_LABEL[s.days]} · ${sortOptions.find((o) => o.value === sort)?.label}`,
          sections: [{
            kind: 'table',
            columns: [{ label: '#' }, { label: t('Item') }, { label: t('Qty'), align: 'right' }, { label: t('Bill'), align: 'right', wideOnly: true }, { label: t('Amount'), align: 'right' }],
            rows: rows.map((r, i) => [String(i + 1), r.name, `${fmtQty(r.qty)} ${r.unit}`, String(r.bills), sales(r.revenue)]),
          }],
        })}
      >
        <MiniSelect label={t('Period')} value={s.days} onChange={(days) => set({ days })} options={PERIODS} />
        <MiniSelect label={t('Sort')} value={sort} onChange={(v) => set({ sort: v })} options={sortOptions} />
        <MiniSelect label={t('Kitne')} value={s.limit} onChange={(limit) => set({ limit })} options={LIMIT_OPTIONS} />
        <CategorySelect value={s.categoryId} onChange={(categoryId) => set({ categoryId })} />
      </WidgetToolbar>
      {isLoading ? (
        <div className="space-y-2 px-5 pb-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto">
          <RowList empty={t('Is period me koi sale nahi')} emptyIcon={Crown}>
            {rows.map((p, i) => (
              <ListRow
                key={p.id}
                to={productPath(p.id)}
                leading={
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[0.75rem] font-bold',
                    i < 3 ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-600')}>{i + 1}</span>
                }
                title={p.name}
                meta={t('{{qty}} {{unit}} · {{bills}} bill{{value}}', { qty: fmtQty(p.qty), unit: p.unit, bills: p.bills, value: p.category ? ` · ${p.category}` : '' })}
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
