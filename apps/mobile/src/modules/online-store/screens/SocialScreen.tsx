/**
 * Social media (web /online-store/social), the phone part: posts to do now
 * (the reminder list), the next two weeks of the calendar, and the "Post
 * karein" sheet. Planning, Nafaa AI and the creative maker stay on the web.
 * A reminder push opens this screen with `?post=<id>`.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, ExternalLink, Send, Share2 } from 'lucide-react-native';
import { formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, Button, EmptyState, IconButton, ListTemplate, PressableScale, Text, useTheme } from '@/design';
import { socialApi, type SocialPost } from '../api/social';
import { CommerceHero } from '../components/CommerceHero';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { Note } from '../components/bits';
import { PostNowSheet, PlatformDot } from '../components/social/PostNowSheet';
import { openOnWeb } from '../lib/device';

const KEY = ['online-social'] as const;
type Filter = 'due' | 'next' | 'posted';

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function SocialScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ post?: string }>();
  const [filter, setFilter] = useState<Filter>('due');
  const [open, setOpen] = useState<SocialPost | null>(null);

  const now = new Date();
  const from = dayKey(new Date(now.getTime() - 7 * 86_400_000));
  const to = dayKey(new Date(now.getTime() + 14 * 86_400_000));
  const due = useQuery({ queryKey: [...KEY, 'due'], queryFn: socialApi.due, refetchInterval: 60_000 });
  const cal = useQuery({ queryKey: [...KEY, 'list', from, to], queryFn: () => socialApi.list({ from, to }) });

  useEffect(() => {
    if (!params.post) return;
    socialApi.get(params.post).then(setOpen).catch(() => undefined);
    router.setParams({ post: undefined } as never);
  }, [params.post]);

  const items: SocialPost[] = filter === 'due'
    ? due.data?.items ?? []
    : filter === 'next'
      ? (cal.data?.items ?? []).filter((p) => p.status !== 'POSTED' && p.status !== 'IDEA' && p.scheduledAt && new Date(p.scheduledAt).getTime() > now.getTime())
      : (cal.data?.items ?? []).filter((p) => p.status === 'POSTED').reverse();
  const st = cal.data?.stats;
  const fest = cal.data?.upcomingFestivals?.[0];
  const q = filter === 'due' ? due : cal;

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <CommerceHero chip={t('Social media')} loading={cal.isLoading}
        stats={[
          { label: t('Abhi karni'), value: String(due.data?.items.length ?? 0) },
          { label: t('Is hafte'), value: String(st?.thisWeek ?? 0), hint: st ? t('{{count}} posted', { count: st.postedWeek }) : undefined },
          { label: t('Ready'), value: String(st?.ready ?? 0) },
          { label: t('Reh gayi'), value: String(st?.overdue ?? 0) },
        ]} />
      {fest && <Note tone="info" icon={CalendarDays} title={`${fest.name} · ${fest.date}${fest.approx ? ' *' : ''}`}>{fest.idea}</Note>}
    </View>
  );

  return (
    <>
      <ListTemplate
        title={t('Social media')}
        actions={<>
          <IconButton icon={ExternalLink} label={t('Calendar web par')} onPress={() => openOnWeb('/online-store/social')} />
          <OnlineMenuButton current="/online/social" />
        </>}
        filters={{ value: filter, onChange: (v) => setFilter(v as Filter), options: [
          { value: 'due', label: t('Abhi') }, { value: 'next', label: t('Aage') }, { value: 'posted', label: t('Posted') },
        ] }}
        summary={summary}
        data={items}
        loading={q.isLoading}
        error={q.isError ? q.error : undefined}
        onRetry={q.refetch}
        refreshing={q.isRefetching}
        onRefresh={() => { void due.refetch(); void cal.refetch(); }}
        keyExtractor={(p) => p.id}
        renderItem={({ item: p }) => (
          <PressableScale onPress={() => setOpen(p)}>
            <View style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(3), gap: th.space(1.5) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                <View style={{ flexDirection: 'row', gap: 2 }}>{p.platforms.map((pl) => <PlatformDot key={pl} p={pl} size={20} />)}</View>
                <Text size="base" weight="bold" numberOfLines={1} style={{ flex: 1 }}>{p.title || p.caption.split('\n')[0] || t('Post')}</Text>
                {p.status === 'POSTED' ? <Badge tone="success" icon={CheckCircle2}>{t('Posted')}</Badge>
                  : p.scheduledAt && new Date(p.scheduledAt).getTime() < now.getTime() ? <Badge tone="warning">{t('Waqt ho gaya')}</Badge>
                  : <Badge tone="info">{p.status === 'READY' ? t('Ready') : t('Draft')}</Badge>}
              </View>
              <Text size="xs" tone="muted">{p.scheduledAt ? formatDateTime(p.scheduledAt) : t('Tareekh nahi')}</Text>
              {!!p.caption && <Text size="sm" tone="secondary" numberOfLines={2}>{p.caption}</Text>}
              {p.status !== 'POSTED' && (
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ flex: 1 }} />
                  <Button size="sm" variant="success" icon={Send} onPress={() => setOpen(p)}>{t('Post karein')}</Button>
                </View>
              )}
            </View>
          </PressableScale>
        )}
        empty={<EmptyState icon={Share2} title={filter === 'due' ? t('Abhi koi post nahi') : t('Kuch nahi')}
          message={t('Posts web par calendar me banayein — waqt par yahan yaad aayegi.')} />}
      />
      <PostNowSheet key={open?.id ?? 'none'} post={open} onClose={() => setOpen(null)} />
    </>
  );
}
