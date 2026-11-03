/**
 * IMEI stock (web GlobalImeiInventoryPage): every new phone by its IMEI — what
 * is on the shelf and for how long, PTA status, what was sold, to whom and the
 * warranty left. Opened from a product it shows that model only.
 */

import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Plus, ScanSearch, ShieldCheck, Smartphone, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, Row, StatTile, Text, useDebouncedValue, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { imeiApi, type ImeiListParams, type ImeiRow, type ImeiStatus, type PtaStatus } from '../api';
import { AddImeisSheet, EditImeiSheet, ImeiLookupSheet } from '../components/ImeiSheets';
import { MetaPill, useShopId } from '../components/kit';
import { IMEI_KEY, ageText, imeiStatusOf, metaText, ptaOf, PTA_LIST } from '../meta';

type StatusPick = ImeiStatus | 'all';
const AGED = [{ value: '', label: t('Koi bhi') }, { value: '30', label: t('30 din se purane') }, { value: '60', label: t('60 din se purane') }, { value: '90', label: t('90 din se purane') }];

export function ImeiStockScreen() {
  const th = useTheme();
  const { id: productId } = useLocalSearchParams<{ id?: string }>();
  const shopId = useShopId();
  const can = usePermission();
  const canManage = can(P.MOBILE_IMEI_MANAGE);
  const { cost } = useCostMask();
  const { guard } = useDeskOnline('mobileDesk');
  const [status, setStatus] = useState<StatusPick>('IN_STOCK');
  const [pta, setPta] = useState<PtaStatus | ''>('');
  const [aged, setAged] = useState('');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const [adding, setAdding] = useState(false);
  const [lookup, setLookup] = useState<string | null>(null);
  const [editing, setEditing] = useState<ImeiRow | null>(null);

  const params: ImeiListParams = { productId, shopId: shopId ?? undefined, page: 1, limit: 100, sort: 'new', search: query || undefined, status: status === 'all' ? undefined : status, ptaStatus: pta || undefined, agedDays: aged ? Number(aged) : undefined };
  const list = useQuery({ queryKey: [IMEI_KEY, 'page', params], queryFn: () => imeiApi.listAll(params), placeholderData: (p) => p });
  const stats = useQuery({ queryKey: ['imei-stats', shopId], queryFn: () => imeiApi.stats(shopId ?? undefined), refetchInterval: 60_000 });
  const s = stats.data;
  const rows = list.data?.items ?? [];
  const counts = list.data?.counts ?? {};
  const nonPta = s?.byPta?.find((b) => b.ptaStatus === 'NON_PTA')?.count ?? 0;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Smartphone} tone="success" label={t('Shelf par')} loading={stats.isLoading} value={String(s?.inStock ?? 0)} />
        <StatTile style={{ flex: 1 }} icon={Wallet} tone="info" label={t('Stock value')} loading={stats.isLoading} value={cost(s?.stockValue ?? 0)} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={ShieldCheck} tone={nonPta ? 'warning' : 'neutral'} label={t('Non-PTA')} loading={stats.isLoading} value={String(nonPta)} onPress={() => { setStatus('IN_STOCK'); setPta('NON_PTA'); }} />
        <StatTile style={{ flex: 1 }} tone="danger" label={t('60+ din purane')} loading={stats.isLoading} value={String(s?.aged60 ?? 0)} onPress={() => { setStatus('IN_STOCK'); setAged('60'); }} />
      </Row>
      <ChipGroup value={status} onChange={setStatus} options={[{ value: 'all', label: t('Sab phone') }, ...(['IN_STOCK', 'SOLD', 'RESERVED', 'RETURNED', 'DAMAGED', 'LOST'] as ImeiStatus[]).map((st) => ({ value: st, label: `${t(imeiStatusOf(st).label)}${counts[st] != null ? ` ${counts[st]}` : ''}` }))]} />
      <ChipGroup value={pta} onChange={setPta} options={[{ value: '', label: t('PTA: sab') }, ...PTA_LIST.map((p) => ({ value: p, label: t(ptaOf(p).label) }))]} />
      <ChipGroup value={aged} onChange={setAged} options={AGED.map((a) => ({ value: a.value, label: a.label }))} />
      <OfflineNote feature="mobileDesk" />
      <CachedNote query={list} />
    </View>
  );

  return (
    <>
      <ListTemplate<ImeiRow>
        title={t('IMEI stock')}
        grouped={false}
        actions={<IconButton icon={ScanSearch} label={t('IMEI check')} onPress={() => setLookup('')} />}
        search={{ value: search, onChange: setSearch, placeholder: t('IMEI, model ya customer…'), onScan: undefined }}
        summary={header}
        data={rows}
        loading={list.isLoading}
        error={list.data ? null : list.error}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => (
          <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
            <ListRow icon={Smartphone} iconTone={imeiStatusOf(r.status).tone}
              title={<Text weight="semibold" numberOfLines={1}>{r.product.name}{r.variant ? ` · ${r.variant.name}` : ''}</Text>}
              subtitle={<View style={{ gap: 2 }}>
                <Text size="xs" tone="muted" ltr>{r.imei1}</Text>
                <Row gap={1} wrap>
                  <MetaPill m={imeiStatusOf(r.status)} />
                  <Badge tone={ptaOf(r.ptaStatus).tone}>{metaText(ptaOf(r.ptaStatus))}</Badge>
                  {r.status === 'IN_STOCK' && <Text size="2xs" tone="muted">{ageText(r.daysInStock)}</Text>}
                </Row>
                {r.sale && <Text size="xs" tone="secondary" numberOfLines={1}>{r.sale.saleNumber}{r.sale.customer ? ` · ${r.sale.customer.name}` : ''}</Text>}
              </View>}
              trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="semibold" size="sm" ltr>{cost(r.costPrice)}</Text>{r.soldPrice ? <Amount value={r.soldPrice} size="xs" tone="muted" /> : null}</View>}
              onPress={() => setEditing(r)} />
          </View>
        )}
        empty={<EmptyState icon={Smartphone} title={t('Koi phone nahi mila')} message={t('IMEI daalne ke liye + dabayein.')} />}
        fab={canManage ? { icon: Plus, label: t('IMEI daalein'), onPress: () => guard(() => setAdding(true)) } : undefined}
      />
      <AddImeisSheet open={adding} productId={productId} onClose={() => setAdding(false)} />
      <EditImeiSheet row={editing} canManage={canManage} onClose={() => setEditing(null)} />
      <ImeiLookupSheet open={lookup != null} initial={lookup ?? ''} onClose={() => setLookup(null)} />
    </>
  );
}
