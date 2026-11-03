/** Delivery customers (web DairyCustomersPage): homes that get milk on a route, their daily litres and what they owe. */

import { router } from 'expo-router';
import { Milk, Plus, Users, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, Text, useTheme } from '@/design';
import { useQuery } from '@tanstack/react-query';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { RowCard, StatRow } from '../../_shared/farm/ui';
import { dairyCustomersApi, routesApi, type CustomerTab, type DairyCustomer } from '../api';
import { CUSTOMER_STATUS, DAIRY_KEYS, FREQUENCY, liters } from '../meta';

const LIMIT = 25;

export function DairyCustomersScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('dairyDesk');
  const { cost } = useCostMask();
  const [tab, setTab] = useState<CustomerTab>('active');
  const [route, setRoute] = useState('');
  const [search, setSearch] = useState('');
  const params = { tab, search: search.trim() || undefined, routeId: route || undefined, limit: LIMIT };
  const list = usePaged([DAIRY_KEYS.customers, 'page', params], (page) => dairyCustomersApi.page({ ...params, page }).then((r) => ({ ...r, pages: Math.max(Math.ceil(r.total / LIMIT), 1) })));
  const routesQ = useQuery({ queryKey: [DAIRY_KEYS.routes, 'active'], queryFn: () => routesApi.all({ active: true }), staleTime: 5 * 60_000 });
  const c = list.first?.counts;
  const tot = list.first?.totals;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <StatRow tiles={[
        { icon: Milk, tone: 'info', label: t('Roz ka doodh'), loading: list.loading, value: liters(tot?.dailyLiters ?? 0) },
        { icon: Wallet, tone: 'danger', label: t('Baqi'), loading: list.loading, value: cost(tot?.owed ?? 0), hint: tot?.advance ? `${t('Advance')} ${cost(tot.advance)}` : undefined },
      ]} />
      <ChipGroup value={tab} onChange={(v) => setTab(v as CustomerTab)} style={{ marginHorizontal: -th.space(4) }} options={[
        { value: 'active', label: `${t('Chalu')}${c?.active ? ` · ${c.active}` : ''}` }, { value: 'paused', label: `${t('Ruka hua')}${c?.paused ? ` · ${c.paused}` : ''}` },
        { value: 'owing', label: `${t('Baqi')}${c?.owing ? ` · ${c.owing}` : ''}` }, { value: 'closed', label: t('Band') }, { value: 'all', label: t('Sab') },
      ]} />
      {(routesQ.data ?? []).length > 0 && <ChipGroup value={route} onChange={setRoute} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab route') }, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: r.name }))]} />}
      <OfflineNote feature="dairyDesk" />
    </View>
  );

  return (
    <ListTemplate<DairyCustomer>
      title={t('Delivery customers')}
      grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Naam, phone, number ya area…') }}
      summary={header}
      data={list.items}
      loading={list.loading}
      error={list.error}
      onRetry={list.refetch}
      refreshing={list.refreshing}
      onRefresh={list.refetch}
      onEndReached={list.loadMore}
      keyExtractor={(x) => x.id}
      renderItem={({ item: x }) => {
        const st = CUSTOMER_STATUS[x.status];
        return (
          <RowCard dim={x.status === 'CLOSED'}>
            <ListRow icon={Users} iconTone={st?.tone ?? 'neutral'}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{x.name}</Text>{x.status !== 'ACTIVE' && st && <Badge tone={st.tone}>{t(st.label)}</Badge>}</Row>}
              subtitle={<View style={{ gap: 2 }}>
                <Text size="xs" tone="muted" numberOfLines={1}>{[x.customerNumber, x.area, x.route?.name].filter(Boolean).join(' · ')}</Text>
                <Text size="xs" tone="secondary" numberOfLines={1}>{`${x.morningQuantity} + ${x.eveningQuantity} L · ${t(FREQUENCY[x.deliveryFrequency]?.label ?? x.deliveryFrequency)}`}</Text>
              </View>}
              trailing={x.currentBalance > 0 ? <Amount value={x.currentBalance} weight="bold" tone="danger" /> : x.advancePayment > 0 ? <Amount value={x.advancePayment} tone="success" /> : undefined}
              chevron onPress={() => router.push(`/dairy/customers/${x.id}` as never)} />
          </RowCard>
        );
      }}
      empty={<EmptyState icon={Users} title={search ? t('Koi customer nahi mila') : t('Abhi koi customer nahi')} message={t('Ghar delivery ke customer jorein — roz ki quantity aur route ke saath.')} />}
      fab={can(P.CUSTOMERS_EDIT) ? { icon: Plus, label: t('Naya customer'), onPress: () => guard(() => router.push('/dairy/customers/new' as never)) } : undefined}
    />
  );
}
