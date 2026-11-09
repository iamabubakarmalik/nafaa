/**
 * Online store home (web CommerceHomePage): today's numbers, the work
 * waiting in each status (a tap opens the board on that status), the team
 * queue, the last 30 days, connected channels and every online screen.
 * Later sections register through lib/extensions.
 */

import { View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Globe, PackagePlus, ShoppingBag, UserRound } from 'lucide-react-native';
import { formatMoney, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import {
  Badge, Card, HeroButton, Icon, ListGroup, ListRow, PressableScale, Screen, SectionHeader, Skeleton, StatTile, Text, useTheme,
} from '@/design';
import { commerceApi } from '../api/board';
import { ordersApi } from '../api/online';
import { ChannelLogo } from '../components/BrandLogo';
import { CommerceHero, useStoreList } from '../components/CommerceHero';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { SavedDataNote } from '../components/bits';
import { WORK_KEYS, boardEntry } from '../lib/board';
import { getHomeSections } from '../lib/extensions';
import { COMMERCE_GROUPS, type OnlineLink } from '../lib/nav';
import { KEYS } from '../lib/online';
import { periodRange } from '../lib/period';
import { openOnWeb } from '../lib/device';

const goBoard = (key: string, extra = '') => router.push(`/online/orders?board=${key}${extra}` as never);

export function CommerceHomeScreen() {
  const th = useTheme();
  const can = usePermission();
  const canManage = can(PERMISSIONS.ONLINE_ORDERS_MANAGE);
  const listQ = useStoreList();
  const month = periodRange('month')!;
  const reportQ = useQuery({ queryKey: [...KEYS.report, month.from, month.to, 'home'], queryFn: () => ordersApi.report(month), staleTime: 5 * 60_000 });
  const channelsQ = useQuery({ queryKey: KEYS.channels, queryFn: ordersApi.channels, staleTime: 5 * 60_000 });
  const teamQ = useQuery({ queryKey: [...KEYS.orders, 'team-queue'], queryFn: commerceApi.team, refetchInterval: 60_000 });
  const list = listQ.data;
  const board = list?.boardCounts ?? {};
  const r = reportQ.data?.totals;
  const channels = (channelsQ.data ?? []).filter((c) => c.type !== 'MANUAL');
  const team = teamQ.data;
  const refresh = () => { void listQ.refetch(); void reportQ.refetch(); void channelsQ.refetch(); void teamQ.refetch(); };
  const allowed = (l: OnlineLink) => l.href !== '/online' && can(l.permission) && (!l.alsoNeeds || can(l.alsoNeeds));

  return (
    <Screen title={t('Online store')} onRefresh={refresh} refreshing={listQ.isRefetching}
      actions={<OnlineMenuButton current="/online" />}>
      <View style={{ gap: th.space(4) }}>
        <CommerceHero list={list} loading={listQ.isLoading} chip={t('Aaj')}
          meta={channels.length ? t('{{count}} channel jore hue · sab orders, stock aur courier yahin se', { count: channels.length }) : t('Apni website, Shopify ya Daraz joren — sab kuch Nafaa se chalayein')}
          actions={<>
            {canManage && <HeroButton icon={PackagePlus} onPress={() => router.push('/online/orders/new' as never)}>{t('Add order')}</HeroButton>}
            <HeroButton icon={ShoppingBag} onPress={() => router.push('/online/orders' as never)}>{t('Orders')}</HeroButton>
          </>} />
        <SavedDataNote query={listQ} />

        <View style={{ gap: th.space(2) }}>
          <SectionHeader title={t('Aaj ka kaam')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            {WORK_KEYS.map((k) => {
              const e = boardEntry(k)!;
              const n = board[k];
              const c = th.colors[e.tone];
              return (
                <PressableScale key={k} onPress={() => goBoard(k)} accessibilityLabel={`${t(e.label)} ${n ?? 0}`}
                  style={{
                    width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: th.space(2.5), padding: th.space(3), borderRadius: th.radius('xl'),
                    backgroundColor: th.colors.surface, borderWidth: 1, borderColor: th.colors.border, opacity: n ? 1 : 0.7,
                  }}>
                  <View style={{ width: 34, height: 34, borderRadius: th.radius('md'), alignItems: 'center', justifyContent: 'center', backgroundColor: c.soft }}>
                    <Icon icon={e.icon} size={16} color={c.text} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" weight="semibold" numberOfLines={1}>{t(e.label)}</Text>
                    <Text size="2xs" tone="muted" numberOfLines={1}>{t(e.hint)}</Text>
                  </View>
                  {listQ.isLoading ? <Skeleton width={18} height={18} /> : <Text size="lg" weight="bold" ltr>{n ?? 0}</Text>}
                </PressableScale>
              );
            })}
          </View>
        </View>

        {team && team.staff.length > 0 && (
          <View style={{ gap: th.space(2) }}>
            <SectionHeader title={t('Team')} />
            <ListGroup>
              {team.staff.filter((s) => s.active || s.open).map((s) => (
                <ListRow key={s.userId} dense icon={UserRound} iconTone={s.userId === team.me ? 'brand' : 'neutral'}
                  title={s.userId === team.me ? t('{{name}} (aap)', { name: s.name }) : s.name}
                  subtitle={t('{{open}} khule · {{due}} follow-up · aaj {{done}} mukammal', { open: s.open, due: s.followUpsDue, done: s.doneToday })}
                  trailing={s.followUpsDue > 0 ? <Badge tone="danger">{s.followUpsDue}</Badge> : undefined} chevron
                  onPress={() => goBoard('ALL', `&assignedTo=${s.userId === team.me ? 'me' : s.userId}`)} />
              ))}
              {team.unassigned > 0 && (
                <ListRow dense icon={UserRound} title={t('Kisi ke zimme nahi')} trailing={<Badge tone="warning">{team.unassigned}</Badge>} chevron
                  onPress={() => goBoard('ALL', '&assignedTo=none')} />
              )}
            </ListGroup>
          </View>
        )}

        <View style={{ gap: th.space(2) }}>
          <SectionHeader title={t('Pichhle 30 din')} action={<Text size="sm" weight="semibold" tone="brand" onPress={() => router.push('/online/reports' as never)}>{t('Poori report')}</Text>} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            <StatTile style={{ width: '48.5%' }} loading={!r} tone="success" label={t('Online sale')} value={formatMoney(r?.netValue ?? 0)} hint={t('{{count}} order', { count: r?.netOrders ?? 0 })} />
            <StatTile style={{ width: '48.5%' }} loading={!r} tone="info" label={t('Delivery rate')} value={`${r?.deliveryRate ?? 0}%`} hint={t('{{count}} deliver hue', { count: r?.delivered ?? 0 })} />
            <StatTile style={{ width: '48.5%' }} loading={!r} tone="danger" label={t('RTO')} value={`${r?.rtoRate ?? 0}%`} hint={t('{{count}} wapas', { count: r?.returned ?? 0 })} />
            <StatTile style={{ width: '48.5%' }} loading={!r} tone="brand" label={t('Ausat order')} value={formatMoney(r?.avgOrderValue ?? 0)} hint={t('{{count}} customer', { count: r?.customers ?? 0 })} />
          </View>
        </View>

        <View style={{ gap: th.space(2) }}>
          <SectionHeader title={t('Channels')} />
          {channels.length ? (
            <ListGroup>
              {channels.map((c) => (
                <ListRow key={c.id} dense leading={<ChannelLogo type={c.type} platform={c.platform} size={30} />} title={c.displayName}
                  subtitle={c.lastOrderAt ? t('Aakhri order {{when}}', { when: formatRelative(c.lastOrderAt) }) : t('Abhi koi order nahi')}
                  trailing={c.pendingOrders ? <Badge tone="warning">{t('{{count}} naye', { count: c.pendingOrders })}</Badge> : <Badge tone={c.live ? 'success' : 'neutral'} dot>{c.live ? t('Chal raha') : t('Ruka')}</Badge>}
                  chevron onPress={() => router.push(`/online/orders?board=ALL&channel=${c.id}` as never)} />
              ))}
            </ListGroup>
          ) : (
            <Card>
              <ListRow icon={Globe} iconTone="brand" title={t('Channel joren')} subtitle={t('Website, Shopify, WooCommerce ya Daraz — web par 2 minute')}
                trailing={<Icon icon={ExternalLink} size={16} color={th.colors.textMuted} />} onPress={() => openOnWeb('/online-store/connect')} />
            </Card>
          )}
        </View>

        {getHomeSections().map(({ key, Component }) => <Component key={key} />)}

        {COMMERCE_GROUPS.slice(1).map((g) => {
          const links = g.links.filter(allowed);
          if (!links.length) return null;
          return (
            <View key={g.id} style={{ gap: th.space(2) }}>
              <SectionHeader title={t(g.label)} />
              <ListGroup>
                {links.map((l) => (
                  <ListRow key={l.href} dense icon={l.icon} iconTone="brand" title={t(l.label)} subtitle={l.hint ? t(l.hint) : undefined}
                    chevron={!l.web} trailing={l.web ? <Icon icon={ExternalLink} size={16} color={th.colors.textMuted} /> : undefined}
                    onPress={() => (l.web ? openOnWeb(l.web) : router.push(l.href as never))} />
                ))}
              </ListGroup>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}
