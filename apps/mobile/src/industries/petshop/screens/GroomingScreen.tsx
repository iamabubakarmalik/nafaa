/**
 * Grooming (web GroomingPage): booking to bill. Today, open, all and
 * analytics; start, ready and pickup (the bill) from the row. Needs the server.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, CheckCircle2, PawPrint, Play, Plus, Receipt, Scissors, Star, UserX, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { groomingDue, groomingNext } from '@nafaa/core/industries/petshop';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Card, ChipGroup, EmptyState, HBarList, IconButton, ListRow, ListTemplate, Row, Segmented, Skeleton, StatTile, SwipeRow, Text, toast, useTheme, type SwipeAction } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { PERIOD_PRESETS, shortKey, usePeriod } from '@/modules/sales/lib/period';
import { OfflineNote, errorText, useDeskOnline } from '../../_shared/deskKit';
import { groomersApi, groomingApi, type Grooming } from '../api';
import { AdvanceSheet, CompleteSheet, PickupSheet, RateSheet, VisitSheet, type GroomAction } from '../components/GroomingSheets';
import { GROOM_STATUS, PET_KEYS, refreshPet, serviceLabel, speciesEmoji, speciesLabel } from '../meta';

type Tab = 'today' | 'open' | 'all' | 'analytics';
const LIMIT = 25;

export function GroomingScreen() {
  const th = useTheme();
  const can = usePermission();
  const canWork = can(P.POS_USE);
  const { guard } = useDeskOnline('petshopAnimals');
  const [tab, setTab] = useState<Tab>('today');
  const { q: openWith } = useLocalSearchParams<{ q?: string }>();
  const [search, setSearch] = useState(openWith ?? '');
  const [status, setStatus] = useState('');
  const [groomerId, setGroomerId] = useState('');
  const [act, setAct] = useState<{ a: Grooming; kind: GroomAction } | null>(null);
  const per = usePeriod('month');

  const params = { search: search.trim() || undefined, groomerId: groomerId || undefined, limit: LIMIT, status: status || (tab === 'open' ? 'OPEN' : undefined), today: tab === 'today' ? true : undefined, ...(tab === 'all' ? per.period : {}) };
  const list = usePaged([PET_KEYS.grooming, 'paged', tab, params], (page) => groomingApi.paged({ ...params, page }).then((r) => ({ ...r, pages: Math.max(Math.ceil(r.total / LIMIT), 1) })), tab !== 'analytics');
  const open = useQuery({ queryKey: [PET_KEYS.grooming, 'open'], queryFn: () => groomingApi.paged({ status: 'OPEN', limit: 1 }) });
  const today = useQuery({ queryKey: [PET_KEYS.grooming, 'today'], queryFn: () => groomingApi.paged({ today: true, limit: 1 }) });
  const ana = useQuery({ queryKey: [PET_KEYS.grooming, 'analytics', per.period], queryFn: () => groomingApi.analytics(per.period), enabled: tab === 'analytics' });
  const groomers = useQuery({ queryKey: [PET_KEYS.groomers, 'active'], queryFn: () => groomersApi.list({ active: true }), staleTime: 60_000 });
  const counts = open.data?.counts ?? {};

  const start = useMutation({
    mutationFn: (a: Grooming) => groomingApi.start(a.id),
    onSuccess: (a) => { refreshPet([PET_KEYS.grooming]); toast.success(t('{{petName}}: kaam shuru', { petName: a.petName })); },
    onError: (e) => toast.error(errorText(e, t('Shuru nahi hua'))),
  });

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CalendarDays} tone="info" label={t('Aaj')} loading={today.isLoading} value={String(today.data?.total ?? 0)} hint={t('Chalu: {{count}}', { count: open.data?.total ?? 0 })} onPress={() => setTab('today')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={PawPrint} tone={counts.READY_FOR_PICKUP ? 'accent' : 'neutral'} label={t('Tayyar — le jayein')} loading={open.isLoading} value={String(counts.READY_FOR_PICKUP ?? 0)} onPress={() => { setTab('open'); setStatus('READY_FOR_PICKUP'); }} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Play} tone="warning" label={t('Kaam jari')} loading={open.isLoading} value={String(counts.IN_PROGRESS ?? 0)} onPress={() => { setTab('open'); setStatus('IN_PROGRESS'); }} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Wallet} tone="success" label={t('Chalu ka baqi')} loading={open.isLoading} value={formatMoney(Math.max((open.data?.totals.fee ?? 0) - (open.data?.totals.paid ?? 0), 0))} hint={t('Advance: {{amount}}', { amount: formatMoney(open.data?.totals.paid ?? 0) })} />
      </Row>
      <Segmented value={tab} onChange={(v) => { setTab(v); setStatus(''); }} options={[{ value: 'today', label: t('Aaj') }, { value: 'open', label: t('Chalu') }, { value: 'all', label: t('Sab') }, { value: 'analytics', label: t('Analytics') }]} />
      {tab !== 'analytics' && (
        <>
          <ChipGroup value={status} onChange={setStatus} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab halat') }, ...Object.entries(GROOM_STATUS).map(([value, s]) => ({ value, label: t(s.label) }))]} />
          {(groomers.data?.length ?? 0) > 0 && <ChipGroup value={groomerId} onChange={setGroomerId} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab groomers') }, ...(groomers.data ?? []).map((g) => ({ value: g.id, label: g.name }))]} />}
        </>
      )}
      {(tab === 'all' || tab === 'analytics') && <ChipGroup value={per.preset} onChange={(v) => per.setPreset(v as typeof per.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.filter((p) => p.value !== 'all').map((p) => ({ value: p.value, label: t(p.label) }))} />}
      <OfflineNote feature="petshopAnimals" />
      <CachedNote query={open} />
      {tab === 'analytics' && <Analytics data={ana.data} loading={ana.isLoading} />}
    </View>
  );

  return (
    <>
      <ListTemplate<Grooming>
        title={t('Grooming')}
        grouped={false}
        actions={<IconButton icon={Scissors} label={t('Groomers')} onPress={() => router.push('/petshop/groomers' as never)} />}
        search={tab !== 'analytics' ? { value: search, onChange: setSearch, placeholder: t('Pet, malik, phone ya number…') } : undefined}
        summary={header}
        data={tab === 'analytics' ? [] : list.items}
        loading={tab !== 'analytics' && list.loading}
        error={tab !== 'analytics' ? list.error : undefined}
        onRetry={list.refetch}
        refreshing={list.refreshing}
        onRefresh={() => { list.refetch(); void open.refetch(); void today.refetch(); }}
        onEndReached={list.loadMore}
        keyExtractor={(a) => a.id}
        renderItem={({ item: a }) => {
          const owed = groomingDue(a);
          const next = groomingNext(a.status);
          const st = GROOM_STATUS[a.status];
          const end: SwipeAction[] = !canWork ? [] : [
            ...(next === 'start' ? [{ icon: Play, label: t('Shuru'), tone: 'brand' as const, onPress: () => guard(() => start.mutate(a)) }] : []),
            ...(next === 'ready' ? [{ icon: CheckCircle2, label: t('Tayyar'), tone: 'success' as const, onPress: () => guard(() => setAct({ a, kind: 'complete' })) }] : []),
            ...(next === 'pickup' ? [{ icon: Receipt, label: t('Le jayein'), tone: 'success' as const, onPress: () => guard(() => setAct({ a, kind: 'pickup' })) }] : []),
          ];
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <SwipeRow end={end}>
                <ListRow
                  leading={<View style={{ width: 44, height: 44, borderRadius: th.radius('lg'), backgroundColor: th.colors.warning.soft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22 }}>{speciesEmoji(a.petSpecies)}</Text></View>}
                  title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{a.petName}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
                  subtitle={<View style={{ gap: 2 }}>
                    <Text size="xs" tone="muted" numberOfLines={1}>{[a.customerName, serviceLabel(a.serviceType), a.groomerName].filter(Boolean).join(' · ')}</Text>
                    <Text size="xs" tone="secondary">{`${formatDate(a.scheduledDate)}${a.scheduledSlot ? ` · ${a.scheduledSlot}` : ''}`}</Text>
                  </View>}
                  trailing={<View style={{ alignItems: 'flex-end' }}>
                    <Amount value={a.totalFee} weight="bold" />
                    <Text size="2xs" tone={a.status === 'COMPLETED' ? 'success' : owed > 0.009 ? 'danger' : 'success'}>{a.status === 'COMPLETED' ? t('Bill ban gaya') : owed > 0.009 ? t('{{owed}} baqi', { owed: formatMoney(owed) }) : t('Poora mila')}</Text>
                  </View>}
                  chevron
                  onPress={() => setAct({ a, kind: 'view' })}
                />
              </SwipeRow>
            </View>
          );
        }}
        empty={tab === 'analytics' ? undefined : <EmptyState icon={Scissors} title={tab === 'today' ? t('Aaj koi booking nahi') : t('Is filter me kuch nahi')} message={t('Nahlana, baal katna, nakhun — booking banayein, groomer ka waqt khud bachta hai.')} />}
        fab={canWork ? { icon: Plus, label: t('Nayi booking'), onPress: () => guard(() => router.push('/petshop/grooming/new' as never)) } : undefined}
      />
      <VisitSheet a={act?.kind === 'view' ? act.a : null} canWork={canWork} onAction={(kind) => act && setAct({ a: act.a, kind })} onClose={() => setAct(null)} />
      <CompleteSheet a={act?.kind === 'complete' ? act.a : null} onClose={() => setAct(null)} />
      <PickupSheet a={act?.kind === 'pickup' ? act.a : null} onClose={() => setAct(null)} />
      <AdvanceSheet a={act?.kind === 'advance' ? act.a : null} onClose={() => setAct(null)} />
      <RateSheet a={act?.kind === 'rate' ? act.a : null} onClose={() => setAct(null)} />
    </>
  );
}

function Analytics({ data, loading }: { data?: import('../api').GroomingAnalytics; loading: boolean }) {
  const th = useTheme();
  if (loading || !data) return <Skeleton height={200} />;
  const rows = (list: Array<{ key: string; count: number; value: number }>, label: (k: string) => string) =>
    list.map((r) => ({ key: r.key, label: label(r.key), value: r.value, display: <Text size="xs" tone="muted">{`${r.count} · ${formatMoney(r.value)}`}</Text> }));
  return (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CalendarDays} tone="info" label={t('Bookings')} value={String(data.booked)} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CheckCircle2} tone="success" label={t('Mukammal')} value={String(data.done)} hint={formatMoney(data.value)} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={UserX} tone="danger" label={t('Nahi aaye / cancel')} value={String(data.noShow + data.cancelled)} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Star} tone="warning" label={t('Rating')} value={data.avgRating != null ? String(data.avgRating) : '—'} />
      </Row>
      {data.byService.length > 0 && <Card title={t('Service')}><HBarList colorful rows={rows(data.byService, serviceLabel)} /></Card>}
      {data.byGroomer.length > 0 && <Card title={t('Groomer')}><HBarList colorful rows={rows(data.byGroomer, (k) => k)} /></Card>}
      {data.bySpecies.length > 0 && <Card title={t('Janwar')}><HBarList colorful rows={rows(data.bySpecies, speciesLabel)} /></Card>}
      {data.byDay.length > 0 && <Card title={t('Din ba din')}><HBarList rows={rows(data.byDay, shortKey)} /></Card>}
    </View>
  );
}
