/**
 * Payment health (web PaymentHealthPage): COD still out and its age, which
 * courier holds how much and when it should come (overdue, this week,
 * later), COD vs prepaid share, advances, failed payment links and the
 * month's RTO and refund losses.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Wallet } from 'lucide-react-native';
import { formatMoney, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { Card, ChipGroup, ErrorState, HeroAmount, ListRow, ProgressBar, Screen, SkeletonRows, Text, useTheme } from '@/design';
import { commerceApi, type AgeKey, type ForecastKey } from '../api/board';
import { CourierLogo } from '../components/BrandLogo';
import { CommerceHero } from '../components/CommerceHero';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { KEYS } from '../lib/online';
import { PERIOD_LABEL, periodOptions, periodRange, type PeriodPreset } from '../lib/period';
import { msg } from '@/core/i18n';

const AGES: Array<{ key: AgeKey; label: string }> = [
  { key: 'd0_7', label: msg('0–7 din') }, { key: 'd8_14', label: msg('8–14 din') }, { key: 'd15_30', label: msg('15–30 din') }, { key: 'd30p', label: msg('30+ din') },
];
const FORECAST: Array<{ key: ForecastKey; label: string; tone: 'danger' | 'success' | 'neutral' }> = [
  { key: 'overdue', label: msg('Der ho gayi'), tone: 'danger' }, { key: 'thisWeek', label: msg('Is hafte'), tone: 'success' }, { key: 'later', label: msg('Baad me'), tone: 'neutral' },
];

export function PaymentHealthScreen() {
  const th = useTheme();
  const [period, setPeriod] = useState<PeriodPreset>('month');
  const range = periodRange(period) ?? undefined;
  const q = useQuery({ queryKey: [...KEYS.codSummary, 'health', range?.from, range?.to], queryFn: () => commerceApi.paymentHealth({ ...range }), staleTime: 60_000 });
  const h = q.data;
  const ageMax = h ? Math.max(1, ...AGES.map((a) => h.cod.ages[a.key])) : 1;

  return (
    <Screen title={t('Payment health')} onRefresh={q.refetch} refreshing={q.isRefetching} actions={<OnlineMenuButton current="/online/payment-health" />}>
      <CommerceHero chip={t(PERIOD_LABEL[period])} loading={q.isLoading}
        stats={[
          { label: t('COD baqi'), value: <HeroAmount value={h?.cod.outstanding ?? 0} size="2xl" /> },
          { label: t('Courier ke paas'), value: <HeroAmount value={h?.cod.withCourier ?? 0} size="lg" /> },
          { label: t('Raste me'), value: <HeroAmount value={h?.cod.inTransit ?? 0} size="lg" /> },
          { label: t('Is hafte aayega'), value: <HeroAmount value={h?.forecast.thisWeek ?? 0} size="lg" /> },
        ]} />
      <ChipGroup value={period} onChange={(v) => setPeriod(v as PeriodPreset)} options={periodOptions(['week', 'month', 'thisMonth', 'quarter']).map((o) => ({ ...o, label: t(o.label) }))} />
      {q.isLoading ? <SkeletonRows count={5} /> : q.isError || !h ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <>
          <Card title={t('Kab aayega')}>
            <View style={{ flexDirection: 'row', gap: th.space(2) }}>
              {FORECAST.map((f) => (
                <View key={f.key} style={{ flex: 1, gap: 2 }}>
                  <Text size="2xs" tone="muted">{t(f.label)}</Text>
                  <Text size="base" weight="bold" tone={f.tone === 'neutral' ? 'default' : f.tone} ltr>{formatMoney(h.forecast[f.key])}</Text>
                </View>
              ))}
            </View>
          </Card>
          <Card title={t('COD kitna purana')}>
            <View style={{ gap: th.space(2) }}>
              {AGES.map((a) => (
                <View key={a.key} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text size="sm" tone="secondary">{t(a.label)}</Text>
                    <Text size="sm" weight="semibold" ltr>{formatMoney(h.cod.ages[a.key])}</Text>
                  </View>
                  <ProgressBar value={h.cod.ages[a.key] / ageMax} tone={a.key === 'd30p' ? 'danger' : a.key === 'd15_30' ? 'warning' : 'brand'} />
                </View>
              ))}
            </View>
          </Card>
          <Card flush title={t('Courier wise')}>
            {h.cod.byCourier.length ? h.cod.byCourier.map((c) => (
              <ListRow key={c.code} divider leading={<CourierLogo code={c.code} size={28} />} title={c.name}
                subtitle={t('{{count}} parcel · har {{days}} din me paisa · der {{overdue}}', { count: c.count, days: c.settleDays, overdue: formatMoney(c.forecast.overdue) })}
                trailing={<Text size="sm" weight="bold" ltr>{formatMoney(c.withCourier + c.inTransit)}</Text>}
                onPress={() => router.push(`/online/couriers/${c.code}` as never)} chevron />
            )) : <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Koi COD baqi nahi')}</Text>}
          </Card>
          <Card title={t('COD ya pehle paisa')}>
            <View style={{ gap: th.space(2) }}>
              <Row label={t('COD · {{count}} order', { count: h.mix.cod.count })} value={`${formatMoney(h.mix.cod.value)} · ${h.mix.cod.share}%`} />
              <Row label={t('Prepaid · {{count}} order', { count: h.mix.prepaid.count })} value={`${formatMoney(h.mix.prepaid.value)} · ${h.mix.prepaid.share}%`} />
              <Row label={t('Advance mila · {{count}} order', { count: h.advance.orders })} value={formatMoney(h.advance.value)} />
            </View>
          </Card>
          <Card title={t('Payment links')}>
            <View style={{ gap: th.space(2) }}>
              <Row label={t('Bane · paid')} value={`${h.links.created} · ${h.links.paid} (${formatMoney(h.links.paidValue)})`} />
              <Row label={t('Fail · expire')} value={`${h.links.failed} · ${h.links.expired}`} />
              {h.links.failures.slice(0, 5).map((f) => (
                <ListRow key={`${f.orderId}-${f.at}`} dense icon={Wallet} iconTone="danger" title={`#${f.number} · ${f.customerName}`}
                  subtitle={`${f.provider} · ${f.status} · ${formatRelative(f.at)}`} trailing={<Text size="sm" weight="semibold" ltr>{formatMoney(f.amount)}</Text>}
                  onPress={() => router.push(`/online/orders/${f.orderId}` as never)} />
              ))}
            </View>
          </Card>
          <Card title={t('Nuksan')}>
            <View style={{ gap: th.space(2) }}>
              <Row label={t('RTO · {{count}} parcel', { count: h.losses.rtoCount })} value={formatMoney(h.losses.rtoCost)} danger />
              <Row label={t('RTO maal ki value')} value={formatMoney(h.losses.rtoGoods)} />
              <Row label={t('Refund · {{count}}', { count: h.losses.refundCount })} value={formatMoney(h.losses.refunds)} danger />
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Text size="sm" tone="secondary" style={{ flex: 1 }}>{label}</Text>
      <Text size="sm" weight="semibold" tone={danger ? 'danger' : 'default'} ltr>{value}</Text>
    </View>
  );
}
