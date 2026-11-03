/**
 * Buyer home of the trade network: linked suppliers with what needs doing
 * (open orders, goods to receive, payments to confirm), joining a supplier
 * by invite code or phone, and the opt-in "Nafaa par distributors" list.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, ClipboardList, Network, PackageCheck, Plus, ShoppingCart, Users } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Button, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, Row, Segmented, StatTile, Text, confirm, toast, useDebouncedValue, useTheme,
} from '@/design';
import { TRADE_KEY, tradeApi, tradeError, type DirectoryRow, type SupplierRow } from '../api/trade.api';
import { LINK_STATUS } from '../lib/meta';
import { BizAvatar, CachedLine, ConnectSheet, Pill, rsInt, useOverview, whereText } from '../components/shared';

type Tab = 'mine' | 'directory';
type Item = { kind: 'live' | 'other'; row: SupplierRow } | { kind: 'dir'; row: DirectoryRow };

export function SuppliersScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [tab, setTab] = useState<Tab>('mine');
  const [connect, setConnect] = useState(!!code);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const term = useDebouncedValue(search.trim(), 250);
  const ov = useOverview();
  const q = useQuery({ queryKey: [TRADE_KEY, 'suppliers'], queryFn: tradeApi.suppliers });
  const dir = useQuery({
    queryKey: [TRADE_KEY, 'directory', term, city],
    queryFn: () => tradeApi.directory({ search: term || undefined, city: city || undefined }),
    enabled: tab === 'directory',
  });
  const canLink = ov.data?.perms.links ?? can(P.TRADE_LINKS_MANAGE);
  const b = ov.data?.buyer;
  const rows = q.data ?? [];
  const live = rows.filter((r) => r.status === 'ACTIVE' || r.status === 'PAUSED');
  const others = rows.filter((r) => !(r.status === 'ACTIVE' || r.status === 'PAUSED'));

  const cancel = useMutation({
    mutationFn: (id: string) => tradeApi.cancelRequest(id),
    onSuccess: () => { toast.success(t('Request wapas li')); void qc.invalidateQueries({ queryKey: [TRADE_KEY] }); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const ask = useMutation({
    mutationFn: (r: DirectoryRow) => tradeApi.request({ profileId: r.profileId }),
    onSuccess: () => { toast.success(t('Request bhej di')); void qc.invalidateQueries({ queryKey: [TRADE_KEY] }); },
    onError: (e) => toast.error(tradeError(e)),
  });

  const data: Item[] = tab === 'mine'
    ? [...live.map((row) => ({ kind: 'live' as const, row })), ...others.map((row) => ({ kind: 'other' as const, row }))]
    : (dir.data?.sellers ?? []).map((row) => ({ kind: 'dir' as const, row }));

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Users} label={t('Suppliers')} value={String(b?.suppliers ?? '—')} onPress={() => setTab('mine')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={ClipboardList} label={t('Chalte Order')} value={String(b?.openOrders ?? '—')} onPress={() => router.push('/network/orders')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone={(b?.toReceive ?? 0) > 0 ? 'warning' : 'neutral'} icon={PackageCheck} label={t('Receive baqi')} value={String(b?.toReceive ?? '—')} onPress={() => router.push('/network/receiving')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone={(b?.paymentsToConfirm ?? 0) > 0 ? 'warning' : 'neutral'} label={t('Payment confirm')} value={String(b?.paymentsToConfirm ?? '—')} />
      </Row>
      {ov.data?.perms.sell && (
        <Button variant="soft" icon={Network} onPress={() => router.push('/network/customers')}>{t('Network customers')}</Button>
      )}
      <Segmented value={tab} onChange={setTab} options={[{ value: 'mine', label: t('My suppliers'), count: live.length }, { value: 'directory', label: t('Directory') }]} />
      {tab === 'directory' && dir.data && dir.data.cities.length > 0 && (
        <ChipGroup value={city} onChange={setCity} style={{ marginHorizontal: -th.space(4) }}
          options={[{ value: '', label: t('Sab shehar') }, ...dir.data.cities.map((c) => ({ value: c, label: c }))]} />
      )}
      <CachedLine query={tab === 'mine' ? q : dir} />
    </View>
  );

  return (
    <>
      <ListTemplate<Item>
        title={t('Suppliers')}
        subtitle={t('Nafaa network')}
        actions={canLink ? <IconButton icon={Plus} label={t('Add supplier')} onPress={() => setConnect(true)} /> : undefined}
        search={tab === 'directory' ? { value: search, onChange: setSearch, placeholder: t('Naam, brand ya category') } : undefined}
        summary={summary}
        data={data}
        loading={tab === 'mine' ? q.isLoading : dir.isLoading}
        error={tab === 'mine' ? (q.data ? null : q.error) : (dir.data ? null : dir.error)}
        onRetry={tab === 'mine' ? q.refetch : dir.refetch}
        refreshing={q.isRefetching || ov.isRefetching}
        onRefresh={() => { void q.refetch(); void ov.refetch(); if (tab === 'directory') void dir.refetch(); }}
        keyExtractor={(i) => (i.kind === 'dir' ? i.row.profileId : i.row.id)}
        renderItem={({ item }) => {
          if (item.kind === 'dir') {
            const r = item.row;
            const linked = r.link && ['PENDING', 'ACTIVE', 'PAUSED'].includes(r.link.status);
            return (
              <ListRow leading={<BizAvatar card={r.seller} />} title={r.seller?.name ?? ''}
                subtitle={[whereText(r.seller), r.minOrderValue ? t('Kam se kam Order Rs {{minOrderValue}}', { minOrderValue: rsInt(r.minOrderValue) }) : ''].filter(Boolean).join(' · ')}
                trailing={linked && r.link
                  ? <Pill tone={LINK_STATUS[r.link.status].tone}>{LINK_STATUS[r.link.status].label}</Pill>
                  : canLink ? <Button size="sm" icon={BadgeCheck} loading={ask.isPending && ask.variables?.profileId === r.profileId} onPress={() => ask.mutate(r)}>{t('Send request')}</Button> : undefined}
                divider />
            );
          }
          const r = item.row;
          if (item.kind === 'other') {
            return (
              <ListRow leading={<BizAvatar card={r.seller} size={36} />} title={r.seller?.name ?? t('Supplier')}
                subtitle={r.status === 'PENDING' ? t('Supplier ke approve ka intezar') : r.rejectReason ?? LINK_STATUS[r.status].label}
                trailing={(
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Pill tone={LINK_STATUS[r.status].tone}>{LINK_STATUS[r.status].label}</Pill>
                    {canLink && r.status === 'PENDING' && (
                      <Button size="sm" variant="ghost" loading={cancel.isPending} onPress={async () => {
                        if (await confirm({ title: t('Withdraw request?'), confirmLabel: t('Withdraw') })) cancel.mutate(r.id);
                      }}>{t('Withdraw')}</Button>
                    )}
                  </View>
                )} divider />
            );
          }
          const paused = r.status === 'PAUSED';
          return (
            <View style={{ padding: th.space(3), gap: th.space(2) }}>
              <Row gap={3}>
                <BizAvatar card={r.seller} size={44} />
                <View style={{ flex: 1 }}>
                  <Row gap={2}>
                    <Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{r.seller?.name ?? t('Supplier')}</Text>
                    {paused && <Pill tone="orange">{t('Order ruke')}</Pill>}
                  </Row>
                  <Text size="xs" tone="muted" numberOfLines={1}>{[whereText(r.seller), r.seller?.phone].filter(Boolean).join(' · ')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text size="2xs" tone="muted">{t('Supplier khata')}</Text>
                  <Amount value={r.supplier?.outstandingDue ?? 0} weight="bold" />
                </View>
              </Row>
              <Row gap={2}>
                <Pill tone={r.openOrders ? 'blue' : 'slate'}>{`${t('Chalte')} ${r.openOrders}`}</Pill>
                <Pill tone={r.toReceive ? 'amber' : 'slate'}>{`${t('Receive')} ${r.toReceive}`}</Pill>
                <Pill tone={r.paymentsToConfirm ? 'amber' : 'slate'}>{`${t('Confirm')} ${r.paymentsToConfirm}`}</Pill>
              </Row>
              <Row gap={2}>
                <Button style={{ flex: 1 }} icon={ShoppingCart} disabled={paused} onPress={() => router.push(`/network/order/${r.id}`)}>{t('Order')}</Button>
                <Button style={{ flex: 1 }} variant="secondary" onPress={() => router.push(`/network/suppliers/${r.id}`)}>{t('Account')}</Button>
              </Row>
            </View>
          );
        }}
        empty={tab === 'mine'
          ? (
            <EmptyState icon={Network} title={t('Suppliers')}
              message={t('Abhi koi supplier jura nahi. Apne distributor se Nafaa invite code maangein ya us ka phone number likhein — approve hote hi aap seedha Order bhej sakenge.')}
              action={canLink ? <Button icon={Plus} onPress={() => setConnect(true)}>{t('Add supplier')}</Button> : undefined} />
          )
          : <EmptyState icon={Network} title={t('Directory')} message={t('Is talaash me koi distributor nahi. Jo distributor directory me aana chahe woh apne Network page se on karta hai.')} />}
      />
      <ConnectSheet open={connect} onClose={() => setConnect(false)} initialCode={code} />
    </>
  );
}
