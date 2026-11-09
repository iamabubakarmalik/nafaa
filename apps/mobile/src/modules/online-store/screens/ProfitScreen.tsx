/**
 * Online profit (web ProfitPage): Sale − product Cost − ads − courier −
 * returns − other Expenses = net Profit for a period, cash actually
 * received vs COD still out, and Profit per channel, courier, city, product
 * and order. Read only; the math stays on the server (order-costs, ads).
 */

import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Card, ChipGroup, ErrorState, HeroAmount, HeroText, ListRow, Screen, SkeletonRows, Switch, Tabs, Text, useTheme } from '@/design';
import { commerceApi, type ProfitStatement } from '../api/board';
import { CommerceHero } from '../components/CommerceHero';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { Note } from '../components/bits';
import { KEYS } from '../lib/online';
import { PERIOD_LABEL, periodOptions, periodRange, type PeriodPreset } from '../lib/period';

type Tab = 'channel' | 'courier' | 'city' | 'product' | 'orders';
const pct = (n: number | null | undefined) => (n == null ? '—' : `${Math.round(n * 10) / 10}%`);

export function ProfitScreen() {
  const th = useTheme();
  const [period, setPeriod] = useState<PeriodPreset>('month');
  const [withExpenses, setWithExpenses] = useState(true);
  const [tab, setTab] = useState<Tab>('channel');
  const range = periodRange(period) ?? undefined;
  const q = useQuery({
    queryKey: [...KEYS.profit, 'statement', range?.from, range?.to, withExpenses],
    queryFn: () => commerceApi.profit({ ...range, expenses: withExpenses ? '1' : '0' }), staleTime: 60_000,
  });
  const p = q.data;
  const w = p?.waterfall;

  return (
    <Screen title={t('Online profit')} onRefresh={q.refetch} refreshing={q.isRefetching} actions={<OnlineMenuButton current="/online/profit" />}>
      <CommerceHero chip={t(PERIOD_LABEL[period])} loading={q.isLoading}
        stats={[
          { label: t('Net Profit'), value: <HeroAmount value={w?.net ?? 0} size="2xl" /> },
          { label: t('Sale'), value: <HeroAmount value={w?.sales ?? 0} size="lg" /> },
          { label: t('Margin'), value: <HeroText weight="bold" size="lg" ltr>{pct(w?.margin)}</HeroText> },
          { label: t('Cash mila'), value: <HeroAmount value={p?.cash.received ?? 0} size="lg" /> },
        ]} />
      <ChipGroup value={period} onChange={(v) => setPeriod(v as PeriodPreset)} options={periodOptions(['today', 'week', 'month', 'thisMonth', 'quarter']).map((o) => ({ ...o, label: t(o.label) }))} />
      <Switch value={withExpenses} onChange={setWithExpenses} label={t('Doosre Expenses bhi ghatayein')} description={t('Kiraya, tankhwah waghera jo is muddat me likhe')} />
      {q.isLoading ? <SkeletonRows count={5} /> : q.isError || !p ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <>
          {p.missingRates.length > 0 && (
            <Note tone="warning" action={<Text size="sm" weight="semibold" tone="brand" onPress={() => router.push('/online/costs' as never)}>{t('Rate card bharein')}</Text>}>
              {t('{{names}} ka rate card nahi — courier kharcha andaze se hai', { names: p.missingRates.map((m) => m.name).join(', ') })}
            </Note>
          )}
          <Card title={t('Hisaab')}>
            <View style={{ gap: th.space(2) }}>
              <Line label={t('Sale')} value={w!.sales} />
              <Line label={t('Product Cost')} value={-w!.productCost} />
              <Line label={t('Ads')} value={-w!.ads} />
              <Line label={t('Courier aur COD fee')} value={-w!.courier} />
              <Line label={t('Returns (RTO)')} value={-w!.returns} />
              {p.withExpenses && <Line label={t('Doosre Expenses')} value={-w!.otherExpenses} />}
              <View style={{ height: 1, backgroundColor: th.colors.divider }} />
              <Line label={t('Net Profit')} value={w!.net} bold />
            </View>
          </Card>
          <Card title={t('Paisa kahan hai')}>
            <View style={{ gap: th.space(2) }}>
              <Line label={t('Cash mil gaya')} value={p.cash.received} />
              <Line label={t('COD abhi courier ke paas')} value={p.cash.codOutstanding} />
            </View>
          </Card>
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'channel', label: t('Channel') }, { value: 'courier', label: t('Courier') }, { value: 'city', label: t('Shehar') },
            { value: 'product', label: t('Product') }, { value: 'orders', label: t('Orders') },
          ]} />
          <Breakdown p={p} tab={tab} />
        </>
      )}
    </Screen>
  );
}

function Line({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text size="sm" weight={bold ? 'bold' : 'regular'} tone={bold ? 'default' : 'secondary'}>{label}</Text>
      <Text size="sm" weight={bold ? 'bold' : 'semibold'} tone={value < 0 ? 'danger' : bold ? 'success' : 'default'} ltr>{value < 0 ? `− ${formatMoney(-value)}` : formatMoney(value)}</Text>
    </View>
  );
}

function Breakdown({ p, tab }: { p: ProfitStatement; tab: Tab }) {
  const rows: Array<{ key: string; title: string; sub: string; profit: number; onPress?: () => void }> =
    tab === 'channel' ? p.byChannel.map((r) => ({ key: r.id ?? r.name, title: r.name, sub: t('{{orders}} order · Sale {{sale}} · Ads {{ads}}', { orders: r.orders, sale: formatMoney(r.sale), ads: formatMoney(r.ads) }), profit: r.afterAds }))
      : tab === 'courier' ? p.byCourier.map((r) => ({ key: r.code, title: r.name, sub: t('{{orders}} order · Sale {{sale}}', { orders: r.orders, sale: formatMoney(r.sale) }), profit: r.profit ?? 0 }))
        : tab === 'city' ? p.byCity.map((r) => ({ key: r.city, title: r.city, sub: t('{{orders}} order · Sale {{sale}}', { orders: r.orders, sale: formatMoney(r.sale) }), profit: r.profit ?? 0 }))
          : tab === 'product' ? p.byProduct.map((r) => ({ key: r.name, title: r.name, sub: t('{{qty}} qty · Sale {{sale}}', { qty: r.qty, sale: formatMoney(r.sale) }), profit: r.profit ?? 0 }))
            : p.orders.slice(0, 100).map((r) => ({ key: r.id, title: `#${r.number} · ${r.channel}`, sub: [r.city, r.courier, r.status, r.estimated ? t('andaza') : ''].filter(Boolean).join(' · '), profit: r.profit, onPress: () => router.push(`/online/orders/${r.id}` as never) }));
  if (!rows.length) return <Text size="sm" tone="muted">{t('Is muddat me kuch nahi')}</Text>;
  return (
    <Card flush>
      {rows.slice(0, 60).map((r) => (
        <ListRow key={r.key} dense divider title={r.title} subtitle={r.sub} chevron={!!r.onPress} onPress={r.onPress}
          trailing={<Text size="sm" weight="bold" tone={r.profit < 0 ? 'danger' : 'success'} ltr>{formatMoney(r.profit)}</Text>} />
      ))}
    </Card>
  );
}
