/** Delivery challans (web DeliveriesPage): open, today, short deliveries, delivered and cancelled. A challan never moves stock or money; one bill can go out in several trips. */

import { router } from 'expo-router';
import { PackageCheck, Plus, Truck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, StatTile, StatusPill, Text, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { OfflineNote, useDeskOnline } from '../../_shared/trade/desk';
import { deliveriesApi, type Delivery, type DeliveryTab } from '../api';
import { KEYS, challanStatus, shortDate, vehicleLabel } from '../meta';

const LIMIT = 25;
const TABS: Array<{ value: DeliveryTab; label: string }> = [
  { value: 'open', label: t('Khule') }, { value: 'today', label: t('Aaj') }, { value: 'partial', label: t('Kuch pohancha') }, { value: 'delivered', label: t('Pohanch gaye') },
  { value: 'cancelled', label: t('Cancel') }, { value: 'all', label: t('Sab') },
];

export function ChallansScreen({ projectId }: { projectId?: string }) {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('hardwareDesk');
  const [tab, setTab] = useState<DeliveryTab>('open');
  const [search, setSearch] = useState('');
  const q = search.trim();
  const query = { tab, search: q || undefined, projectId };
  const list = usePaged([KEYS.deliveries, query], (page) => deliveriesApi.page({ ...query, page, limit: LIMIT }).then((r) => ({ ...r, pages: Math.max(Math.ceil(r.total / LIMIT), 1) })));
  const c = list.first?.counts;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Truck} tone="info" label={t('Khule')} loading={list.loading} value={String(c?.open ?? 0)} onPress={() => setTab('open')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={PackageCheck} tone="success" label={t('Aaj')} loading={list.loading} value={String(c?.today ?? 0)} hint={list.first ? t('Kiraya {{amount}}', { amount: formatMoney(list.first.charges) }) : undefined} onPress={() => setTab('today')} />
      </Row>
      <ChipGroup value={tab} onChange={(x) => setTab(x as DeliveryTab)} style={{ marginHorizontal: -th.space(4) }} options={TABS} />
      <OfflineNote feature="hardwareDesk" />
    </View>
  );
  return (
    <ListTemplate<Delivery>
      title={t('Delivery challan')} grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Challan, customer, pata ya driver…') }}
      summary={header} data={list.items} loading={list.loading} error={list.error} onRetry={list.refetch} refreshing={list.refreshing} onRefresh={list.refetch} onEndReached={list.loadMore} keyExtractor={(d) => d.id}
      renderItem={({ item: d }) => {
        const st = challanStatus(d.status);
        return (
          <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
            <ListRow icon={Truck} iconTone={st.tone} chevron onPress={() => router.push(`/hardware/deliveries/${d.id}` as never)}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{d.customerName}</Text><StatusPill tone={st.tone}>{st.label}</StatusPill></Row>}
              subtitle={<View style={{ gap: 2 }}>
                <Text size="xs" tone="muted" numberOfLines={1}>{[d.deliveryNumber, d.saleNumber, d.deliveryAddress].filter(Boolean).join(' · ')}</Text>
                <Row gap={1} wrap>
                  <Badge>{t('{{n}} items', { n: d.items.length })}</Badge>
                  {d.vehicleNumber ? <Badge tone="info">{[vehicleLabel(d.vehicleType), d.vehicleNumber].join(' · ')}</Badge> : <Badge tone="warning">{t('Gaari nahi')}</Badge>}
                  {d.scheduledDate ? <Badge>{shortDate(d.scheduledDate)}</Badge> : null}
                </Row>
              </View>} />
          </View>
        );
      }}
      empty={<EmptyState icon={Truck} title={q ? t('Koi challan nahi mila') : t('Abhi koi challan nahi')} message={t('Bill ke baad site par maal bhejne ke liye challan banayein.')} />}
      fab={can(P.POS_USE) ? { icon: Plus, label: t('Naya challan'), onPress: () => guard(() => router.push((projectId ? `/hardware/deliveries/new?project=${projectId}` : '/hardware/deliveries/new') as never)) } : undefined}
    />
  );
}
