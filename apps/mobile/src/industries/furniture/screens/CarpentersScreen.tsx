/**
 * Karigars (carpenters) of the workshop (web CarpentersPage): who is making
 * what, how much is on each bench, and their pay. A karigar is switched off,
 * never deleted.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CheckCircle2, Hammer, Plus, Power, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Card, ChipGroup, EmptyState, HBarList, ListRow, ListTemplate, Text, useTheme } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { Meta, RowCard, StatGrid } from '../../_shared/trade/kit';
import { carpentersApi, type FurnitureCarpenter } from '../api';
import { FURNITURE_KEYS } from '../meta';

type Tab = 'active' | 'off' | 'analytics';

export function CarpentersScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost } = useCostMask();
  const { guard } = useDeskOnline('furnitureDesk');
  const canManage = can(P.STAFF_MANAGE);
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const q = useQuery({ queryKey: [FURNITURE_KEYS.carpenters, 'list', search.trim()], queryFn: () => carpentersApi.list({ search: search.trim() || undefined }), placeholderData: (p) => p });
  const all = q.data ?? [];
  const active = all.filter((c) => c.isActive);
  const rows = tab === 'off' ? all.filter((c) => !c.isActive) : active;
  const busy = active.reduce((s, c) => s + c.activeProjects, 0);
  const free = active.filter((c) => !c.activeProjects).length;
  const byRevenue = useMemo(() => active.map((c) => ({ key: c.id, label: c.name, count: c.completedProjects, value: Number(c.totalRevenue) || 0 })).sort((a, b) => b.value - a.value).slice(0, 12), [active]);
  const byLoad = useMemo(() => active.map((c) => ({ key: c.id, label: c.name, value: c.activeProjects })).sort((a, b) => b.value - a.value).slice(0, 12), [active]);

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <StatGrid items={[
        { icon: Users, tone: 'warning', label: t('Kaam par'), loading: q.isLoading, value: String(active.length), onPress: () => setTab('active') },
        { icon: Hammer, tone: 'accent', label: t('Haath me kaam'), loading: q.isLoading, value: String(busy), hint: free ? t('{{free}} khali', { free }) : t('Sab masroof') },
        { icon: CheckCircle2, tone: 'success', label: t('Mukammal kaam'), loading: q.isLoading, value: String(active.reduce((s, c) => s + c.completedProjects, 0)) },
        { icon: Power, tone: 'neutral', label: t('Band'), loading: q.isLoading, value: String(all.length - active.length), onPress: () => setTab('off') },
      ]} />
      <OfflineNote feature="furnitureDesk" />
      <CachedNote query={q} />
      <ChipGroup value={tab} onChange={(v) => setTab(v as Tab)} style={{ marginHorizontal: -th.space(4) }} options={[{ value: 'active', label: `${t('Kaam par')} · ${active.length}` }, { value: 'off', label: t('Band') }, { value: 'analytics', label: t('Analytics') }]} />
      {tab === 'analytics' && (
        <View style={{ gap: th.space(3) }}>
          <Card title={t('Kis ne kitna kaam diya (bill qeemat)')}><HBarList colorful rows={byRevenue.map((r) => ({ key: r.key, label: r.label, value: r.value, display: <Text size="xs" tone="muted">{`${r.count} · ${formatMoney(r.value)}`}</Text> }))} /></Card>
          <Card title={t('Haath me kaam (orders)')}><HBarList colorful rows={byLoad.map((r) => ({ key: r.key, label: r.label, value: r.value, display: <Text size="xs" tone="muted">{t('{{n}} order', { n: r.value })}</Text> }))} /></Card>
        </View>
      )}
    </View>
  );

  return (
    <ListTemplate<FurnitureCarpenter>
      title={t('Karigar')}
      subtitle={t('Kaun kya bana raha hai, kitna kaam haath me, aur pay')}
      grouped={false}
      search={tab !== 'analytics' ? { value: search, onChange: setSearch, placeholder: t('Naam, phone, code ya CNIC…') } : undefined}
      summary={summary}
      data={tab === 'analytics' ? [] : rows}
      loading={q.isLoading}
      error={q.data ? null : q.error}
      onRetry={() => void q.refetch()}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      keyExtractor={(c) => c.id}
      renderItem={({ item: c }) => (
        <RowCard>
          <ListRow
            title={<Text weight="semibold" numberOfLines={1}>{c.name}</Text>}
            subtitle={<View style={{ gap: 3 }}>
              <Meta parts={[c.employeeCode, c.phone, c.specializations.join(', '), c.workshopLocation]} />
              <Text size="xs" tone="secondary">{c.dailyWage ? t('{{dailyWage}}/din', { dailyWage: cost(c.dailyWage) }) : c.perProjectRate ? t('{{perProjectRate}}/kaam', { perProjectRate: cost(c.perProjectRate) }) : t('Pay likha nahi')}</Text>
            </View>}
            trailing={<View style={{ alignItems: 'flex-end', gap: 3 }}>
              <Text size="sm" weight="semibold">{t('{{activeProjects}} haath me', { activeProjects: c.activeProjects })}</Text>
              <Text size="2xs" tone="muted">{t('{{completedProjects}} mukammal', { completedProjects: c.completedProjects })}</Text>
              {c.isActive ? <Badge tone={c.activeProjects ? 'warning' : 'success'}>{c.activeProjects ? t('Masroof') : t('Khali')}</Badge> : <Badge tone="neutral">{t('Band')}</Badge>}
            </View>}
            chevron
            onPress={() => router.push(`/furniture/carpenters/${c.id}` as never)}
          />
        </RowCard>
      )}
      empty={tab === 'analytics' ? undefined : <EmptyState icon={Hammer} title={tab === 'off' ? t('Koi band karigar nahi') : t('Koi karigar nahi')} message={t('Workshop ke karigar daalein — order inhi ko diye jate hain.')} />}
      fab={canManage && tab !== 'analytics' ? { icon: Plus, label: t('Karigar'), onPress: () => guard(() => router.push('/furniture/carpenters/new' as never)) } : undefined}
    />
  );
}
