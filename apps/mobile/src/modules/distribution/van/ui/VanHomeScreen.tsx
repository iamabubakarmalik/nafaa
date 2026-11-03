/**
 * The salesman's van: the open day with cash to hand in, the sales and
 * returns of the day, the stock on the van, and the two field actions (spot
 * sale, market return). The office loads the van and closes the day.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { PackageOpen, Receipt, ShoppingCart, Undo2 } from 'lucide-react-native';
import { View } from 'react-native';
import { formatTime } from '@/core/format';
import { t } from '@/core/i18n';
import { useCachedNotice } from '@/core/offline';
import { Amount, Button, Card, EmptyState, ErrorState, HeroAmount, ListRow, PageHero, Row, Screen, SkeletonRows, StatusPill, Text, useTheme } from '@/design';
import { phase2Api } from '@/modules/distribution/api/phase2.api';
import { RETURN_STATUS } from '../lib';

export const VAN_KEY = ['van', 'mine'] as const;

export function VanHomeScreen() {
  const th = useTheme();
  const q = useQuery({
    queryKey: VAN_KEY,
    queryFn: async () => {
      const { vans } = await phase2Api.myVans();
      return vans.length ? phase2Api.van(vans[0].id) : null;
    },
  });
  const van = q.data;
  const cached = useCachedNotice(q);
  const s = van?.session;

  return (
    <Screen
      title={van?.name ?? t('Van')}
      subtitle={van ? [van.vehicleNo, van.routeName].filter(Boolean).join(' · ') : undefined}
      onBack={() => router.replace('/(tabs)')}
      refreshing={q.isRefetching}
      onRefresh={q.refetch}
      footer={van ? (
        <Row gap={3}>
          <Button size="xl" icon={ShoppingCart} style={{ flex: 1 }} disabled={!s || !van.stock.length} onPress={() => router.push({ pathname: '/van/sell', params: { vanId: van.id } })}>{t('New sale')}</Button>
          <Button size="xl" variant="secondary" icon={Undo2} style={{ flex: 1 }} onPress={() => router.push({ pathname: '/van/return', params: { vanId: van.id } })}>{t('Return')}</Button>
        </Row>
      ) : undefined}
    >
      {q.isLoading && <SkeletonRows count={4} />}
      {q.error && !van && <ErrorState error={q.error} onRetry={q.refetch} />}
      {q.data === null && <EmptyState icon={PackageOpen} title={t('Aap ko koi van nahi di gayi')} message={t('Office se van aur salesman set karwayein')} />}
      {cached.fromCache && cached.updatedAt && <Text size="xs" tone="muted">{t('Last updated {{time}}', { time: formatTime(cached.updatedAt) })}</Text>}
      {van && (
        <>
          <PageHero
            title={s ? t('Aaj ({{day}})', { day: s.dayKey }) : t('Din shuru nahi hua')}
            subtitle={s ? undefined : t('Office van load karega to din shuru ho jayega.')}
            stats={s ? [
              { label: t('Invoices'), value: <Text size="2xl" weight="bold" tone="onBrand" ltr>{String(s.money.invoices)}</Text> },
              { label: t('Sale'), value: <HeroAmount value={s.money.salesValue} size="xl" /> },
              { label: t('Cash paas hona chahiye'), value: <HeroAmount value={s.money.expectedCash} size="xl" /> },
            ] : undefined}
          />
          {s && (
            <Card title={t('Din ka hisaab')} flush>
              <Line label={t('Cash paas hona chahiye')} value={s.money.expectedCash} strong />
              <Line label={t('Udhaar diya')} value={s.money.creditGiven} />
              {s.money.otherMoney > 0 && <Line label={t('Bank / cheque / wallet')} value={s.money.otherMoney} />}
              {s.money.recoveries > 0 && <Line label={t('Recovery')} value={s.money.recoveries} />}
              {s.money.pending > 0 && <Line label={t('Verify baqi')} value={s.money.pending} last />}
              <Text size="xs" tone="muted" style={{ padding: th.space(3.5) }}>{t('Din ke aakhir me office van ka maal gin kar cash le lega.')}</Text>
            </Card>
          )}
          {!!s?.invoices.length && (
            <Card title={t('Aaj ke invoices')} flush>
              {s.invoices.map((i, k) => (
                <ListRow key={i.id} icon={Receipt} title={i.customerName ?? '—'} subtitle={`${i.saleNumber ?? i.orderNumber} · ${formatTime(i.bookedAt)}`} divider={k < s.invoices.length - 1}
                  trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={i.total} size="sm" weight="semibold" />{i.cashCollected > 0 && <Amount value={i.cashCollected} size="xs" tone="success" />}</View>} />
              ))}
            </Card>
          )}
          {!!s?.returns.length && (
            <Card title={t('Aaj ki returns')} flush>
              {s.returns.map((r, k) => (
                <ListRow key={r.id} icon={Undo2} title={r.customerName ?? '—'} subtitle={r.number} divider={k < s.returns.length - 1}
                  trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}><Amount value={r.totalValue} size="sm" /><StatusPill tone={RETURN_STATUS[r.status]?.tone ?? 'neutral'}>{t(RETURN_STATUS[r.status]?.label ?? r.status)}</StatusPill></View>} />
              ))}
            </Card>
          )}
          <Card title={`${t('Van par maal')} (${van.stock.length})`} flush>
            {!van.stock.length && <Text size="sm" tone="muted" style={{ padding: th.space(3.5) }}>{t('Van khaali hai')}</Text>}
            {van.stock.map((x, i) => (
              <ListRow key={`${x.productId}:${x.variantId ?? ''}`} title={[x.name, x.variantName].filter(Boolean).join(' · ')} subtitle={x.text} divider={i < van.stock.length - 1} trailing={<Amount value={x.value} size="sm" tone="muted" />} />
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

function Line({ label, value, strong, last }: { label: string; value: number; strong?: boolean; last?: boolean }) {
  const th = useTheme();
  return (
    <Row justify="between" style={{ paddingHorizontal: th.space(3.5), paddingVertical: th.space(2.5), borderBottomWidth: last ? 0 : 1, borderBottomColor: th.colors.border }}>
      <Text size="sm" tone={strong ? 'default' : 'muted'} weight={strong ? 'semibold' : 'regular'}>{label}</Text>
      <Amount value={value} weight={strong ? 'bold' : 'semibold'} />
    </Row>
  );
}
