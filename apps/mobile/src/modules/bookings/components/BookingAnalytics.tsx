/** Bookings analytics for a period: how many turned into sales, money in and out, by status, product and staff. */

import { useQuery } from '@tanstack/react-query';
import { CloudOff } from 'lucide-react-native';
import { View } from 'react-native';
import { formatNumber } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Card, EmptyState, ListRow, Row, SkeletonRows, StatTile } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import type { Period } from '@/modules/sales/lib/period';
import { bookingsApi } from '../api/bookings';
import { BOOKINGS_KEY, STATUS } from '../lib/meta';
import type { BookingStatus } from '@nafaa/core/bookings';

export function BookingAnalyticsView({ period }: { period: Period }) {
  const range = { from: period.from === 'all' ? undefined : period.from, to: period.to };
  const q = useQuery({ queryKey: [BOOKINGS_KEY, 'analytics', range], queryFn: () => bookingsApi.analytics(range), placeholderData: (p) => p });
  const d = q.data;
  if (q.isLoading && !d) return <SkeletonRows count={4} />;
  if (!d) return <EmptyState icon={CloudOff} title={t('Analytics ke liye internet chahiye')} />;
  const tot = d.totals;
  return (
    <View style={{ gap: 12 }}>
      <CachedNote query={q} />
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Bookings')} value={String(tot.count)} hint={t('{{open}} khuli', { open: tot.open })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Sale ban gayi')} value={tot.conversionRate == null ? '—' : `${formatNumber(tot.conversionRate * (tot.conversionRate <= 1 ? 100 : 1), { decimals: 0 })}%`} hint={t('{{count}} bill', { count: tot.converted })} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="info" label={t('Advance mila')} value={<Amount value={tot.received} weight="bold" compact />} hint={t('{{refunded}} wapas diye', { refunded: Math.round(tot.refunded) })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="warning" label={t('Cancel')} value={String(tot.cancelled)} hint={tot.avgDaysToSale != null ? t('{{count}} din me sale', { count: Math.round(tot.avgDaysToSale) }) : undefined} />
      </Row>
      {d.byStatus.length > 0 && (
        <Card title={t('Halat')} flush>
          {d.byStatus.map((s) => <ListRow key={s.key} dense title={STATUS[s.key as BookingStatus] ? t(STATUS[s.key as BookingStatus].label) : s.label} subtitle={t('{{count}} booking', { count: s.count })} trailing={<Amount value={s.value} size="sm" />} />)}
        </Card>
      )}
      {d.byProduct.length > 0 && (
        <Card title={t('Sab se zyada booking hone wali cheezein')} flush>
          {d.byProduct.slice(0, 6).map((p) => <ListRow key={p.key} dense title={p.label} subtitle={`${formatNumber(p.qty, { maxDecimals: 2 })} ${p.unit}`} trailing={<Amount value={p.value} size="sm" />} />)}
        </Card>
      )}
      {d.byStaff.length > 1 && (
        <Card title={t('Staff')} flush>
          {d.byStaff.map((s) => <ListRow key={s.key} dense title={s.label} subtitle={t('{{count}} booking', { count: s.count })} trailing={<Amount value={s.value} size="sm" />} />)}
        </Card>
      )}
    </View>
  );
}
