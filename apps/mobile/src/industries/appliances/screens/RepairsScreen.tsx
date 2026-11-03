/**
 * Repairs and complaints (web ServiceRequestsPage): open queue with urgent and
 * late first, unpaid, done and all. Needs the server; shows the last saved data offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Plus, UserX, Wrench, Zap } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { jobDue } from '@nafaa/core/industries/appliances';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, StatTile, StatusPill, Text, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, slotLabel, useDeskOnline } from '../../_shared/trade/desk';
import { asPages, serviceRequestsApi, type ServiceRequest } from '../api';
import { KEYS, dayOnly, priorityOf, serviceStatus } from '../meta';

type View_ = 'open' | 'unpaid' | 'warranty' | 'done' | 'all';
const VIEWS: Array<{ value: View_; label: string }> = [
  { value: 'open', label: t('Khule kaam') }, { value: 'unpaid', label: t('Paisa baqi') }, { value: 'warranty', label: t('Warranty') }, { value: 'done', label: t('Ho gaye') }, { value: 'all', label: t('Sab') },
];
const LIMIT = 20;

export const repairDue = (r: ServiceRequest) => jobDue(r.totalCharge, r.paidAmount, r.dueAmount, r.coveredUnderAmc || r.coveredUnderWarranty);

export function RepairRow({ r }: { r: ServiceRequest }) {
  const th = useTheme();
  const st = serviceStatus(r.status);
  const due = repairDue(r);
  const pr = priorityOf(r.priority);
  return (
    <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
      <ListRow icon={Wrench} iconTone={r.isOverdue || r.priority === 'URGENT' ? 'danger' : 'info'} chevron onPress={() => router.push(`/appliances/service-requests/${r.id}` as never)}
        title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{r.productName}</Text><StatusPill tone={st.tone}>{st.label}</StatusPill></Row>}
        subtitle={<View style={{ gap: 2 }}>
          <Text size="xs" tone="muted" numberOfLines={1}>{[r.customerName, r.requestNumber].join(' · ')}</Text>
          <Text size="xs" numberOfLines={1}>{r.reportedIssue}</Text>
          <Row gap={1} wrap>
            {r.priority !== 'NORMAL' && <Badge tone={pr.tone} icon={Zap}>{pr.label}</Badge>}
            {r.scheduledDate && <Badge tone="neutral">{`${dayOnly(r.scheduledDate)} ${slotLabel(r.scheduledTimeSlot)}`.trim()}</Badge>}
            {!r.technicianName && ['REQUESTED', 'SCHEDULED'].includes(r.status) && <Badge tone="warning" icon={UserX}>{t('Banda nahi laga')}</Badge>}
            {r.coveredUnderWarranty && <Badge tone="success">{t('Warranty')}</Badge>}
            {r.coveredUnderAmc && <Badge tone="accent">{t('AMC')}</Badge>}
            {r.isOverdue && <Badge tone="danger" icon={AlertTriangle}>{t('Late')}</Badge>}
          </Row>
        </View>}
        trailing={due > 0 ? <Text size="sm" weight="bold" tone="warning">{formatMoney(due)}</Text> : undefined} />
    </View>
  );
}

export function RepairsScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('appliancesDesk');
  const [view, setView] = useState<View_>('open');
  const [search, setSearch] = useState('');
  const q = search.trim();
  const sum = useQuery({ queryKey: [KEYS.service, 'summary'], queryFn: () => serviceRequestsApi.summary() });
  const queue = useQuery({ queryKey: [KEYS.service, 'queue'], queryFn: () => serviceRequestsApi.queue(), enabled: view === 'open' });
  const paged = view !== 'open';
  const params = { search: q || undefined, limit: LIMIT, unpaidOnly: view === 'unpaid' || undefined, coveredUnderWarranty: view === 'warranty' || undefined, status: view === 'done' ? 'COMPLETED' : undefined };
  const list = usePaged([KEYS.service, 'paged', params], (page) => serviceRequestsApi.list({ ...params, page }).then(asPages), paged);
  const s = sum.data;
  const rows = useMemo(() => {
    const low = q.toLowerCase();
    return (view === 'open' ? queue.data ?? [] : list.items).filter((r) => !low || paged || [r.productName, r.customerName, r.customerPhone, r.requestNumber, r.serialNumber, r.reportedIssue].some((x) => (x ?? '').toLowerCase().includes(low)));
  }, [view, queue.data, list.items, q, paged]);

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Wrench} tone="info" label={t('Khule kaam')} loading={sum.isLoading} value={String(s?.open ?? 0)} hint={s?.completedToday ? t('{{n}} aaj theek hue', { n: s.completedToday }) : undefined} onPress={() => setView('open')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Zap} tone={s?.urgent ? 'danger' : 'neutral'} label={t('Foran')} loading={sum.isLoading} value={String(s?.urgent ?? 0)} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={UserX} tone={s?.unassigned ? 'warning' : 'neutral'} label={t('Banda nahi laga')} loading={sum.isLoading} value={String(s?.unassigned ?? 0)} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={AlertTriangle} tone={s?.overdue ? 'danger' : 'neutral'} label={t('Late')} loading={sum.isLoading} value={String(s?.overdue ?? 0)} hint={s?.month ? t('Baqi {{amount}}', { amount: formatMoney(s.month.outstanding) }) : undefined} />
      </Row>
      <ChipGroup value={view} onChange={(v) => setView(v as View_)} style={{ marginHorizontal: -th.space(4) }} options={VIEWS} />
      <OfflineNote feature="appliancesDesk" />
      <CachedNote query={sum} />
    </View>
  );
  return (
    <ListTemplate<ServiceRequest>
      title={t('Repairs')} grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Customer, product, serial ya kharabi…') }}
      summary={header} data={rows}
      loading={view === 'open' ? queue.isLoading : list.loading} error={view === 'open' ? queue.error : list.error}
      onRetry={() => (view === 'open' ? void queue.refetch() : list.refetch())}
      refreshing={view === 'open' ? queue.isRefetching : list.refreshing}
      onRefresh={() => { if (view === 'open') void queue.refetch(); else list.refetch(); void sum.refetch(); }}
      onEndReached={paged ? list.loadMore : undefined}
      keyExtractor={(r) => r.id} renderItem={({ item }) => <RepairRow r={item} />}
      empty={<EmptyState icon={Wrench} title={q ? t('Is search me koi kaam nahi') : t('Abhi koi shikayat nahi')} message={t('Fridge, AC ya washing machine ki shikayat yahan darj karein.')} />}
      fab={can(P.SERVICE_JOBS_MANAGE) ? { icon: Plus, label: t('Nayi shikayat'), onPress: () => guard(() => router.push('/appliances/service-requests/new' as never)) } : undefined}
    />
  );
}
