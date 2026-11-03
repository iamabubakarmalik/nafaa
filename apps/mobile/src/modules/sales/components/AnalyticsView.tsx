/** Sales analytics for the period: trend, payments, top products and customers, busy hours, staff. Needs internet; the last loaded data stays readable. */

import { useQuery } from '@tanstack/react-query';
import { CloudOff } from 'lucide-react-native';
import { View } from 'react-native';
import { formatMoney, formatNumber } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Card, EmptyState, ListRow, ProgressBar, Row, SkeletonRows, StatTile, Text, useTheme } from '@/design';
import { methodLabel } from '@/modules/pos/components/parts';
import { salesHistoryApi, type HistoryFilters } from '../api/history';
import { HISTORY_KEY } from '../lib/useHistory';
import { CachedNote } from './CachedNote';
import { MiniBars } from './MiniBars';

const hourText = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;

export function AnalyticsView({ filters, costHidden }: { filters: HistoryFilters; costHidden: boolean }) {
  const th = useTheme();
  const q = useQuery({ queryKey: [HISTORY_KEY, 'analytics', filters], queryFn: () => salesHistoryApi.analytics(filters), staleTime: 60_000, placeholderData: (p) => p });
  const d = q.data;
  if (q.isLoading && !d) return <SkeletonRows count={4} />;
  if (!d) return <EmptyState icon={CloudOff} title={t('Analytics ke liye internet chahiye')} message={t('Internet aate hi yahan aa jayega.')} />;

  const total = d.trend.reduce((a, x) => a + x.sales, 0);
  const prev = d.previous;
  const delta = prev && prev.total > 0 ? ((total - prev.total) / prev.total) * 100 : null;
  const hours = [...d.hours].sort((a, b) => b.sales - a.sales).slice(0, 4);
  const maxPay = Math.max(1, ...d.payments.map((p) => p.total));
  const maxProd = Math.max(1, ...d.topProducts.map((p) => p.revenue));
  const busiest = d.weekdays.reduce((b, x) => (x.sales > b.sales ? x : b), d.weekdays[0] ?? { day: 0, sales: 0, bills: 0 });
  const DAYS = [t('Itwar'), t('Peer'), t('Mangal'), t('Budh'), t('Jumeraat'), t('Juma'), t('Hafta')];

  return (
    <View style={{ gap: th.space(3) }}>
      <CachedNote query={q} />
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Total sale')} value={<Amount value={total} size="lg" weight="bold" />}
          hint={delta === null ? undefined : t('{{value}}% pichli period se', { value: `${delta > 0 ? '+' : ''}${formatNumber(delta, { decimals: 0 })}` })} tone={delta !== null && delta < 0 ? 'danger' : 'success'} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Customers')} value={String(d.customers.uniqueCustomers)}
          hint={t('{{n}} naye · {{r}} wapas aaye', { n: d.customers.newCustomers, r: d.customers.repeatCustomers })} tone="info" />
      </Row>
      {d.trend.length > 1 && (
        <Card title={t('Sale ka rukh')}>
          <MiniBars points={d.trend.slice(-31).map((x) => ({ key: x.key, value: x.sales }))} />
        </Card>
      )}
      {d.payments.length > 0 && (
        <Card title={t('Payment ke tareeqe')}>
          <View style={{ gap: th.space(2.5) }}>
            {d.payments.map((p) => (
              <View key={p.method} style={{ gap: 4 }}>
                <Row justify="between"><Text size="sm">{methodLabel(p.method)} <Text size="sm" tone="muted">· {p.bills}</Text></Text><Amount value={p.total} size="sm" /></Row>
                <ProgressBar value={p.total / maxPay} />
              </View>
            ))}
          </View>
        </Card>
      )}
      {d.topProducts.length > 0 && (
        <Card title={t('Sab se zyada bikne wale')} flush>
          {d.topProducts.slice(0, 6).map((p, i) => (
            <ListRow key={p.productId} dense title={p.name} subtitle={`${formatNumber(p.qty, { maxDecimals: 2 })} ${p.unit}`}
              leading={<Text weight="bold" tone="muted" style={{ width: 22 }}>{i + 1}</Text>}
              trailing={<View style={{ alignItems: 'flex-end', width: 96, gap: 4 }}><Amount value={p.revenue} size="sm" /><ProgressBar value={p.revenue / maxProd} /></View>} />
          ))}
        </Card>
      )}
      {d.topCustomers.length > 0 && (
        <Card title={t('Sab se bare customers')} flush>
          {d.topCustomers.slice(0, 5).map((c) => (
            <ListRow key={c.customerId} dense title={c.name} subtitle={t('{{bills}} bill', { bills: c.bills })} trailing={<Amount value={c.total} size="sm" />} />
          ))}
        </Card>
      )}
      {hours.length > 0 && (
        <Card title={t('Rush ka waqt')} description={t('Sab se zyada Sale wale ghante')}>
          <Row gap={2} wrap>
            {hours.map((h) => (
              <View key={h.hour} style={{ minWidth: '22%', flexGrow: 1, padding: th.space(2.5), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
                <Text size="sm" weight="bold" ltr>{hourText(h.hour)}</Text>
                <Text size="xs" tone="muted" ltr>{formatMoney(h.sales, { compact: true })}</Text>
              </View>
            ))}
          </Row>
          {busiest.sales > 0 && <Text size="xs" tone="muted" style={{ marginTop: th.space(2) }}>{t('Sab se zyada Sale: {{day}}', { day: DAYS[busiest.day] })}</Text>}
        </Card>
      )}
      {d.staff.length > 1 && (
        <Card title={t('Staff')} flush>
          {d.staff.map((s) => (
            <ListRow key={s.userId} dense title={s.name} subtitle={t('{{bills}} bill', { bills: s.bills })}
              trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={s.total} size="sm" />{!costHidden && <Amount value={s.profit} size="xs" tone="success" />}</View>} />
          ))}
        </Card>
      )}
    </View>
  );
}
