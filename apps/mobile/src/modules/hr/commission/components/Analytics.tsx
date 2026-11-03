/** 12-month commission: earned and paid per month, who earned most, which rule paid how much. */

import { useQuery } from '@tanstack/react-query';
import { BarChart3, HandCoins, Percent, Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import { formatMoney, formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, BarChart, Card, DonutChart, EmptyState, ErrorState, HBarList, SkeletonRows, StatTile, Text, useTheme } from '@/design';
import { commissionApi } from '../api/commission';
import { COMMISSION_KEY, periodLabel, signed } from '../lib/meta';

export function CommissionAnalytics({ period, onPerson }: { period: string; onPerson: (userId: string, name: string) => void }) {
  const th = useTheme();
  const q = useQuery({ queryKey: [COMMISSION_KEY, 'analytics', period], queryFn: () => commissionApi.analytics(period, 12), placeholderData: (p) => p });
  const d = q.data;
  if (q.isError && !d) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (!d) return <SkeletonRows count={4} />;
  if (!d.people.length) return <EmptyState compact title={t('In 12 mahine me chaalu bandon ki koi sale nahi.')} />;
  const tile = { flexBasis: '47%' as const, flexGrow: 1 };
  const compact = (v: number) => formatMoney(v, { compact: true });
  return (
    <View style={{ gap: th.space(3) }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
        <StatTile style={tile} icon={HandCoins} label={t('12 mahine ki commission')} value={<Text size="xl" weight="bold" ltr>{signed(d.totals.earned)}</Text>}
          hint={d.totals.best ? t('Sab se zyada {{period}}: {{earned}}', { period: periodLabel(d.totals.best.period, true), earned: formatPKR(d.totals.best.earned) }) : undefined} />
        <StatTile style={tile} icon={Wallet} tone="success" label={t('Ada hui')} value={<Amount value={d.totals.paid} weight="bold" size="xl" compact />} hint={t('Baqi {{amount}}', { amount: formatPKR(Math.max(0, d.totals.earned - d.totals.paid)) })} />
        <StatTile style={tile} icon={BarChart3} tone="info" label={t('Chaalu bandon ki sale')} value={<Amount value={d.totals.sale} weight="bold" size="xl" compact />} hint={t('Return nikaal kar')} />
        <StatTile style={tile} icon={Percent} tone="warning" label={t('Sale ka kitna hissa')} value={<Text size="xl" weight="bold" ltr>{`${d.totals.rate}%`}</Text>} hint={t('Commission ÷ sale')} />
      </View>
      <Card title={t('Commission aur payment')}>
        <BarChart labels={d.series.map((s) => periodLabel(s.period, true).slice(0, 3))} highlight={d.series.length - 1} height={170} format={compact}
          series={[{ key: 'earned', label: t('Commission'), values: d.series.map((s) => s.earned) }, { key: 'paid', label: t('Ada'), values: d.series.map((s) => s.paid) }]} />
      </Card>
      <Card title={t('Bande')}>
        <HBarList rows={d.people.slice(0, 10).map((p) => ({ key: p.userId, label: p.name, value: p.earned, display: signed(p.earned), hint: `${t('Sale')} ${formatPKR(p.sale)} · ${p.rate}%`, onPress: () => onPerson(p.userId, p.name) }))} />
      </Card>
      {d.byRule.length > 0 && (
        <Card title={t('Kis rule se kitni')}>
          <DonutChart slices={d.byRule.filter((r) => r.amount > 0).map((r, i) => ({ key: String(i), label: r.label, value: r.amount }))} format={compact} />
        </Card>
      )}
    </View>
  );
}
