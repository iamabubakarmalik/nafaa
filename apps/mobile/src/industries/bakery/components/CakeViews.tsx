/**
 * Cake order pieces: one row in a list (swipe for the next step, money,
 * WhatsApp), the week ahead by day, and analytics for a period.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ban, Cake, ChefHat, Layers, MessageCircle, Receipt, Star, Wallet } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { cakeNext, dueOf, hoursTo, isClosedOrder } from '@nafaa/core/bakery';
import { businessDayKey, formatMoney, formatWeekdayDate } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Badge, BarChart, Card, DonutChart, EmptyState, HBarList, ListRow, Row, Skeleton, StatTile, SwipeRow, Text, useTheme, type SwipeAction } from '@/design';
import { shortKey, type Period } from '@/modules/sales/lib/period';
import { cakeOrdersApi, type CakeOrder } from '../api';
import { CAKE_KEY, cakeLine, deliveryOf, flavorLabel, leftText, occasionOf, sizeLabel, statusOf, stepLabel, timeOnly } from '../meta';

export function CakeOrderRow({ o, canManage, onNext, onPay, onCancel, onWhatsApp }: {
  o: CakeOrder; canManage: boolean; onNext: () => void; onPay: () => void; onCancel: () => void; onWhatsApp: () => void;
}) {
  const st = statusOf(o.status);
  const closed = isClosedOrder(o.status);
  const left = hoursTo(o.neededBy);
  const late = !closed && left !== null && left < 0;
  const due = dueOf(o);
  const next = cakeNext(o);
  const start: SwipeAction[] = canManage && next ? [{ icon: next.to === 'DELIVER' ? Receipt : ChefHat, label: stepLabel(next.step), tone: 'success', onPress: onNext }] : [];
  const end: SwipeAction[] = [
    { icon: MessageCircle, label: t('WhatsApp'), tone: 'success', onPress: onWhatsApp },
    ...(canManage && !closed && due > 0.5 ? [{ icon: Wallet, label: t('Paisa mila'), tone: 'brand' as const, onPress: onPay }] : []),
    ...(canManage && !closed ? [{ icon: Ban, label: t('Cancel'), tone: 'danger' as const, onPress: onCancel }] : []),
  ];
  return (
    <SwipeRow start={start} end={end}>
      <ListRow
        leading={<Text size="xl">{occasionOf(o.occasion).emoji}</Text>}
        title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{o.customerName}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
        subtitle={<View style={{ gap: 2 }}>
          <Text size="sm" tone="muted" numberOfLines={1}>{cakeLine(o)}</Text>
          <Row gap={1.5} wrap>
            <Text size="xs" tone="muted" ltr>{o.orderNumber}</Text>
            {!closed && <Badge tone={late ? 'danger' : left !== null && left < 24 ? 'warning' : 'neutral'}>{leftText(left)}</Badge>}
            <Text size="xs" tone="muted">{t(deliveryOf(o.deliveryType).label)}</Text>
          </Row>
        </View>}
        trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Amount value={o.total} weight="bold" />
          {!closed && due > 0.5 ? <Text size="2xs" tone="warning">{t('Baqi')} <Amount value={due} size="2xs" tone="warning" /></Text> : null}
        </View>}
        onPress={() => router.push(`/bakery/cake-orders/${o.id}` as never)}
      />
    </SwipeRow>
  );
}

/** The next seven business days: every cake due that day by time. */
export function CakeWeek({ startHour }: { startHour: number }) {
  const th = useTheme();
  const keys = useMemo(() => Array.from({ length: 7 }, (_, i) => businessDayKey(Date.now() + i * 86_400_000, startHour)), [startHour]);
  const q = useQuery({ queryKey: [CAKE_KEY, 'week', keys[0]], queryFn: () => cakeOrdersApi.calendar(keys[0], keys[6]), refetchInterval: 120_000 });
  if (!q.data) return <View style={{ gap: th.space(2) }}>{keys.map((k) => <Skeleton key={k} height={72} />)}</View>;
  const byDay = new Map<string, CakeOrder[]>();
  for (const o of q.data) {
    const k = businessDayKey(o.neededBy, startHour);
    byDay.set(k, [...(byDay.get(k) ?? []), o]);
  }
  return (
    <View style={{ gap: th.space(3) }}>
      {keys.map((k, i) => {
        const list = (byDay.get(k) ?? []).filter((o) => o.status !== 'DELIVERED');
        const value = list.reduce((s, o) => s + Number(o.total || 0), 0);
        const title = i === 0 ? t('Aaj') : i === 1 ? t('Kal') : formatWeekdayDate(`${k}T12:00:00+05:00`);
        return (
          <Card key={k} flush tone={i === 0 ? 'brand' : 'default'}
            title={title} description={t('{{value}} · {{count}} cake{{value2}}', { value: shortKey(k), count: list.length, value2: list.length ? ` · ${formatMoney(value)}` : '' })}>
            {list.length === 0 ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Koi order nahi')}</Text> : list.map((o, n) => {
              const st = statusOf(o.status);
              return (
                <ListRow key={o.id} dense divider={n < list.length - 1} title={o.customerName} subtitle={`${sizeLabel(o.size)} · ${flavorLabel(o.flavor)}`}
                  leading={<Text size="sm" weight="bold" ltr style={{ minWidth: 64 }}>{timeOnly(o.neededBy)}</Text>}
                  trailing={<Badge tone={st.tone} dot>{t(st.label)}</Badge>} onPress={() => router.push(`/bakery/cake-orders/${o.id}` as never)} />
              );
            })}
          </Card>
        );
      })}
    </View>
  );
}

