/** Heavy deliveries (web DeliveriesPage): open trips, today, no vehicle yet, late, unpaid charges and finished trips. Needs the server. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, CalendarClock, HardHat, Plus, Truck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, StatTile, StatusPill, Text, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, slotLabel, useDeskOnline } from '../../_shared/trade/desk';
import { deliveriesApi, type ApplianceDelivery, type DeliveryView } from '../api';
import { KEYS, dayOnly, deliveryStatus } from '../meta';

const VIEWS: Array<{ value: DeliveryView; label: string }> = [
  { value: 'open', label: t('Khule') }, { value: 'today', label: t('Aaj') }, { value: 'novehicle', label: t('Gaari nahi') }, { value: 'late', label: t('Late') },
  { value: 'unpaid', label: t('Paisa baqi') }, { value: 'delivered', label: t('De diye') }, { value: 'all', label: t('Sab') },
];
const LIMIT = 20;

export function DeliveriesScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('appliancesDesk');
  const [view, setView] = useState<DeliveryView>('open');
  const [search, setSearch] = useState('');
  const q = search.trim();
  const sum = useQuery({ queryKey: [KEYS.delivery, 'summary'], queryFn: () => deliveriesApi.summary() });
  const list = usePaged([KEYS.delivery, 'page', view, q], (page) => deliveriesApi.page({ view, search: q || undefined, page, limit: LIMIT }).then((r) => ({ items: r.items, page: r.page, pages: Math.max(r.totalPages, 1) })));
  const s = sum.data;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Truck} tone="info" label={t('Khule trip')} loading={sum.isLoading} value={String(s?.open ?? 0)} onPress={() => setView('open')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CalendarClock} tone="success" label={t('Aaj')} loading={sum.isLoading} value={String(s?.todayScheduled ?? 0)} onPress={() => setView('today')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Truck} tone={s?.noVehicle ? 'warning' : 'neutral'} label={t('Gaari nahi lagi')} loading={sum.isLoading} value={String(s?.noVehicle ?? 0)} onPress={() => setView('novehicle')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={AlertTriangle} tone={s?.overdue ? 'danger' : 'neutral'} label={t('Late')} loading={sum.isLoading} value={String(s?.overdue ?? 0)} onPress={() => setView('late')} />
      </Row>
      {!!s?.installationPending && <Row gap={1.5}><HardHat size={14} color={th.colors.warning.text} /><Text size="xs" tone="warning" style={{ flex: 1 }}>{t('{{n}} deliveries ki installation abhi book nahi hui', { n: s.installationPending })}</Text></Row>}
      <ChipGroup value={view} onChange={(v) => setView(v as DeliveryView)} style={{ marginHorizontal: -th.space(4) }} options={VIEWS} />
      <OfflineNote feature="appliancesDesk" />
      <CachedNote query={sum} />
    </View>
  );
  return (
    <ListTemplate<ApplianceDelivery>
      title={t('Deliveries')} grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Customer, phone, number ya pata…') }}
      summary={header} data={list.items} loading={list.loading} error={list.error} onRetry={list.refetch} refreshing={list.refreshing}
      onRefresh={() => { list.refetch(); void sum.refetch(); }} onEndReached={list.loadMore} keyExtractor={(d) => d.id}
      renderItem={({ item: d }) => {
        const st = deliveryStatus(d.status);
        const due = d.dueAmount ?? 0;
        return (
          <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
            <ListRow icon={Truck} iconTone="info" chevron onPress={() => router.push(`/appliances/deliveries/${d.id}` as never)}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{d.customerName}</Text><StatusPill tone={st.tone}>{st.label}</StatusPill></Row>}
              subtitle={<View style={{ gap: 2 }}>
                <Text size="xs" tone="muted" numberOfLines={1}>{[d.deliveryNumber, d.area, d.deliveryAddress].filter(Boolean).join(' · ')}</Text>
                <Row gap={1} wrap>
                  <Badge tone={d.scheduledDate ? 'neutral' : 'warning'}>{d.scheduledDate ? `${dayOnly(d.scheduledDate)} ${slotLabel(d.scheduledSlot)}`.trim() : t('Abhi tay nahi')}</Badge>
                  {!d.vehicleNumber && ['PENDING', 'SCHEDULED'].includes(d.status) && <Badge tone="warning">{t('Gaari nahi')}</Badge>}
                  {d.requiresInstallation && <Badge tone="info">{t('Installation bhi')}</Badge>}
                </Row>
              </View>}
              trailing={due > 0 ? <Text size="sm" weight="bold" tone="warning">{formatMoney(due)}</Text> : undefined} />
          </View>
        );
      }}
      empty={<EmptyState icon={Truck} title={q ? t('Is search me koi trip nahi') : t('Abhi koi delivery nahi')} message={t('Bhari saman ki delivery yahan chalti hai — gaari, driver aur helper ke saath.')} />}
      fab={can(P.SERVICE_JOBS_MANAGE) ? { icon: Plus, label: t('Nayi delivery'), onPress: () => guard(() => router.push('/appliances/deliveries/new' as never)) } : undefined}
    />
  );
}
