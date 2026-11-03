/**
 * End of day: the server's summary for the booker (visits, strike rate,
 * orders, recoveries, targets, no-order reasons, shops not visited) after a
 * sync, and today's orders from the phone with their sync state.
 */

import { useRouter } from 'expo-router';
import { CloudOff, MapPinOff } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatMoney, formatNumber } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Card, DetailRow, DetailSection, DetailTemplate, HeroAmount, ListRow, PageHero, ProgressBar, Row, Text, useTheme } from '@/design';
import { bookerApi } from '../core/api';
import { dayOrders } from '../core/repo';
import type { DaySummary } from '../core/types';
import { http } from '../native/device';
import { useBookerStore, useDbQuery } from '../store';
import { QueueStatus, SyncAction } from '../ui/shared';

export function BookerSummaryScreen() {
  const th = useTheme();
  const router = useRouter();
  const { today, pending, sync } = useBookerStore();
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const { data: orders = [] } = useDbQuery((d) => dayOrders(d, today), [today]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (useBookerStore.getState().pending > 0) await sync({ quiet: true });
      setSummary(await bookerApi(http).summary(today));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [sync, today]);

  useEffect(() => { load(); }, [load]);

  const s = summary;
  return (
    <DetailTemplate
      title={t('Day summary')}
      subtitle={today}
      actions={<SyncAction />}
      loading={loading && !s}
      error={!s ? error : undefined}
      onRetry={load}
      refreshing={loading}
      onRefresh={load}
      summary={s ? (
        <PageHero
          title={t('Order value')}
          stats={[
            { label: t('Order value'), value: <HeroAmount value={s.orders.value} size="2xl" /> },
            { label: t('Visit'), value: `${s.visited}/${s.planned}` },
            { label: t('Orders'), value: String(s.orders.count) },
            { label: t('Strike rate'), value: `${Math.round(s.strikeRate)}%` },
          ]}
        />
      ) : undefined}
    >
      {pending > 0 && (
        <Card tone="warning">
          <Row gap={2}>
            <CloudOff size={16} color={th.colors.warning.text} />
            <Text size="sm" tone="warning" style={{ flex: 1 }}>{t('{{count}} entries abhi phone par hain. Sync hone ke baad hisaab poora hoga.', { count: pending })}</Text>
          </Row>
        </Card>
      )}

      {s && !!s.targets?.length && (
        <DetailSection title={t('Target (is mahine)')}>
          {s.targets.map((tg, i) => {
            const fmt = (n: number) => (tg.metric === 'VALUE' ? formatMoney(n) : `${formatNumber(Math.round(n * 10) / 10)} ${tg.unitName ?? 'pcs'}`);
            return (
              <View key={tg.id} style={{ padding: th.space(4), gap: th.space(2), borderBottomWidth: i === s.targets!.length - 1 ? 0 : 1, borderBottomColor: th.colors.divider }}>
                <Row justify="between">
                  <Text weight="semibold">{tg.label}</Text>
                  <Text weight="bold" ltr>{Math.round(tg.pct)}%</Text>
                </Row>
                <ProgressBar value={tg.pct / 100} tone={tg.onTrack ? 'success' : 'warning'} />
                <Text size="xs" tone="muted">{t('{{done}} / {{target}} · baqi {{left}} · roz {{daily}}', { done: fmt(tg.achieved), target: fmt(tg.target), left: fmt(tg.remaining), daily: fmt(tg.perDayNeeded) })}</Text>
              </View>
            );
          })}
        </DetailSection>
      )}

      {s && (
        <DetailSection title={t('Recovery')}>
          <DetailRow label={t('Kul recovery')} value={<Amount value={s.collections.amount} weight="bold" />} />
          <DetailRow label={t('Cash')} value={<Amount value={s.collections.cash} />} />
          <DetailRow label={t('Office check baqi')} value={<Amount value={s.collections.pending} />} last />
        </DetailSection>
      )}

      {s && s.noOrder.length > 0 && (
        <DetailSection title={t('Order nahi mila')}>
          {s.noOrder.map((n, i) => <DetailRow key={n.reason} label={t(n.label)} value={String(n.count)} last={i === s.noOrder.length - 1} />)}
        </DetailSection>
      )}

      {s && s.notVisited.length > 0 && (
        <DetailSection title={t('Visit nahi hua ({{count}})', { count: s.notVisited.length })}>
          {s.notVisited.map((c) => <ListRow key={c.id} icon={MapPinOff} iconTone="danger" title={c.name} chevron dense divider onPress={() => router.push(`/booker/customer/${c.id}`)} />)}
        </DetailSection>
      )}

      {orders.length > 0 && (
        <DetailSection title={t('Aaj ke orders (phone)')}>
          {orders.map((o) => (
            <ListRow
              key={o.clientRef}
              title={o.businessName || o.customerName}
              subtitle={`${o.number ?? t('Number sync ke baad')} · ${t('{{count}} lines', { count: o.lineCount })}`}
              trailing={(
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Amount value={o.serverTotal ?? o.localTotal} weight="bold" />
                  <QueueStatus status={o.status} />
                </View>
              )}
              divider
            />
          ))}
        </DetailSection>
      )}
    </DetailTemplate>
  );
}
