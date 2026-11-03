/**
 * Notifications: everything the app told this person, grouped by business
 * day. Tabs for the daily summary, sales, online orders, stock and alerts;
 * filter by read state, period and text; open the linked screen, send the
 * daily summary on WhatsApp, mark read or unread, delete, and act on many at
 * once (long-press a row).
 */

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell, BellOff, CheckCheck, CheckSquare, ExternalLink, Eye, EyeOff, MessageCircle, Package, Trash2, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { businessDayKey, formatRelative, formatTime } from '@/core/format';
import { t } from '@/core/i18n';
import { useOfflineManifest } from '@/core/offline';
import { Button, Chip, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, Row, StatusPill, SwipeRow, Text, confirm, toast, useDebouncedValue, useTheme } from '@/design';
import { notificationsApi, type AppNotification, type NotificationFeed, type NotificationFeedFilters, type NotificationGroup } from '../api/notifications';
import { routeForNotificationLink } from '../lib/links';
import { GROUPS, isSummary, metaOf, waUrlOf } from '../lib/meta';

type Group = 'all' | NotificationGroup;
type Period = 'all' | 'today' | '7' | '30';
type Item = { kind: 'day'; key: string; label: string; unread: number } | { kind: 'n'; n: AppNotification };

const PAGE = 40;
const DAY = 86_400_000;

