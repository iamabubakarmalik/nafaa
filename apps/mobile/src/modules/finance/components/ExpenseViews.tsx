/** Analytics and "every month" tabs of the expenses screen. */

import { Repeat } from 'lucide-react-native';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { formatDate, formatMoney } from '@/core/format';
import { Amount, BarChart, Badge, DonutChart, EmptyState, HBarList, ListRow, SkeletonRows, Text, useTheme } from '@/design';
import { ChartCard, Delta, KpiGrid } from '@/modules/reports/components/ui';
import type { ExpenseAnalytics, RepeatingExpenses } from '../api/expenses';
import { methodOf } from '../lib/meta';

const monthShort = (key: string) => new Date(`${key}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'short' });

export function ExpenseAnalyticsView({ data, loading, onCategory }: { data?: ExpenseAnalytics; loading: boolean; onCategory: (id: string) => void }) {
  const th = useTheme();
  if (loading && !data) return <SkeletonRows count={4} />;
  if (!data || data.totals.count === 0) return <EmptyState title={t('Is period me koi expense nahi')} />;
  const tt = data.totals;
  return (
    <View style={{ gap: th.space(4) }}>
      <KpiGrid items={[
        { label: t('Kul expense'), value: <Amount value={tt.amount} size="xl" weight="bold" />, hint: <Delta value={tt.change} upIsGood={false} /> },
        { label: t('Roz ka ausat'), value: <Amount value={tt.perDay} size="xl" weight="bold" />, hint: t('{{count}} din', { count: tt.days }) },
        { label: t('Baqi bill'), value: <Amount value={tt.pending} size="xl" weight="bold" />, hint: t('{{count}} bill', { count: tt.pendingCount }), tone: 'warning' },
        { label: t('Sab se bara'), value: <Amount value={tt.biggest?.amount ?? 0} size="xl" weight="bold" />, hint: tt.biggest?.title, tone: 'danger' },
      ]} />
      <ChartCard title={t('Category ke hisaab se')}>
        <DonutChart slices={data.byCategory.map((c) => ({ key: c.key, label: c.label, value: c.amount, color: c.color }))} center={<Amount value={tt.amount} compact weight="bold" size="md" />} />
        <View style={{ height: th.space(3) }} />
        <HBarList rows={data.byCategory.slice(0, 8).map((c) => ({ key: c.key, label: c.label, value: c.amount, color: c.color, display: formatMoney(c.amount), hint: t('{{count}} expenses', { count: c.count }), onPress: c.key && c.key !== 'none' ? () => onCategory(c.key) : undefined }))} />
      </ChartCard>
      {data.byDay.length > 1 && (
        <ChartCard title={data.byDay.length > 45 ? t('Mahine ke hisaab se') : t('Roz ka expense')}>
          <BarChart labels={(data.byDay.length > 45 ? data.byMonth : data.byDay).map((x) => (data.byDay.length > 45 ? monthShort(x.key) : x.key.slice(8)))}
            series={[{ key: 'a', values: (data.byDay.length > 45 ? data.byMonth : data.byDay).map((x) => x.amount) }]} format={formatMoney} />
        </ChartCard>
      )}
      {data.byMethod.length > 0 && (
        <ChartCard title={t('Kaise diye')}>
          <DonutChart slices={data.byMethod.map((m) => ({ key: m.key, label: methodOf(m.key).label, value: m.amount, color: methodOf(m.key).color }))} />
        </ChartCard>
      )}
      {data.byPerson.length > 1 && <ChartCard title={t('Staff ke hisaab se')}><HBarList colorful rows={data.byPerson.map((p) => ({ key: p.key, label: p.label, value: p.amount, display: formatMoney(p.amount) }))} /></ChartCard>}
      {data.byBranch.length > 1 && <ChartCard title={t('Branch ke hisaab se')}><HBarList colorful rows={data.byBranch.map((p) => ({ key: p.key, label: p.label, value: p.amount, display: formatMoney(p.amount) }))} /></ChartCard>}
      {data.topPayees.length > 0 && <ChartCard title={t('Sab se zyada kis ko diya')}><HBarList rows={data.topPayees.slice(0, 6).map((p) => ({ key: p.key, label: p.label, value: p.amount, display: formatMoney(p.amount), hint: t('{{count}} expenses', { count: p.count }) }))} /></ChartCard>}
    </View>
  );
}

export function RepeatingView({ data, loading, onRecord }: { data?: RepeatingExpenses; loading: boolean; onRecord: (e: RepeatingExpenses['items'][number]) => void }) {
  const th = useTheme();
  if (loading && !data) return <SkeletonRows count={4} />;
  if (!data || data.items.length === 0) return <EmptyState icon={Repeat} title={t('Abhi koi har mahine wala expense nahi')} message={t('Pichle 3 mahine dekh kar — jo expense baar baar aata hai woh yahan hoga')} />;
  return (
    <View style={{ gap: th.space(3) }}>
      {data.due > 0 && <Text size="sm" tone="warning" weight="semibold">{t('{{count}} bill is mahine abhi nahi likhe ({{amount}})', { count: data.due, amount: formatMoney(data.dueAmount) })}</Text>}
      {data.items.map((e) => (
        <ListRow key={e.key} title={e.title} subtitle={`${e.category?.name ?? t('Bina category')} · ${t('aksar {{day}} tareekh', { day: e.usualDay })} · ${formatDate(e.lastDate)}`}
          trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Amount value={e.thisMonth.amount || e.lastAmount} weight="bold" />{e.due ? <Badge tone="warning">{t('Baqi')}</Badge> : <Badge tone="success">{t('Likh diya')}</Badge>}</View>}
          onPress={e.due ? () => onRecord(e) : undefined} />
      ))}
    </View>
  );
}
