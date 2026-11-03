/** Orders sent to network suppliers, with their state (it changes by itself as the supplier works on it). */

import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { PackageCheck, ShoppingCart } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Amount, Button, EmptyState, IconButton, ListRow, ListTemplate, Row, Text } from '@/design';
import { dayTime } from '@/modules/distribution/lib/meta';
import { TRADE_KEY, tradeApi, type TradeOrderRow } from '../api/trade.api';
import { ORDER_STATUS, RECEIVE_STATE } from '../lib/meta';
import { BizAvatar, CachedLine, Pill } from '../components/shared';

type Tab = 'OPEN' | 'DONE' | 'ALL';
const TAB_STATUS: Record<Tab, string | undefined> = { OPEN: 'BOOKED,APPROVED,INVOICED,LOADED', DONE: 'DELIVERED,PARTIAL,RETURNED,CANCELLED', ALL: undefined };

export function MyOrdersScreen() {
  const [tab, setTab] = useState<Tab>('OPEN');
  const q = useInfiniteQuery({
    queryKey: [TRADE_KEY, 'orders', tab],
    queryFn: ({ pageParam }) => tradeApi.orders({ status: TAB_STATUS[tab], page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
    refetchInterval: 60_000,
  });
  const rows = useMemo(() => q.data?.pages.flatMap((p) => p.orders) ?? [], [q.data]);
  const c = q.data?.pages[0]?.counts ?? {};
  const open = ['BOOKED', 'APPROVED', 'INVOICED', 'LOADED'].reduce((s, k) => s + (c[k] ?? 0), 0);

  return (
    <ListTemplate<TradeOrderRow>
      title={t('Supplier orders')}
      subtitle={t('Har Order ki halat supplier ki taraf se khud badalti hai')}
      actions={<IconButton icon={PackageCheck} label={t('Receive goods')} onPress={() => router.push('/network/receiving')} />}
      filters={{ value: tab, onChange: (v) => setTab(v as Tab), options: [{ value: 'OPEN', label: t('Open'), count: open }, { value: 'DONE', label: t('Done') }, { value: 'ALL', label: t('All') }] }}
      summary={<CachedLine query={q} />}
      data={rows}
      loading={q.isLoading}
      error={q.data ? null : q.error}
      onRetry={q.refetch}
      refreshing={q.isRefetching}
      onRefresh={q.refetch}
      onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage(); }}
      keyExtractor={(o) => o.id}
      renderItem={({ item: o }) => (
        <ListRow
          leading={<BizAvatar card={o.seller} size={36} />}
          title={`${o.seller?.name ?? t('Supplier')}${o.orderNumber ? ` · ${o.orderNumber}` : ''}`}
          subtitle={(
            <View style={{ gap: 4 }}>
              <Row gap={1.5} wrap>
                <Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill>
                {['DRAFT', 'NEEDS_MAP'].includes(o.receiveState) && <Pill tone={RECEIVE_STATE[o.receiveState].tone}>{RECEIVE_STATE[o.receiveState].label}</Pill>}
                {o.receiveState === 'RECEIVED' && <Pill tone="green">{t('Stock me')}</Pill>}
              </Row>
              <Text size="xs" tone="muted">{`${dayTime(o.createdAt)} · ${o.itemCount} ${o.itemCount === 1 ? 'item' : 'items'}`}</Text>
            </View>
          )}
          trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={o.deliveredValue ?? o.invoiceTotal ?? o.total} weight="semibold" />{!!o.invoiceNumber && <Text size="2xs" tone="muted" ltr>{o.invoiceNumber}</Text>}</View>}
          chevron
          divider
          onPress={() => router.push(`/network/orders/${o.id}`)}
        />
      )}
      empty={<EmptyState icon={ShoppingCart} title={tab === 'OPEN' ? t('Koi chalta Order nahi.') : t('Is tab me koi Order nahi.')} action={<Button variant="secondary" onPress={() => router.push('/network')}>{t('Suppliers')}</Button>} />}
    />
  );
}
