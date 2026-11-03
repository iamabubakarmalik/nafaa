/**
 * Installations (web InstallationsPage): AC, geyser, washing machine and TV
 * fitting visits. Open work with late visits first, today, money still to
 * collect and finished jobs. Needs the server; shows the last saved data offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, CalendarClock, HardHat, Plus, UserX } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { jobDue } from '@nafaa/core/industries/appliances';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, StatTile, StatusPill, Text, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, useDeskOnline } from '../../_shared/trade/desk';
import { asPages, installationsApi, type Installation } from '../api';
import { KEYS, dayOnly, installStatus, serviceTypeOf } from '../meta';
import { slotLabel } from '../../_shared/trade/desk';

type View_ = 'open' | 'today' | 'unpaid' | 'done' | 'all';
const VIEWS: Array<{ value: View_; label: string }> = [
  { value: 'open', label: t('Khule kaam') }, { value: 'today', label: t('Aaj') }, { value: 'unpaid', label: t('Paisa baqi') }, { value: 'done', label: t('Ho gaye') }, { value: 'all', label: t('Sab') },
];
const LIMIT = 20;

export const installDue = (i: Installation) => jobDue(i.totalCharge, i.paidByCustomer, i.dueAmount, false);

export function InstallationRow({ i }: { i: Installation }) {
  const th = useTheme();
  const st = installStatus(i.status);
  const due = installDue(i);
  return (
    <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
      <ListRow icon={HardHat} iconTone={i.isOverdue ? 'danger' : 'info'} chevron onPress={() => router.push(`/appliances/installations/${i.id}` as never)}
        title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{i.productName}</Text><StatusPill tone={st.tone}>{st.label}</StatusPill></Row>}
        subtitle={<View style={{ gap: 2 }}>
          <Text size="xs" tone="muted" numberOfLines={1}>{[i.customerName, serviceTypeOf(i.serviceType), i.installationNumber].join(' · ')}</Text>
          <Row gap={1} wrap>
            <Badge tone={i.scheduledDate ? 'neutral' : 'warning'}>{i.scheduledDate ? `${dayOnly(i.scheduledDate)} ${slotLabel(i.scheduledTimeSlot)}`.trim() : t('Abhi tay nahi')}</Badge>
            {!i.technicianName && !['COMPLETED', 'CANCELLED', 'FAILED'].includes(i.status) && <Badge tone="warning" icon={UserX}>{t('Banda nahi laga')}</Badge>}
            {i.isOverdue && <Badge tone="danger" icon={AlertTriangle}>{t('Date guzar gayi')}</Badge>}
          </Row>
        </View>}
        trailing={due > 0 ? <Text size="sm" weight="bold" tone="warning">{formatMoney(due)}</Text> : undefined} />
    </View>
  );
}

export function InstallationsScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('appliancesDesk');
  const [view, setView] = useState<View_>('open');
  const [search, setSearch] = useState('');
  const q = search.trim();

  const sum = useQuery({ queryKey: [KEYS.install, 'summary'], queryFn: () => installationsApi.summary() });
  const queue = useQuery({ queryKey: [KEYS.install, 'queue'], queryFn: () => installationsApi.queue(), enabled: view === 'open' });
  const today = useQuery({ queryKey: [KEYS.install, 'today'], queryFn: () => installationsApi.today(), enabled: view === 'today' });
  const paged = view === 'unpaid' || view === 'done' || view === 'all';
  const params = { search: q || undefined, limit: LIMIT, unpaidOnly: view === 'unpaid' || undefined, status: view === 'done' ? 'COMPLETED' : undefined };
  const list = usePaged([KEYS.install, 'paged', params], (page) => installationsApi.list({ ...params, page }).then(asPages), paged);
  const s = sum.data;

  const rows = useMemo(() => {
    const src = view === 'open' ? queue.data : view === 'today' ? today.data : list.items;
    const low = q.toLowerCase();
    return (src ?? []).filter((i) => !low || paged || [i.productName, i.customerName, i.customerPhone, i.installationNumber, i.serialNumber].some((x) => (x ?? '').toLowerCase().includes(low)));
  }, [view, queue.data, today.data, list.items, q, paged]);
  const active = view === 'open' ? queue : view === 'today' ? today : null;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={HardHat} tone="info" label={t('Khule kaam')} loading={sum.isLoading} value={String(s?.open ?? 0)} onPress={() => setView('open')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CalendarClock} tone="success" label={t('Aaj')} loading={sum.isLoading} value={String(s?.todayJobs ?? 0)} onPress={() => setView('today')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={UserX} tone={s?.unassigned ? 'warning' : 'neutral'} label={t('Banda nahi laga')} loading={sum.isLoading} value={String(s?.unassigned ?? 0)} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={AlertTriangle} tone={s?.overdue ? 'danger' : 'neutral'} label={t('Date guzar gayi')} loading={sum.isLoading} value={String(s?.overdue ?? 0)} hint={s?.month ? t('Baqi {{amount}}', { amount: formatMoney(s.month.outstanding) }) : undefined} />
      </Row>
      <ChipGroup value={view} onChange={(v) => setView(v as View_)} style={{ marginHorizontal: -th.space(4) }} options={VIEWS} />
      <OfflineNote feature="appliancesDesk" />
      <CachedNote query={sum} />
    </View>
  );

  return (
    <ListTemplate<Installation>
      title={t('Installations')}
      grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Customer, product, serial ya number…') }}
      summary={header}
      data={rows}
      loading={active ? active.isLoading : list.loading}
      error={active ? active.error : list.error}
      onRetry={() => (active ? void active.refetch() : list.refetch())}
      refreshing={active ? active.isRefetching : list.refreshing}
      onRefresh={() => { if (active) void active.refetch(); else list.refetch(); void sum.refetch(); }}
      onEndReached={paged ? list.loadMore : undefined}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => <InstallationRow i={item} />}
      empty={<EmptyState icon={HardHat} title={q ? t('Is search me koi kaam nahi') : t('Abhi koi installation nahi')} message={t('AC, geyser, washing machine ya TV lagane ki booking yahan aayegi.')} />}
      fab={can(P.SERVICE_JOBS_MANAGE) ? { icon: Plus, label: t('Nayi installation'), onPress: () => guard(() => router.push('/appliances/installations/new' as never)) } : undefined}
    />
  );
}
