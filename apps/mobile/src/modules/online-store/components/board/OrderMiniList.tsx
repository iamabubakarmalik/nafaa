/**
 * A short list of board orders under a scan desk (Pending RTO, Received
 * today, Ready to pack, Packed not sent): number, customer, city, CN and
 * money, with a tap to open the order.
 */

import { View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { orderNo } from '@nafaa/core/online-store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Card, ListRow, SkeletonRows, Text, useTheme } from '@/design';
import { boardApi, type BoardQuery } from '../../api/board';
import { KEYS } from '../../lib/online';
import { CourierLogo } from '../BrandLogo';

export function useBoardSlice(key: string, q: BoardQuery, limit = 30) {
  return useQuery({ queryKey: [...KEYS.orders, 'slice', key, q], queryFn: () => boardApi.list({ ...q, limit }), refetchInterval: 30_000 });
}

export function OrderMiniList({ title, board, query, empty, max = 8 }: {
  title: string; board: string; query: ReturnType<typeof useBoardSlice>; empty: string; max?: number;
}) {
  const th = useTheme();
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  return (
    <Card flush title={`${title} (${total})`}>
      {query.isLoading ? <SkeletonRows count={2} /> : !items.length ? (
        <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{empty}</Text>
      ) : (
        <View>
          {items.slice(0, max).map((o) => (
            <ListRow key={o.id} dense divider leading={o.courierCode ? <CourierLogo code={o.courierCode} size={24} /> : undefined}
              title={`#${orderNo(o)} · ${o.customerName}`}
              subtitle={[o.customerCity, o.trackingNumber, formatMoney(o.total)].filter(Boolean).join(' · ')}
              chevron onPress={() => router.push(`/online/orders/${o.id}` as never)} />
          ))}
          {total > max && <Text size="xs" tone="brand" weight="semibold" style={{ padding: th.space(3), textAlign: 'center' }}
            onPress={() => router.push(`/online/orders?board=${board}` as never)}>{t('+{{count}} aur — board par dekhein', { count: total - max })}</Text>}
        </View>
      )}
    </Card>
  );
}
