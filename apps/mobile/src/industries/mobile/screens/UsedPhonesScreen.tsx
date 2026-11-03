/** Used phones (web UsedPhonesPage): bought, exchanged or consigned phones with their cost, resale price and shelf age. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Plus, Recycle, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, StatTile, Text, useDebouncedValue, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote } from '../../_shared/deskKit';
import { usedPhonesApi, type UsedPhone, type UsedPhoneListParams, type UsedPhoneStatus } from '../api';
import { MetaPill, useShopId } from '../components/kit';
import { USED_KEY, USED_STATUSES, conditionOf, metaText, sourceOf, usedStatusOf } from '../meta';

type Pick = UsedPhoneStatus | 'all';

export function UsedPhonesScreen() {
  const th = useTheme();
  const shopId = useShopId();
  const canManage = usePermission()(P.MOBILE_IMEI_MANAGE);
  const { cost } = useCostMask();
  const [status, setStatus] = useState<Pick>('all');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const params: UsedPhoneListParams = { shopId: shopId ?? undefined, page: 1, limit: 100, sort: 'new', search: query || undefined, status: status === 'all' ? undefined : status };
  const list = useQuery({ queryKey: [USED_KEY, 'page', params], queryFn: () => usedPhonesApi.list(params), placeholderData: (p) => p });
  const stats = useQuery({ queryKey: ['used-phones-stats'], queryFn: () => usedPhonesApi.stats(), refetchInterval: 60_000 });
  const s = stats.data;
  const counts = list.data?.counts ?? {};

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Recycle} tone="success" label={t('Stock me')} loading={stats.isLoading} value={String(s?.byStatus?.find((b) => b.status === 'IN_STOCK')?.count ?? 0)} />
        <StatTile style={{ flex: 1 }} icon={Wallet} tone="info" label={t('Cost')} loading={stats.isLoading} value={cost(s?.inStockCost ?? 0)} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} label={t('Bechne ki qeemat')} loading={stats.isLoading} value={cost(s?.inStockResaleValue ?? 0)} />
        <StatTile style={{ flex: 1 }} tone="success" label={t('Mumkin profit')} loading={stats.isLoading} value={cost(s?.potentialProfit ?? 0)} />
      </Row>
      <ChipGroup value={status} onChange={setStatus} options={[{ value: 'all', label: t('Sab') }, ...USED_STATUSES.map((st) => ({ value: st, label: `${t(usedStatusOf(st).label)}${counts[st] != null ? ` ${counts[st]}` : ''}` }))]} />
      <OfflineNote feature="mobileDesk" />
      <CachedNote query={list} />
    </View>
  );

  return (
    <ListTemplate<UsedPhone>
      title={t('Used phones')}
      grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('IMEI, model, code ya seller…') }}
      summary={header}
      data={list.data?.items ?? []}
      loading={list.isLoading}
      error={list.data ? null : list.error}
      onRetry={() => void list.refetch()}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      keyExtractor={(p) => p.id}
      renderItem={({ item: p }) => (
        <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
          <ListRow icon={Recycle} iconTone={usedStatusOf(p.status).tone}
            title={<Text weight="semibold" numberOfLines={1}>{p.brand} {p.model}{p.storage ? ` ${p.storage}` : ''}</Text>}
            subtitle={<View style={{ gap: 2 }}>
              <Text size="xs" tone="muted" ltr numberOfLines={1}>{p.usedPhoneCode} · {p.imei1}</Text>
              <Row gap={1} wrap><MetaPill m={usedStatusOf(p.status)} /><Badge tone={conditionOf(p.condition).tone}>{metaText(conditionOf(p.condition))}</Badge><Badge tone="neutral">{metaText(sourceOf(p.source))}</Badge></Row>
            </View>}
            trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={p.resalePrice} size="sm" weight="semibold" /><Text size="2xs" tone="muted" ltr>{cost(p.totalCost)}</Text></View>}
            onPress={() => router.push(`/mobile/used-phones/${p.id}` as never)} />
        </View>
      )}
      empty={<EmptyState icon={Recycle} title={t('Abhi koi used phone nahi')} message={t('Phone khareedne ke liye + dabayein.')} />}
      fab={canManage ? { icon: Plus, label: t('Used phone lein'), onPress: () => router.push('/mobile/used-phones/new' as never) } : undefined}
    />
  );
}