export function NotificationsScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const startHour = useOfflineManifest().data?.dayStartHour ?? 0;

  const [group, setGroup] = useState<Group>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [period, setPeriod] = useState<Period>('all');
  const [search, setSearch] = useState('');
  const needle = useDebouncedValue(search.trim(), 300);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filters: NotificationFeedFilters = useMemo(() => {
    const today = businessDayKey(Date.now(), startHour);
    const from = period === 'today' ? today : period === '7' ? businessDayKey(Date.now() - 6 * DAY, startHour) : period === '30' ? businessDayKey(Date.now() - 29 * DAY, startHour) : undefined;
    return { ...(group !== 'all' && { group }), ...(unreadOnly && { unreadOnly: true }), ...(from && { from, to: today }), ...(needle && { search: needle }) };
  }, [group, unreadOnly, period, needle, startHour]);

  const q = useInfiniteQuery({
    queryKey: ['notifications', 'feed', filters],
    queryFn: ({ pageParam }) => notificationsApi.feed(filters, pageParam, PAGE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: NotificationFeed) => last.nextCursor ?? undefined,
    placeholderData: (p) => p,
    refetchInterval: 60_000,
  });
  const first = q.data?.pages[0];
  const counts = first?.counts;
  const notes = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);

  const items = useMemo<Item[]>(() => {
    const today = businessDayKey(Date.now(), startHour);
    const yesterday = businessDayKey(Date.now() - DAY, startHour);
    const out: Item[] = [];
    let last = '';
    for (const n of notes) {
      const key = businessDayKey(new Date(n.createdAt), startHour);
      if (key !== last) {
        last = key;
        const unread = notes.filter((x) => businessDayKey(new Date(x.createdAt), startHour) === key && !x.isRead).length;
        out.push({ kind: 'day', key, unread, label: key === today ? t('Aaj') : key === yesterday ? t('Kal') : formatRelative(new Date(`${key}T12:00:00+05:00`)) });
      }
      out.push({ kind: 'n', n });
    }
    return out;
  }, [notes, startHour]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const fail = (e: unknown) => toast.error(apiErrorMessage(e, t('Nahi hua — internet check karein')));
  const setRead = useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) => { if (on) await notificationsApi.markRead(id); else await notificationsApi.markUnread(id); },
    onSuccess: refresh, onError: fail,
  });
  const remove = useMutation({ mutationFn: (id: string) => notificationsApi.remove(id), onSuccess: () => { toast.success(t('Mita di')); void refresh(); }, onError: fail });
  const allRead = useMutation({ mutationFn: () => notificationsApi.markAllRead(), onSuccess: () => { toast.success(t('Sab parh li gayin')); void refresh(); }, onError: fail });
  const bulk = useMutation({
    mutationFn: (action: 'read' | 'unread' | 'delete') => notificationsApi.bulk([...(picked ?? [])], action),
    onSuccess: (r, action) => {
      toast.success(action === 'delete' ? t('{{count}} mita di gayin', { count: r.count }) : t('{{count}} {{value}} ho gayin', { count: r.count, value: action === 'read' ? t('parhi hui') : t('bina parhi') }));
      setPicked(null); void refresh();
    },
    onError: fail,
  });
  const stockCheck = useMutation({ mutationFn: () => notificationsApi.checkLowStock(), onSuccess: () => { toast.success(t('Stock check ho gaya')); void refresh(); }, onError: fail });

  const toggle = (id: string) => setPicked((s) => { const x = new Set(s ?? []); if (x.has(id)) x.delete(id); else x.add(id); return x.size ? x : null; });

  const open = (n: AppNotification) => {
    if (picked) return toggle(n.id);
    if (!n.isRead) setRead.mutate({ id: n.id, on: true });
    const route = routeForNotificationLink(n.link);
    if (route) router.push(route as never);
    else setExpanded(expanded === n.id ? null : n.id);
  };

  const askDelete = async (n: AppNotification) => {
    if (await confirm({ title: t('Mitayein'), message: n.title, tone: 'danger', confirmLabel: t('Mitayein') })) remove.mutate(n.id);
  };

  // Leaving selection when the list changes underneath it.
  useEffect(() => { if (picked && !notes.length) setPicked(null); }, [notes.length, picked]);

  const hasFilters = unreadOnly || period !== 'all' || !!needle || group !== 'all';
  const actions = picked ? (
    <Row gap={1}>
      <Text size="sm" weight="semibold">{t('{{size}} chuni', { size: picked.size })}</Text>
      <IconButton icon={Eye} label={t('Parh liya')} disabled={bulk.isPending} onPress={() => bulk.mutate('read')} />
      <IconButton icon={EyeOff} label={t('Bina parha')} disabled={bulk.isPending} onPress={() => bulk.mutate('unread')} />
      <IconButton icon={Trash2} label={t('Mitayein')} variant="danger" disabled={bulk.isPending} onPress={() => bulk.mutate('delete')} />
      <IconButton icon={X} label={t('Chunna band')} onPress={() => setPicked(null)} />
    </Row>
  ) : (
    <Row gap={1}>
      <IconButton icon={CheckSquare} label={t('Chunein')} onPress={() => setPicked(new Set())} />
      <IconButton icon={CheckCheck} label={t('Sab parh liye')} disabled={!counts?.unread || allRead.isPending} onPress={() => allRead.mutate()} />
    </Row>
  );

  return (
    <ListTemplate<Item>
      title={t('Notifications')}
      subtitle={counts ? t('{{unread}} bina parhe', { unread: counts.unread }) : undefined}
      actions={actions}
      search={{ value: search, onChange: setSearch, placeholder: t('Notification me search…') }}
      summary={(
        <View style={{ gap: th.space(2) }}>
          <ChipGroup value={group} onChange={(v) => { setGroup(v as Group); setPicked(null); }} style={{ marginHorizontal: -th.space(4) }}
            options={GROUPS.map((g) => ({ value: g.id, label: t(g.label), icon: g.icon, count: counts ? (g.id === 'all' ? (unreadOnly ? counts.unread : counts.all) : counts.groups[g.id]) : undefined }))} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -th.space(4) }} contentContainerStyle={{ gap: th.space(2), paddingHorizontal: th.space(4) }}>
            <Chip label={t('Sirf bina parhe')} selected={unreadOnly} onPress={() => setUnreadOnly(!unreadOnly)} />
            {([['all', t('Sab waqt')], ['today', t('Aaj')], ['7', t('7 din')], ['30', t('30 din')]] as Array<[Period, string]>).map(([v, label]) => (
              <Chip key={v} label={label} selected={period === v} onPress={() => setPeriod(v)} />
            ))}
          </ScrollView>
          {group === 'stock' && <Button size="sm" variant="secondary" icon={Package} loading={stockCheck.isPending} onPress={() => stockCheck.mutate()}>{t('Kam stock abhi check karein')}</Button>}
        </View>
      )}
      data={items}
      loading={q.isLoading}
      error={q.isError && !first ? q.error : undefined}
      onRetry={() => void q.refetch()}
      refreshing={q.isRefetching && !q.isFetchingNextPage}
      onRefresh={() => void q.refetch()}
      onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage(); }}
      keyExtractor={(i) => (i.kind === 'day' ? `d-${i.key}` : i.n.id)}
      renderItem={({ item }) => {
        if (item.kind === 'day') {
          return (
            <Row justify="between" style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(2), backgroundColor: th.colors.surfaceMuted }}>
              <Text size="sm" weight="semibold">{item.label}</Text>
              {item.unread > 0 && <Text size="xs" tone="muted">{t('{{count}} bina parhe', { count: item.unread })}</Text>}
            </Row>
          );
        }
        const n = item.n;
        const { icon, tone } = metaOf(n);
        const wa = waUrlOf(n);
        const isOpen = expanded === n.id || isSummary(n);
        const selected = picked?.has(n.id) ?? false;
        return (
          <SwipeRow enabled={!picked} end={[
            { icon: n.isRead ? EyeOff : Eye, label: n.isRead ? t('Bina parha') : t('Parh liya'), tone: 'brand', onPress: () => setRead.mutate({ id: n.id, on: !n.isRead }) },
            { icon: Trash2, label: t('Mitayein'), tone: 'danger', onPress: () => void askDelete(n) },
          ]}>
            <View style={{ backgroundColor: selected ? th.colors.brand.soft : n.isRead ? th.colors.surface : th.colors.brand.soft + '55' }}>
              <ListRow
                icon={icon}
                iconTone={tone}
                title={<Text weight={n.isRead ? 'medium' : 'semibold'}>{n.title}</Text>}
                subtitle={<Text size="sm" tone="muted" numberOfLines={isOpen ? undefined : 2}>{n.message}</Text>}
                overline={formatTime(n.createdAt)}
                trailing={selected ? <CheckSquare size={20} color={th.colors.brand.solid} /> : !n.isRead ? <StatusPill tone="brand" dot>{t('Naya')}</StatusPill> : undefined}
                selected={selected}
                onPress={() => open(n)}
                onLongPress={() => toggle(n.id)}
              />
              {!picked && (wa || n.link) ? (
                <Row gap={2} style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(3) }}>
                  {routeForNotificationLink(n.link) ? <Button size="sm" variant="secondary" icon={ExternalLink} onPress={() => open(n)}>{t('Kholein')}</Button> : null}
                  {wa ? <Button size="sm" variant="success" icon={MessageCircle} onPress={() => void Linking.openURL(wa)}>{t('WhatsApp par bhejein')}</Button> : null}
                </Row>
              ) : null}
            </View>
          </SwipeRow>
        );
      }}
      empty={(
        <EmptyState icon={hasFilters ? BellOff : Bell} title={hasFilters ? t('Is filter me koi notification nahi') : t('Koi notification nahi')}
          message={unreadOnly ? t('Sab parh li gayi hain') : t('Nayi sale, kam stock, online order ya din ka hisaab aaye ga to yahan dikhega')}
          action={hasFilters ? <Button variant="secondary" onPress={() => { setGroup('all'); setUnreadOnly(false); setPeriod('all'); setSearch(''); }}>{t('Filter hatayein')}</Button> : undefined} />
      )}
    />
  );
}
