/**
 * Deliveries of showroom bills and custom orders (web DeliveriesPage): date and
 * time, vehicle and driver, out, reached, delivered / fitted. Delivery charges
 * (transport, loading, floors, fitting) get their own bill when collected.
 * Deliveries are cancelled, never deleted.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CalendarClock, ClipboardList, PackageCheck, Plus, Truck } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { dayKey } from '@nafaa/core/industries/furniture';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Card, ChipGroup, EmptyState, HBarList, IconButton, ListRow, ListTemplate, Text, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { Meta, RowCard, StatGrid } from '../../_shared/trade/kit';
import { deliveriesApi, type FurnitureDelivery } from '../api';
import { FURNITURE_KEYS, OPEN_DELIVERY, charges, deliveryStatus } from '../meta';

type Tab = 'open' | 'today' | 'done' | 'cancelled' | 'all' | 'analytics';
const LIMIT = 25;

export function DeliveriesScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('furnitureDesk');
  const canManage = can(P.SERVICE_JOBS_MANAGE);
  const [tab, setTab] = useState<Tab>('open');
  const [search, setSearch] = useState('');
  const today = dayKey();
  const filter = {
    status: tab === 'open' ? OPEN_DELIVERY.join(',') : tab === 'done' ? 'DELIVERED,ASSEMBLED' : tab === 'cancelled' ? 'FAILED,RETURNED' : undefined,
    from: tab === 'today' ? today : undefined, to: tab === 'today' ? today : undefined, search: search.trim() || undefined, limit: LIMIT,
  };
  const list = usePaged([FURNITURE_KEYS.deliveries, 'page', filter], (page) => deliveriesApi.page({ ...filter, page }).then((r) => ({ items: r.items, page: r.page, pages: Math.max(Math.ceil(r.total / LIMIT), 1) })), tab !== 'analytics');
  const sum = useQuery({ queryKey: [FURNITURE_KEYS.deliveries, 'summary'], queryFn: () => deliveriesApi.summary() });
  const all = useQuery({ queryKey: [FURNITURE_KEYS.deliveries, 'analytics'], queryFn: () => deliveriesApi.page({ page: 1, limit: 200 }), enabled: tab === 'analytics' });
  const s = sum.data;

  const analytics = useMemo(() => {
    const items = (all.data?.items ?? []).filter((d) => d.status !== 'FAILED');
    const group = (key: (d: FurnitureDelivery) => string) => {
      const m = new Map<string, { count: number; value: number }>();
      for (const d of items) { const k = key(d); const x = m.get(k) ?? { count: 0, value: 0 }; x.count += 1; x.value += charges(d); m.set(k, x); }
      return [...m.entries()].map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.count - a.count).slice(0, 10);
    };
    return { byArea: group((d) => d.area || d.city || t('Likha nahi')), byDriver: group((d) => d.driverName || t('Driver nahi')) };
  }, [all.data]);

  const tabs: Array<{ value: Tab; label: string; n?: number | null }> = [
    { value: 'open', label: t('Baqi') }, { value: 'today', label: t('Aaj'), n: s?.todayScheduled }, { value: 'done', label: t('De di') },
    { value: 'cancelled', label: t('Cancel / wapas') }, { value: 'all', label: t('Sab') }, { value: 'analytics', label: t('Analytics') },
  ];
  const bars = (title: string, rows: Array<{ key: string; count: number; value: number }>) => (
    <Card title={title}><HBarList colorful rows={rows.map((r) => ({ key: r.key, label: r.key, value: r.count, display: <Text size="xs" tone="muted">{`${r.count} · ${formatMoney(r.value)}`}</Text> }))} /></Card>
  );

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <StatGrid items={[
        { icon: CalendarClock, tone: 'info', label: t('Aaj ki'), loading: sum.isLoading, value: String(s?.todayScheduled ?? 0), onPress: () => setTab('today') },
        { icon: ClipboardList, tone: 'warning', label: t('Baqi (tay + bina date)'), loading: sum.isLoading, value: String((s?.scheduled ?? 0) + (s?.pending ?? 0) + (s?.rescheduled ?? 0)), onPress: () => setTab('open') },
        { icon: Truck, tone: 'accent', label: t('Raste me'), loading: sum.isLoading, value: String(s?.inTransit ?? 0) },
        { icon: PackageCheck, tone: 'success', label: t('De di'), loading: sum.isLoading, value: String((s?.delivered ?? 0) + (s?.assembled ?? 0)), onPress: () => setTab('done') },
      ]} />
      <OfflineNote feature="furnitureDesk" />
      <CachedNote query={sum} />
      <ChipGroup value={tab} onChange={(v) => setTab(v as Tab)} style={{ marginHorizontal: -th.space(4) }} options={tabs.map((x) => ({ value: x.value, label: x.n ? `${x.label} · ${x.n}` : x.label }))} />
      {tab === 'analytics' && !all.isLoading && (
        <View style={{ gap: th.space(3) }}>{bars(t('Ilaqa (deliveries · charges)'), analytics.byArea)}{bars(t('Driver'), analytics.byDriver)}</View>
      )}
    </View>
  );

  return (
    <ListTemplate<FurnitureDelivery>
      title={t('Deliveries')}
      subtitle={t('Furniture ghar tak — waqt, gaari, fitting aur charges')}
      grouped={false}
      actions={<IconButton icon={ClipboardList} label={t('Orders')} onPress={() => router.push('/furniture/custom-orders' as never)} />}
      search={tab !== 'analytics' ? { value: search, onChange: setSearch, placeholder: t('Delivery, customer, phone, gaari, driver ya ilaqa…') } : undefined}
      summary={summary}
      data={tab === 'analytics' ? [] : list.items}
      loading={tab !== 'analytics' && list.loading}
      error={tab !== 'analytics' ? list.error : undefined}
      onRetry={list.refetch}
      refreshing={list.refreshing}
      onRefresh={() => { list.refetch(); void sum.refetch(); }}
      onEndReached={list.loadMore}
      keyExtractor={(d) => d.id}
      renderItem={({ item: d }) => {
        const st = deliveryStatus(d.status);
        const total = charges(d);
        return (
          <RowCard>
            <ListRow
              title={<Text weight="semibold" numberOfLines={1}>{d.customerName}</Text>}
              subtitle={<View style={{ gap: 3 }}>
                <Meta parts={[d.deliveryNumber, d.productNames.slice(0, 3).join(', '), [d.area, d.city].filter(Boolean).join(', '), d.floorNumber ? t('{{floorNumber}} manzil{{value}}', { floorNumber: d.floorNumber, value: d.hasLift ? t(' (lift)') : '' }) : null]} />
                <Text size="xs">{[d.scheduledDate ? formatDate(d.scheduledDate) : t('Date nahi'), d.scheduledSlot ?? d.vehicleNumber].filter(Boolean).join(' · ')}</Text>
              </View>}
              trailing={<View style={{ alignItems: 'flex-end', gap: 3 }}>
                <Text size="sm" weight="bold" ltr>{total ? formatMoney(total) : t('Free')}</Text>
                <Text size="2xs" tone="muted">{d.chargesBill ? t('Bill {{saleNumber}}', { saleNumber: d.chargesBill.saleNumber }) : total ? t('Bill nahi bana') : ''}</Text>
                <Badge tone={st.tone}>{t(st.label)}</Badge>
              </View>}
              chevron
              onPress={() => router.push(`/furniture/deliveries/${d.id}` as never)}
            />
          </RowCard>
        );
      }}
      empty={tab === 'analytics' ? undefined : <EmptyState icon={Truck} title={tab === 'today' ? t('Aaj koi delivery nahi') : t('Is filter me koi delivery nahi')} message={t('Counter ke bill ya custom order se delivery banayein.')} />}
      fab={canManage ? { icon: Plus, label: t('Delivery'), onPress: () => guard(() => router.push('/furniture/deliveries/new' as never)) } : undefined}
    />
  );
}
