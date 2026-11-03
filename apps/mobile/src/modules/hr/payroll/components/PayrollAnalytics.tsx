/** Payroll analytics: 12-month cost and sale share, what the money went on, by branch, staff and designation. */

import { useQuery } from '@tanstack/react-query';
import { HandCoins, Percent, TrendingDown, TrendingUp, Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import { formatMoney, formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, BarChart, Card, DonutChart, EmptyState, ErrorState, HBarList, SkeletonRows, StatTile, Text, useTheme } from '@/design';
import { payrollApi } from '../api/payroll';
import { PAYROLL_KEY } from '../lib/meta';

export function PayrollAnalytics({ month, shopId }: { month: string; shopId?: string }) {
  const th = useTheme();
  const q = useQuery({ queryKey: [PAYROLL_KEY, 'analytics', month, shopId ?? ''], queryFn: () => payrollApi.analytics(month, shopId, 12), placeholderData: (p) => p });
  const d = q.data;
  if (q.isError && !d) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (!d) return <SkeletonRows count={4} />;
  if (!d.months.some((m) => m.gross > 0)) return <EmptyState compact title={t('Abhi koi tankhwah record nahi')} />;
  const x = d.totals;
  const up = (x.change ?? 0) >= 0;
  const compact = (v: number) => formatMoney(v, { compact: true });
  const tile = { flexBasis: '47%' as const, flexGrow: 1 };

  return (
    <View style={{ gap: th.space(3) }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
        <StatTile style={tile} icon={Wallet} label={t('12 mahine ki tankhwah')} value={<Amount value={x.gross} compact weight="bold" size="xl" />} hint={t('Ausat {{average}} har mahine', { average: formatPKR(x.average) })} />
        <StatTile style={tile} icon={Percent} tone="info" label={t('Sale ka hissa')} value={<Text size="xl" weight="bold" ltr>{x.pct == null ? '—' : `${x.pct}%`}</Text>} hint={t('Sale {{sales}}', { sales: formatPKR(x.sales) })} />
        <StatTile style={tile} icon={up ? TrendingUp : TrendingDown} tone={x.change == null ? 'brand' : up ? 'warning' : 'success'} label={t('Pichle mahine se')}
          value={<Text size="xl" weight="bold" ltr>{x.change == null ? '—' : `${up ? '+' : ''}${x.change}%`}</Text>} hint={t('Is mahine {{current}} · pehle {{previous}}', { current: formatPKR(x.current), previous: formatPKR(x.previous) })} />
        <StatTile style={tile} icon={HandCoins} tone="warning" label={t('Advance ki qisten')} value={<Amount value={x.advanceGiven} compact weight="bold" size="xl" />} hint={t('Fi banda ausat {{perStaff}} (is mahine)', { perStaff: formatPKR(x.perStaff) })} />
      </View>
      <Card title={t('Har mahine ki tankhwah')}>
        <BarChart labels={d.months.map((m) => m.label.slice(0, 3))} series={[{ key: 'gross', label: t('Kul kamai'), values: d.months.map((m) => m.gross) }]} format={compact} height={170} highlight={d.months.length - 1} />
      </Card>
      {d.mix.some((b) => b.amount > 0) && (
        <Card title={t('Tankhwah kis cheez ki')}>
          <DonutChart slices={d.mix.filter((b) => b.amount > 0).map((b) => ({ key: b.key, label: b.label, value: b.amount }))} format={compact} center={<Amount value={x.gross} compact weight="bold" />} />
        </Card>
      )}
      {d.byBranch.length > 1 && (
        <Card title={t('Branch')}>
          <HBarList colorful rows={d.byBranch.map((b) => ({ key: b.key, label: b.label, value: b.gross, display: formatPKR(b.gross), hint: `${t('{{staff}} staff', { staff: b.staff })}${b.pct != null ? ` · ${t('sale ka {{pct}}%', { pct: b.pct })}` : ''}` }))} />
        </Card>
      )}
      {d.byStaff.length > 0 && (
        <Card title={t('Sab se zyada tankhwah')}>
          <HBarList rows={d.byStaff.slice(0, 8).map((s) => ({ key: s.key, label: s.label, value: s.gross, display: formatPKR(s.gross), hint: t('{{designation}} · {{months}} mahine · ausat {{average}}', { designation: s.designation, months: s.months, average: formatPKR(s.average) }) }))} />
        </Card>
      )}
      {d.byDesignation.length > 0 && (
        <Card title={t('Ohda')}>
          <HBarList colorful rows={d.byDesignation.map((b) => ({ key: b.key, label: b.label, value: b.amount, display: formatPKR(b.amount) }))} />
        </Card>
      )}
      <Text size="xs" tone="muted">{t('Kul kamai = asal tankhwah + overtime + commission + bonus. Advance pehle diya ja chuka hota hai, is liye jis mahine katta hai us me alag nahi gina jata.')}</Text>
    </View>
  );
}