const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`;

export function CakeAnalytics({ period, sales }: { period: Period; sales: (n: number) => string }) {
  const th = useTheme();
  const range = period.from === 'all' ? { to: period.to } : period;
  const q = useQuery({ queryKey: [CAKE_KEY, 'summary', range], queryFn: () => cakeOrdersApi.summary(range), placeholderData: (p) => p });
  const d = q.data;
  if (!d) return <View style={{ gap: th.space(2) }}><Skeleton height={90} /><Skeleton height={180} /></View>;
  const x = d.totals;
  if (!x.orders) return <EmptyState icon={Cake} title={t('Is period me koi order nahi')} />;
  const hours = d.byHour.filter((h) => h.count > 0 || (h.hour >= 8 && h.hour <= 23));
  const bars = (rows: Array<{ key: string; count: number; value: number }>, label: (k: string) => string) =>
    rows.slice(0, 8).map((b) => ({ key: b.key, label: label(b.key), value: b.count, display: <Text size="xs" tone="muted">{`${b.count} · ${sales(b.value)}`}</Text> }));
  return (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Cake} label={t('Orders')} value={String(x.orders)} hint={t('{{delivered}} de diye · {{deliveredValue}}', { delivered: x.delivered, deliveredValue: sales(x.deliveredValue) })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Wallet} tone="success" label={t('Kul rakam')} value={sales(x.value)} hint={t('Advance / mila {{collected}}', { collected: sales(x.collected) })} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Layers} tone="accent" label={t('Ausat order')} value={sales(x.avgOrder)} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={x.avgRating ? Star : Ban} tone={x.avgRating ? 'warning' : 'danger'} label={x.avgRating ? t('Customer ki raye') : t('Cancel')}
          value={x.avgRating ? `${x.avgRating} / 5` : String(x.cancelled)} />
      </Row>
      <Card title={d.period.grouping === 'month' ? t('Har mahine ke orders') : t('Har din ke orders')} description={t('Jis din cake dena tha, us din ke hisaab se')}>
        <BarChart labels={d.byDay.map((b) => shortKey(b.key.length === 7 ? `${b.key}-15` : b.key))} series={[{ key: 'c', label: t('Orders'), values: d.byDay.map((b) => b.count) }]} />
      </Card>
      <Card title={t('Kis waqt dena hota hai')} description={t('Is se pata chalta hai kab staff aur oven tayyar hon')}>
        <BarChart labels={hours.map((h) => hourLabel(h.hour))} series={[{ key: 'h', label: t('Orders'), values: hours.map((h) => h.count) }]} maxLabels={8} />
      </Card>
      <Card title={t('Orders ki halat')}>
        <DonutChart slices={d.byStatus.map((b) => ({ key: b.key, label: t(statusOf(b.key).label), value: b.count, color: statusOf(b.key).color }))} />
      </Card>
      <Card title={t('Mauqe')}><HBarList rows={bars(d.byOccasion, (k) => `${occasionOf(k).emoji} ${t(occasionOf(k).label)}`)} /></Card>
      <Card title={t('Flavour')}><HBarList rows={bars(d.byFlavor, flavorLabel)} /></Card>
      <Card title={t('Size')}><HBarList rows={bars(d.bySize, sizeLabel)} /></Card>
      <Card title={t('Kaise dena')}><HBarList rows={bars(d.byDelivery, (k) => t(deliveryOf(k).label))} /></Card>
    </View>
  );
}
