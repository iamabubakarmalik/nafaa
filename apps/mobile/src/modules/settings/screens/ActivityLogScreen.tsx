/**
 * Activity log: who did what and when, as readable sentences, newest first.
 * Period chips, and a filter sheet for person, action and record type (web
 * ActivityLogPage). Tap a row for details and the record's own screen.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Activity, SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { businessDayKey, formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { Button, EmptyState, IconButton, Icon, ListRow, ListTemplate, Select, Sheet, Text, useTheme } from '@/design';
import { activityApi, type ActivityEntry, type ActivityFilters } from '../api/settings';
import { actionLabel, detailOf, entityLabel, iconOf, routeOf, sentence } from '../lib/activityMeta';
import { OfflineNote, ownerOnly } from '../components/SettingsParts';

type Period = 'today' | 'week' | 'month' | 'all';
const PAGE = 40;

function ActivityLog() {
  const th = useTheme();
  const online = useOnlineStatus();
  const [period, setPeriod] = useState<Period>('week');
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [sheet, setSheet] = useState(false);
  const [open, setOpen] = useState<ActivityEntry | null>(null);

  const filters: ActivityFilters = useMemo(() => {
    const today = businessDayKey();
    const back = (n: number) => businessDayKey(new Date(Date.now() - n * 86_400_000));
    const from = period === 'today' ? today : period === 'week' ? back(6) : period === 'month' ? back(29) : undefined;
    return { from, to: period === 'all' ? undefined : today, userId: userId || undefined, action: action || undefined, entity: entity || undefined };
  }, [period, userId, action, entity]);

  const q = useInfiniteQuery({
    queryKey: ['activity-log', 'feed', filters],
    queryFn: ({ pageParam }) => activityApi.feed(filters, pageParam, PAGE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: online,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const facets = q.data?.pages[0]?.facets;
  const active = [userId, action, entity].filter(Boolean).length;

  return (
    <>
      <ListTemplate
        title={t('Activity log')}
        subtitle={q.data ? t('{{count}} entries', { count: q.data.pages[0]?.total ?? 0 }) : undefined}
        actions={<IconButton icon={SlidersHorizontal} label={t('Filters')} badge={active || undefined} onPress={() => setSheet(true)} />}
        filters={{ value: period, onChange: (v) => setPeriod(v as Period), options: [{ value: 'today', label: t('Aaj') }, { value: 'week', label: t('7 din') }, { value: 'month', label: t('30 din') }, { value: 'all', label: t('Sab') }] }}
        summary={!online ? <OfflineNote /> : undefined}
        data={items}
        loading={q.isLoading && online}
        error={q.error}
        onRetry={q.refetch}
        refreshing={q.isRefetching}
        onRefresh={q.refetch}
        onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage(); }}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => {
          const { icon, tone } = iconOf(item);
          return (
            <ListRow
              leading={<View style={{ width: 36, height: 36, borderRadius: th.radius('md'), backgroundColor: th.colors[tone === 'muted' ? 'neutral' : tone].soft, alignItems: 'center', justifyContent: 'center' }}><Icon icon={icon} size={18} color={th.colors[tone === 'muted' ? 'neutral' : tone].text} /></View>}
              title={sentence(item)} subtitle={`${formatDateTime(item.createdAt)}${detailOf(item) ? ` · ${detailOf(item)}` : ''}`}
              onPress={() => setOpen(item)}
            />
          );
        }}
        empty={<EmptyState icon={Activity} title={t('Is period me koi activity nahi')} message={active ? t('Filter badal kar ya period barha kar dekhein') : t('Branch, staff, settings ya PIN me badlav yahan likhe jate hain')} />}
      />

      <Sheet open={sheet} onClose={() => setSheet(false)} title={t('Filters')}
        footer={<Button variant="secondary" fullWidth onPress={() => { setUserId(''); setAction(''); setEntity(''); setSheet(false); }}>{t('Filter hatayein')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <Select label={t('Banda')} value={userId} onChange={setUserId} options={[{ value: '', label: t('Sab log') }, ...(facets?.users ?? []).map((u) => ({ value: u.id, label: u.name, description: t('{{count}} kaam', { count: u.count }) }))]} />
          <Select label={t('Kaam')} value={action} onChange={setAction} options={[{ value: '', label: t('Har kaam') }, ...(facets?.actions ?? []).map((a) => ({ value: a.key, label: actionLabel(a.key), description: String(a.count) }))]} />
          <Select label={t('Record ki type')} value={entity} onChange={setEntity} options={[{ value: '', label: t('Har record') }, ...(facets?.entities ?? []).map((x) => ({ value: x.key, label: entityLabel(x.key), description: String(x.count) }))]} />
        </View>
      </Sheet>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? sentence(open) : undefined}
        footer={open && routeOf(open) ? <Button fullWidth onPress={() => { const r = routeOf(open)!; setOpen(null); router.push(r.href as never); }}>{routeOf(open)!.label}</Button> : undefined}>
        {open && (
          <View style={{ gap: th.space(2) }}>
            <Text size="sm" tone="muted">{formatDateTime(open.createdAt)}</Text>
            <Text size="sm">{detailOf(open)}</Text>
            {!!open.user?.role && <Text size="xs" tone="muted">{open.user.role}</Text>}
          </View>
        )}
      </Sheet>
    </>
  );
}

export const ActivityLogScreen = ownerOnly(ActivityLog, 'Activity log');
