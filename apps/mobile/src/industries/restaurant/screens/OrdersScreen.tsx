/**
 * Restaurant orders (web RestaurantOrdersPage + DayClosePanel): every order
 * by status, type, date and sort with search, the totals for the filter,
 * and the day close — net sale, money in, credit, breakdown by order type,
 * waiter and table, open orders, voided dishes, cancels and rider cash.
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, ArrowDownWideNarrow, BarChart3, Bike, CheckCircle2, ListChecks, Plus, SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { minutesSince, type OrderMode } from '@nafaa/core/restaurant';
import { formatMoney, formatTime } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Badge, Card, ChipGroup, DetailRow, DetailSection, EmptyState, HBarList, IconButton, ListRow, ListTemplate, Row, Segmented, Sheet, StatTile, StatusPill, Text, useDebouncedValue, useTheme,
} from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { ordersApi, type DayClose, type OrderPageQuery, type RestaurantOrder } from '../api';
import { MODE_META, ORDERS_KEY, STATUS_META, duration, orderTitle } from '../meta';
import { ORDER_MODES } from '@nafaa/core/restaurant';

type Bucket = 'all' | 'open' | 'completed' | 'cancelled';
type Sort = 'new' | 'old' | 'high' | 'low';
const BUCKETS: Array<{ value: Bucket; label: string }> = [
  { value: 'all', label: msg('Sab orders') }, { value: 'open', label: msg('Khule') }, { value: 'completed', label: msg('Paid') }, { value: 'cancelled', label: msg('Cancel') },
];
const SORTS: Array<{ value: Sort; label: string }> = [
  { value: 'new', label: msg('Naye pehle') }, { value: 'old', label: msg('Purane pehle') }, { value: 'high', label: msg('Bari amount pehle') }, { value: 'low', label: msg('Chhoti amount pehle') },
];

export function OrdersScreen() {
  const th = useTheme();
  const can = usePermission();
  const [tab, setTab] = useState<'orders' | 'close'>('orders');
  const [bucket, setBucket] = useState<Bucket>('all');
  const [mode, setMode] = useState<'all' | OrderMode>('all');
  const [sort, setSort] = useState<Sort>('new');
  const [filters, setFilters] = useState(false);
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const per = usePeriod('today');

  const params: OrderPageQuery = {
    search: query || undefined, status: bucket, mode: mode === 'all' ? undefined : mode, sort,
    ...(per.period.from !== 'all' ? { from: per.period.from, to: per.period.to } : {}),
  };
  const list = useInfiniteQuery({
    queryKey: [ORDERS_KEY, params],
    queryFn: ({ pageParam }) => ordersApi.page({ ...params, page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.page * l.limit < l.total ? l.page + 1 : undefined),
    placeholderData: (p) => p,
    refetchInterval: 30_000,
    enabled: tab === 'orders',
  });
  const close = useQuery({ queryKey: ['restaurant-day-close'], queryFn: () => ordersApi.dayClose(), enabled: tab === 'close', refetchInterval: 60_000 });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const st = list.data?.pages[0]?.stats;
  const filtered = mode !== 'all' || per.preset !== 'today' || sort !== 'new';

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'orders', label: t('Orders'), icon: ListChecks }, { value: 'close', label: t('Din band'), icon: BarChart3 }]} />
      {tab === 'orders' && (
        <>
          <Row gap={2}>
            <StatTile style={{ flex: 1 }} icon={CheckCircle2} tone="success" loading={!st} label={t('Paid · {{completed}} bill', { completed: st?.completed ?? 0 })} value={<Amount value={st?.completedAmount ?? 0} size="lg" weight="bold" />}
              hint={st?.voidedBills ? t('{{voidedBills}} bill void', { voidedBills: st.voidedBills }) : undefined} onPress={() => setBucket('completed')} />
            <StatTile style={{ flex: 1 }} icon={ListChecks} tone="warning" loading={!st} label={t('Khule orders')} value={String(st?.open ?? 0)} hint={<Amount value={st?.openAmount ?? 0} size="xs" tone="muted" />} onPress={() => setBucket('open')} />
          </Row>
          <Row gap={2}>
            <StatTile style={{ flex: 1 }} tone="info" loading={!st} label={t('Ausat bill')} value={<Amount value={st?.averageBill ?? 0} size="lg" weight="bold" />} />
            <StatTile style={{ flex: 1 }} tone="danger" loading={!st} label={t('Cancel')} value={String(st?.cancelled ?? 0)} hint={st?.cancelledAmount ? formatMoney(st.cancelledAmount) : undefined} onPress={() => setBucket('cancelled')} />
          </Row>
          <ChipGroup value={bucket} onChange={setBucket} style={{ marginHorizontal: -th.space(4) }} options={BUCKETS.map((b) => ({ value: b.value, label: t(b.label) }))} />
          <ChipGroup value={per.preset} onChange={(v) => per.setPreset(v)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.filter((p) => p.value !== 'custom').map((p) => ({ value: p.value, label: t(p.label) }))} />
          <CachedNote query={list} />
        </>
      )}
      {tab === 'close' && <DayClosePanel d={close.data} loading={close.isLoading} />}
    </View>
  );

  return (
    <>
      <ListTemplate<RestaurantOrder>
        title={t('Orders')}
        grouped={false}
        actions={tab === 'orders' ? <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={filtered ? 1 : undefined} onPress={() => setFilters(true)} /> : undefined}
        search={tab === 'orders' ? { value: search, onChange: setSearch, placeholder: t('Order #, table, naam ya phone') } : undefined}
        summary={header}
        data={tab === 'orders' ? rows : []}
        loading={tab === 'orders' && list.isLoading}
        error={tab === 'orders' && !list.data ? list.error : undefined}
        onRetry={() => void list.refetch()}
        refreshing={tab === 'orders' ? list.isRefetching && !list.isFetchingNextPage : close.isRefetching}
        onRefresh={() => void (tab === 'orders' ? list.refetch() : close.refetch())}
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(o) => o.id}
        renderItem={({ item: o }) => {
          const m = MODE_META[o.mode];
          const s = STATUS_META[o.status];
          return (
            <ListRow icon={m.icon} iconTone={m.tone} title={orderTitle(o)}
              subtitle={`${o.orderNumber} · ${t(m.label)} · ${formatTime(o.createdAt)}`}
              trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}><Amount value={o.total} weight="bold" /><StatusPill tone={s.tone}>{t(s.label)}</StatusPill></View>}
              onPress={() => router.push(`/restaurant/orders/${o.id}` as never)} />
          );
        }}
        empty={tab === 'orders' ? <EmptyState icon={ListChecks} title={query || filtered || bucket !== 'all' ? t('Is filter me koi order nahi') : t('Aaj abhi koi order nahi')} /> : undefined}
        fab={can(P.RESTAURANT_ORDERS_MANAGE) ? { icon: Plus, label: t('Naya order'), onPress: () => router.push('/restaurant/orders/new' as never) } : undefined}
      />
      <Sheet open={filters} onClose={() => setFilters(false)} title={t('Filters')}>
        <View style={{ gap: th.space(3) }}>
          <Text size="sm" weight="semibold" tone="secondary">{t('Type')}</Text>
          <ChipGroup wrap value={mode} onChange={setMode} options={[{ value: 'all', label: t('Har type') }, ...ORDER_MODES.map((m) => ({ value: m, label: t(MODE_META[m].label), icon: MODE_META[m].icon }))]} />
          <Text size="sm" weight="semibold" tone="secondary">{t('Sort')}</Text>
          <View>{SORTS.map((x) => <ListRow key={x.value} icon={ArrowDownWideNarrow} title={t(x.label)} selected={sort === x.value} onPress={() => setSort(x.value)} />)}</View>
          {filtered && <ListRow title={t('Filter saaf karein')} destructive onPress={() => { setMode('all'); per.setPreset('today'); setSort('new'); }} />}
        </View>
      </Sheet>
    </>
  );
}

const modeLabel = (k: string) => (k === 'COUNTER' ? t('Counter (bina order)') : MODE_META[k as OrderMode] ? t(MODE_META[k as OrderMode].label) : k);

function DayClosePanel({ d, loading }: { d?: DayClose; loading: boolean }) {
  const th = useTheme();
  if (loading || !d) return <Card><Text tone="muted">{t('Loading…')}</Text></Card>;
  const bars = (rows: Array<{ key: string; label: string; bills: number; amount: number }>, label: (r: { key: string; label: string }) => string) =>
    rows.map((r) => ({ key: r.key, label: label(r), value: r.amount, display: formatMoney(r.amount), hint: t('· {{bills}} bill', { bills: r.bills }) }));
  return (
    <View style={{ gap: th.space(4) }}>
      <DetailSection title={t('Din band — restaurant')}>
        <DetailRow label={t('Net sale (day book)')} value={<Amount value={d.figures.net} size="lg" weight="bold" />} />
        <DetailRow label={t('Bill')} value={String(d.figures.bills)} />
        <DetailRow label={t('Mila')} value={<Amount value={d.figures.cashIn} />} />
        <DetailRow label={t('Udhaar')} value={<Amount value={d.figures.credit} />} />
        <DetailRow label={t('Discount')} value={<Amount value={d.figures.discount} />} />
        <DetailRow label={t('Service / tax / delivery')} value={<Amount value={d.figures.service} />} />
        {d.tips > 0 && <DetailRow label={t('Tip')} value={<Amount value={d.tips} />} />}
        <DetailRow label={t('Return')} value={<Amount value={d.figures.refunds} />} last />
      </DetailSection>
      {Math.abs(d.groupedTotal - d.figures.net) > 1 && (
        <Card tone="warning"><Text size="sm">{t('Neeche ka jor ({{groupedTotal}}) day book ({{net}}) se nahi milta — support ko batayein.', { groupedTotal: formatMoney(d.groupedTotal), net: formatMoney(d.figures.net) })}</Text></Card>
      )}
      {d.openOrders.length > 0 ? (
        <DetailSection title={t('{{count}} order abhi khule hain · {{openAmount}} — din band karne se pehle payment lein ya cancel karein', { count: d.openOrders.length, openAmount: formatMoney(d.openAmount) })}>
          {d.openOrders.map((o) => (
            <ListRow key={o.id} icon={AlertTriangle} iconTone="warning" title={`${o.table ? t('Table {{tableNumber}}', { tableNumber: o.table.tableNumber }) : o.customerName || modeLabel(o.mode)} · ${o.orderNumber}`}
              subtitle={`${t(STATUS_META[o.status].label)} · ${duration(minutesSince(o.createdAt))}`} trailing={<Amount value={o.due} weight="bold" />} chevron
              onPress={() => router.push(`/restaurant/orders/${o.id}` as never)} />
          ))}
        </DetailSection>
      ) : (
        <Card tone="success"><Text size="sm">{t('Koi order khula nahi — din band ho sakta hai')}</Text></Card>
      )}
      {d.riderCash.length > 0 && (
        <DetailSection title={t('Riders ke paas cash')}>
          {d.riderCash.map((r) => <ListRow key={r.riderId} icon={Bike} title={t('{{name}} · {{orders}} order', { name: r.name, orders: r.orders })} trailing={<Amount value={r.amount} weight="bold" />} />)}
          <ListRow title={t('Cash wasool karein →')} chevron onPress={() => router.push('/restaurant/delivery' as never)} />
        </DetailSection>
      )}
      <Card title={t('Order type')}><HBarList rows={bars(d.byMode, (r) => modeLabel(r.key))} /></Card>
      {d.byWaiter.length > 0 && <Card title={t('Waiter')}><HBarList rows={bars(d.byWaiter, (r) => r.label)} /></Card>}
      <Card title={t('Table')}>{d.byTable.length ? <HBarList rows={bars(d.byTable, (r) => r.label)} /> : <Text size="sm" tone="muted">{t('Aaj kisi table ka bill nahi')}</Text>}</Card>
      {d.voids.count > 0 && (
        <DetailSection title={t('Void dishes · {{count}} · {{amount}}', { count: d.voids.count, amount: formatMoney(d.voids.amount) })}>
          {d.voids.items.map((v) => <ListRow key={v.id} title={`${v.quantity}× ${v.product?.name ?? ''}`} subtitle={`${v.order.orderNumber}${v.returnReason ? ` · ${v.returnReason}` : ''}`} trailing={<Amount value={v.total} />} />)}
        </DetailSection>
      )}
      {d.cancelled.count > 0 && (
        <DetailSection title={t('Cancel orders · {{count}} · {{amount}}', { count: d.cancelled.count, amount: formatMoney(d.cancelled.amount) })}>
          {d.cancelled.orders.map((o) => <ListRow key={o.id} title={o.orderNumber} subtitle={o.cancellationReason ?? undefined} trailing={<Badge tone="danger">{formatMoney(o.total)}</Badge>} />)}
        </DetailSection>
      )}
    </View>
  );
}
