/** Latest bills, filterable by payment method. */

import { Receipt } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { useDashboardList, type RecentList } from '../data/queries';
import { LIMIT_OPTIONS, MiniSelect, useWidgetState } from '../engine/controls';
import { PAYMENT_COLORS, PAYMENT_LABELS } from '../engine/useChartTheme';
import { useMasked } from '../engine/useMasked';
import { fmtDateTime, ListRow, RowList, WidgetCard } from '../engine/parts';
import { WidgetToolbar } from './WidgetToolbar';
import { t } from '@core/i18n';

const METHODS = ['', 'CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER'];

export function RecentSales() {
  const [s, set] = useWidgetState('recent-sales', { method: '', limit: '10' });
  const { sales } = useMasked();
  const { data, isLoading } = useDashboardList<RecentList>({ kind: 'recent', method: s.method || undefined, limit: s.limit });
  const rows = data?.items ?? [];

  return (
    <WidgetCard title={t('Haaliya sale')} icon={Receipt} description={t('Aakhri bill')} to="/sales" flush>
      <WidgetToolbar
        print={() => ({
          title: t('Haaliya sale'),
          subtitle: s.method ? PAYMENT_LABELS[s.method] : t('Sab payments'),
          sections: [{
            kind: 'table',
            columns: [{ label: t('Bill') }, { label: t('Waqt'), wideOnly: true }, { label: t('Customer'), wideOnly: true }, { label: t('Amount'), align: 'right' }],
            rows: rows.map((r) => [r.saleNumber, fmtDateTime(r.soldAt), r.customer ?? t('Walk-in'), sales(r.total)]),
            footer: [t('Kul'), '', '', sales(rows.reduce((x, r) => x + r.total, 0))],
          }],
        })}
      >
        <MiniSelect label={t('Payment')} value={s.method} onChange={(method) => set({ method })}
          options={METHODS.map((m) => ({ value: m, label: m ? PAYMENT_LABELS[m] : t('Sab payments') }))} />
        <MiniSelect label={t('Kitne')} value={s.limit} onChange={(limit) => set({ limit })}
          options={LIMIT_OPTIONS.map((o) => ({ ...o, label: o.label.replace('Top', 'Aakhri') }))} />
      </WidgetToolbar>
      {isLoading ? (
        <div className="space-y-2 px-5 pb-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto">
          <RowList empty={t('Abhi koi bill nahi bana')} emptyIcon={Receipt}>
            {rows.map((r) => {
              const color = PAYMENT_COLORS[r.method] ?? '#64748b';
              return (
                <ListRow
                  key={r.id}
                  to={`/sales/${r.id}/receipt`}
                  leading={
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1f`, color }}>
                      <Receipt className="h-4 w-4" />
                    </span>
                  }
                  title={<span className="font-mono">{r.saleNumber}</span>}
                  meta={t('{{value}} · {{soldAt}} · {{items}} item{{value2}}', { value: r.customer ?? 'Walk-in', soldAt: fmtDateTime(r.soldAt), items: r.items, value2: r.staff ? ` · ${r.staff}` : '' })}
                  value={sales(r.total)}
                  valueHint={r.credit > 0
                    ? <span className="font-medium text-amber-700">{t('{{credit}} udhaar', { credit: formatPKR(r.credit) })}</span>
                    : <span className="text-slate-500">{PAYMENT_LABELS[r.method] ?? r.method}</span>}
                />
              );
            })}
          </RowList>
        </div>
      )}
    </WidgetCard>
  );
}
