/**
 * Team and school orders (web TeamOrdersPage): kits with name / number
 * printing, an advance on the team's khata and the bill on delivery. Views,
 * counts, search and paging come from the server; tap an order for its sheet
 * (kit lines, printing list, money, next step). Needs the server.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlarmClock, Factory, FileText, PackageCheck, Plus, Shirt } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { isTeamLate } from '@nafaa/core/industries/sports';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, ChipGroup, EmptyState, ListRow, ListTemplate, StatTile, StatusPill, Text, useDebouncedValue, useTheme } from '@/design';
import { OfflineNote, todayKey } from '@/industries/_shared/deskKit';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { teamOrdersApi, type SportsTeamOrder, type TeamView } from '../api';
import { TeamOrderSheet } from '../components/TeamSheets';
import { TEAM_KEY, TEAM_STATUS, day } from '../meta';

const TABS: Array<{ value: TeamView; label: string }> = [
  { value: 'active', label: msg('Chalu') }, { value: 'quote', label: msg('Rate / kacha') }, { value: 'production', label: msg('Ban raha') }, { value: 'ready', label: msg('Tayyar') },
  { value: 'late', label: msg('Late') }, { value: 'unpaid', label: msg('Paise baqi') }, { value: 'done', label: msg('Mukammal / cancel') }, { value: 'all', label: msg('Sab') },
];

export function TeamOrdersScreen() {
  const th = useTheme();
  const canCreate = usePermission()(P.POS_USE);
  const [tab, setTab] = useState<TeamView>('active');
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim(), 250);
  const period = usePeriod('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const q = { view: tab, search: term || undefined, ...(period.period.from !== 'all' ? { from: period.period.from, to: period.period.to } : {}) };
  const list = useInfiniteQuery({
    queryKey: [TEAM_KEY, 'page', q], queryFn: ({ pageParam }) => teamOrdersApi.page({ ...q, page: pageParam, limit: 25 }), initialPageParam: 1,
    getNextPageParam: (l) => (l.page < l.pages ? l.page + 1 : undefined), placeholderData: (p) => p, refetchInterval: 60_000,
  });
  const first = list.data?.pages[0];
  const c = first?.counts;
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const today = todayKey();

  const header = (
    <View style={{ gap: th.space(3) }}>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <StatTile style={{ flex: 1 }} icon={FileText} tone="info" label={t('Rate / kacha')} loading={!c} value={String(c?.quote ?? 0)} hint={t('Pakka karwana hai')} onPress={() => setTab('quote')} />
        <StatTile style={{ flex: 1 }} icon={Factory} tone="accent" label={t('Ban raha / printing')} loading={!c} value={String(c?.production ?? 0)} onPress={() => setTab('production')} />
      </View>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <StatTile style={{ flex: 1 }} icon={PackageCheck} tone="success" label={t('Tayyar')} loading={!c} value={String(c?.ready ?? 0)} hint={t('Team ko batayein')} onPress={() => setTab('ready')} />
        <StatTile style={{ flex: 1 }} icon={AlarmClock} tone={c?.late ? 'danger' : 'neutral'} label={t('Late')} loading={!c} value={String(c?.late ?? 0)} hint={t('Delivery ki date guzar gayi')} onPress={() => setTab('late')} />
      </View>
      <ChipGroup value={tab} onChange={(v) => setTab(v as TeamView)} style={{ marginHorizontal: -th.space(4) }} options={TABS.map((x) => ({ value: x.value, label: t(x.label), count: c?.[x.value] }))} />
      <ChipGroup value={period.preset} onChange={(v) => period.setPreset(v as typeof period.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.map((p) => ({ value: p.value, label: t(p.label) }))} />
      {first && (
        <Text size="sm" tone="secondary">{t('Is filter ki value')} {formatMoney(first.totals.value)} · {t('Advance mila')} {formatMoney(first.totals.advance)} · {t('Baqi')} {formatMoney(first.totals.due)}</Text>
      )}
      <CachedNote query={list} />
      <OfflineNote feature="sportsDesk" />
    </View>
  );

  return (
    <>
      <ListTemplate<SportsTeamOrder>
        title={t('Team orders')}
        search={{ value: search, onChange: setSearch, placeholder: t('Order number, team, school, rabta, phone ya PO…') }}
        summary={header}
        data={rows}
        loading={list.isLoading}
        error={!list.data ? list.error : undefined}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(o) => o.id}
        renderItem={({ item: o }) => {
          const late = isTeamLate(o, today);
          return (
            <ListRow icon={Shirt} iconTone={late ? 'danger' : TEAM_STATUS[o.status].tone} title={o.teamName}
              subtitle={[o.orderNumber, `${o.totalQuantity} ${t('piece')}`, o.playerNames?.length ? `${o.playerNames.length} ${t('players')}` : '', o.expectedDeliveryDate ? `${t('Delivery')} ${day(o.expectedDeliveryDate)}` : ''].filter(Boolean).join(' · ')}
              trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Amount value={o.totalAmount} weight="bold" />
                <StatusPill tone={late ? 'danger' : TEAM_STATUS[o.status].tone}>{late ? t('Late') : t(TEAM_STATUS[o.status].label)}</StatusPill>
                {o.balanceAmount > 0 && o.status !== 'CANCELLED' && <Text size="2xs" tone="warning">{t('Baqi {{due}}', { due: formatMoney(o.balanceAmount) })}</Text>}
              </View>}
              onPress={() => setOpenId(o.id)} />
          );
        }}
        empty={<EmptyState icon={Shirt} title={search || tab !== 'active' ? t('Is filter me koi order nahi') : t('Abhi koi chalu order nahi')} message={t('School ya club ki kit ka order yahan likhein — printing list, advance aur delivery sab ek jagah.')} />}
        fab={canCreate ? { icon: Plus, label: t('Naya order'), onPress: () => router.push('/sports/team-orders/new' as never) } : undefined}
      />
      <TeamOrderSheet id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
