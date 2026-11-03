/** Technicians (web TechniciansPage): who is free, who has too much, ratings, the month's work and commission; plus the leaderboard. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { HardHat, Phone, Plus, Star, UserCheck, Users, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Card, ChipGroup, EmptyState, HBarList, IconButton, ListRow, ListTemplate, Row, Segmented, Skeleton, StatTile, Text, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, callPhone, useDeskOnline } from '../../_shared/trade/desk';
import { techniciansApi, type TechnicianRow, type TechnicianSummary } from '../api';
import { KEYS, catLabel, groupLabel, groupOf } from '../meta';

type Tab = 'list' | 'analytics';
type Show = 'active' | 'inactive' | 'all';

export function TechniciansScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('appliancesDesk');
  const [tab, setTab] = useState<Tab>('list');
  const [show, setShow] = useState<Show>('active');
  const [search, setSearch] = useState('');
  const q = search.trim();
  const list = useQuery({ queryKey: [KEYS.tech, 'list', show, q], queryFn: () => techniciansApi.list({ active: show === 'all' ? undefined : show === 'active', search: q || undefined }), placeholderData: (p) => p });
  const sum = useQuery({ queryKey: [KEYS.tech, 'summary'], queryFn: () => techniciansApi.summary() });
  const s = sum.data;
  const rows = list.data ?? [];

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={UserCheck} tone="success" label={t('Free')} loading={sum.isLoading} value={String(s?.free ?? 0)} hint={t('Koi kaam khula nahi')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={HardHat} tone={s?.overloaded ? 'danger' : 'neutral'} label={t('Zyada kaam')} loading={sum.isLoading} value={String(s?.overloaded ?? 0)} hint={t('Kisi aur ko dein')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Star} tone="warning" label={t('Team rating')} loading={sum.isLoading} value={s?.avgTeamRating ? s.avgTeamRating.toFixed(1) : '—'} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Wallet} tone="accent" label={t('Commission (mahina)')} loading={sum.isLoading} value={formatMoney(s?.month.commission ?? 0)} hint={t('{{jobs}} kaam', { jobs: s?.month.jobs ?? 0 })} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'list', label: t('Team') }, { value: 'analytics', label: t('Analytics') }]} />
      {tab === 'list' && <ChipGroup value={show} onChange={(v) => setShow(v as Show)} style={{ marginHorizontal: -th.space(4) }} options={[{ value: 'active', label: t('Active') }, { value: 'inactive', label: t('Band') }, { value: 'all', label: t('Sab') }]} />}
      <OfflineNote feature="appliancesDesk" />
      <CachedNote query={sum} />
      {tab === 'analytics' && <Leaderboard s={s} />}
    </View>
  );

  return (
    <ListTemplate<TechnicianRow>
      title={t('Technicians')} grouped={false}
      search={tab === 'list' ? { value: search, onChange: setSearch, placeholder: t('Naam, phone, code, ilaqa…') } : undefined}
      summary={header} data={tab === 'list' ? rows : []}
      loading={tab === 'list' && list.isLoading} error={list.data ? null : list.error} onRetry={() => void list.refetch()}
      refreshing={list.isRefetching} onRefresh={() => { void list.refetch(); void sum.refetch(); }}
      keyExtractor={(x) => x.id}
      renderItem={({ item: x }) => (
        <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, opacity: x.isActive ? 1 : 0.6 }}>
          <ListRow chevron onPress={() => router.push(`/appliances/technicians/${x.id}` as never)}
            icon={Users} iconTone={x.openJobs >= 5 ? 'danger' : x.openJobs ? 'warning' : 'success'}
            title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{x.name}</Text><Text size="2xs" tone="muted" ltr>{x.employeeCode}</Text>{!x.isActive && <Badge>{t('Band')}</Badge>}</Row>}
            subtitle={<View style={{ gap: 2 }}>
              <Text size="xs" tone="muted" numberOfLines={1}>{[x.phone, x.currentZone, ...[...new Set(x.categoriesExpertise.map(groupOf))].slice(0, 3).map(groupLabel)].filter(Boolean).join(' · ')}</Text>
              <Text size="xs" tone="muted">{x.openJobs ? t('{{openJobs}} kaam khule', { openJobs: x.openJobs }) : t('Free')} · {t('{{completedJobs}} mukammal', { completedJobs: x.completedJobs })}{x.avgRating ? ` · ★ ${Number(x.avgRating).toFixed(1)}` : ''}</Text>
            </View>}
            trailing={<IconButton icon={Phone} label={t('Call')} onPress={() => callPhone(x.phone)} />} />
        </View>
      )}
      empty={<EmptyState icon={Users} title={q ? t('Koi nahi mila') : t('Abhi koi technician nahi')} message={t('Installation aur repair ke liye apne bande yahan jorein — phir har kaam par lagayein.')} />}
      fab={can(P.STAFF_MANAGE) ? { icon: Plus, label: t('Naya technician'), onPress: () => guard(() => router.push('/appliances/technicians/new' as never)) } : undefined}
    />
  );
}

function Leaderboard({ s }: { s?: TechnicianSummary }) {
  const { cost } = useCostMask();
  const rows = useMemo(() => [...(s?.leaderboard ?? [])].sort((a, b) => b.monthRevenue - a.monthRevenue), [s]);
  if (!s) return <Skeleton height={200} />;
  if (!rows.length) return <Text size="sm" tone="muted">{t('Abhi kuch nahi')}</Text>;
  return (
    <Card title={t('Is mahine ki kamai')}>
      <HBarList colorful rows={rows.map((r) => ({ key: r.id, label: r.name, value: r.monthRevenue, display: <Text size="xs" tone="muted">{`${r.monthJobs} · ${cost(r.monthRevenue)}`}</Text> }))} />
    </Card>
  );
}
