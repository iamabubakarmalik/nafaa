/** Repairs (web RepairTicketsPage): phones in the shop and where each job stands, what is late, money to take and warranty jobs. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, CheckCircle2, Plus, Smartphone, Wallet, Wrench } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { repairDue } from '@nafaa/core/industries/mobile';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, StatTile, Text, useDebouncedValue, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote } from '../../_shared/deskKit';
import { repairsApi, type RepairListParams, type RepairPriority, type RepairTicket, type RepairView } from '../api';
import { MetaPill, useShopId } from '../components/kit';
import { PRIORITIES, REPAIR_KEY, daysTo, metaText, priorityOf, repairStatusOf } from '../meta';

const VIEWS: Array<{ value: RepairView; label: string }> = [
  { value: 'open', label: t('Shop me') }, { value: 'working', label: t('Kaam baqi') }, { value: 'ready', label: t('Tayyar — dene hain') }, { value: 'late', label: t('Late') },
  { value: 'unpaid', label: t('Paisa baqi') }, { value: 'warranty', label: t('Warranty me') }, { value: 'closed', label: t('Wapas / cancel') }, { value: 'all', label: t('Sab') },
];

export function RepairsScreen() {
  const th = useTheme();
  const params0 = useLocalSearchParams<{ view?: RepairView }>();
  const shopId = useShopId();
  const canManage = usePermission()(P.MOBILE_REPAIRS_MANAGE);
  const [view, setView] = useState<RepairView>(params0.view ?? 'open');
  const [priority, setPriority] = useState<RepairPriority | ''>('');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const params: RepairListParams = { view, shopId: shopId ?? undefined, page: 1, limit: 60, sort: 'due', search: query || undefined, priority: priority || undefined };
  const list = useQuery({ queryKey: [REPAIR_KEY, 'page', params], queryFn: () => repairsApi.list(params), placeholderData: (p) => p });
  const stats = useQuery({ queryKey: ['repair-stats', shopId], queryFn: () => repairsApi.stats(shopId ?? undefined), refetchInterval: 60_000 });
  const s = stats.data;
  const counts = (list.data as { counts?: Record<string, number> } | undefined)?.counts ?? {};

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Smartphone} tone="info" label={t('Shop me')} loading={stats.isLoading} value={String(s?.openTickets ?? 0)} onPress={() => setView('open')} />
        <StatTile style={{ flex: 1 }} icon={CheckCircle2} tone="success" label={t('Tayyar')} loading={stats.isLoading} value={String(s?.byStatus?.find((b) => b.status === 'READY')?.count ?? 0)} onPress={() => setView('ready')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={AlertTriangle} tone={s?.late ? 'danger' : 'neutral'} label={t('Late')} loading={stats.isLoading} value={String(s?.late ?? 0)} onPress={() => setView('late')} />
        <StatTile style={{ flex: 1 }} icon={Wallet} tone="warning" label={t('Lene hain')} loading={stats.isLoading} value={<Amount value={s?.readyDue ?? 0} size="lg" weight="bold" /> as never} />
      </Row>
      <ChipGroup value={view} onChange={setView} options={VIEWS.map((v) => ({ value: v.value, label: `${v.label}${counts[v.value] != null ? ` ${counts[v.value]}` : ''}` }))} />
      <ChipGroup value={priority} onChange={setPriority} options={[{ value: '', label: t('Har tarah') }, ...PRIORITIES.map((p) => ({ value: p, label: t(priorityOf(p).label) }))]} />
      <OfflineNote feature="mobileDesk" />
      <CachedNote query={list} />
    </View>
  );

  return (
    <ListTemplate<RepairTicket>
      title={t('Repairs')}
      grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Job, customer, phone ya IMEI…') }}
      summary={header}
      data={list.data?.items ?? []}
      loading={list.isLoading}
      error={list.data ? null : list.error}
      onRetry={() => void list.refetch()}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      keyExtractor={(r) => r.id}
      renderItem={({ item: r }) => {
        const due = repairDue({ totalCost: Number(r.totalCost) > 0 ? r.totalCost : r.estimatedCost, paidAmount: r.paidAmount });
        const left = daysTo(r.estimatedReadyAt);
        return (
          <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
            <ListRow icon={Wrench} iconTone={repairStatusOf(r.status).tone}
              title={<Text weight="semibold" numberOfLines={1}>{r.deviceBrand} {r.deviceModel}</Text>}
              subtitle={<View style={{ gap: 2 }}>
                <Text size="xs" tone="muted" numberOfLines={1}>{r.ticketNumber} · {r.customerName}</Text>
                <Row gap={1} wrap>
                  <MetaPill m={repairStatusOf(r.status)} />
                  {r.priority !== 'NORMAL' && <Badge tone={priorityOf(r.priority).tone}>{metaText(priorityOf(r.priority))}</Badge>}
                  {r.isLate && <Badge tone="danger">{t('Late')}</Badge>}
                  {r.warrantyOf || r.warrantyActive ? <Badge tone="info">{t('Warranty')}</Badge> : null}
                </Row>
                {left != null && r.status !== 'DELIVERED' && r.status !== 'CANCELLED' && <Text size="2xs" tone={left < 0 ? 'danger' : 'muted'}>{left === 0 ? t('Aaj') : left < 0 ? t('{{value}} din late', { value: -left }) : t('{{left}} din', { left })}</Text>}
              </View>}
              trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={Number(r.totalCost) > 0 ? r.totalCost : r.estimatedCost} size="sm" weight="semibold" />{due > 0 && r.status !== 'CANCELLED' ? <Text size="2xs" tone="danger">{t('baqi')} <Amount value={due} size="2xs" tone="danger" /></Text> : null}</View>}
              onPress={() => router.push(`/mobile/repairs/${r.id}` as never)} />
          </View>
        );
      }}
      empty={<EmptyState icon={Wrench} title={t('Koi repair job nahi')} message={t('Naya job banane ke liye + dabayein.')} />}
      fab={canManage ? { icon: Plus, label: t('Naya job'), onPress: () => router.push('/mobile/repairs/new' as never) } : undefined}
    />
  );
}
