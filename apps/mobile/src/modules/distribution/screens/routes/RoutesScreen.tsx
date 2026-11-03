/**
 * Routes: a route (beat) is a set of shops visited on fixed weekdays by one
 * booker and delivered by one delivery man from one godown. Three views:
 * the routes, the plan for a day (how far each route got) and the shops
 * that are on no route yet. Online, with the last data kept for offline.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Plus, Route as RouteIcon, UserX } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Button, DatePicker, EmptyState, IconButton, ListRow, ListTemplate, ProgressBar, Row, Segmented, Select, Sheet, StatTile, StatusPill, Text, toast, useTheme,
} from '@/design';
import { DIST_KEY, distSetupApi, distributionApi, type Route, type SaveRoute } from '../../api/distribution.api';
import { useCustomerRoster, useTeam, partyOf, partySubOf, type RosterCustomer } from '../../api/setup-lookups';
import { CachedNote } from '../../components/parts';
import { DistributionGate } from '../../components/DistributionGate';
import { RouteFormSheet } from '../../components/RouteFormSheet';
import { fromYmd, ROUTES_KEY, todayKey, WEEKDAYS, WEEKDAYS_SHORT, ymd } from '../../lib/setup';
import { rs } from '../../lib/meta';

type Tab = 'routes' | 'day' | 'unrouted';

export function RoutesScreen() {
  return <DistributionGate title={t('Routes')}><RoutesBody /></DistributionGate>;
}

function DayLetters({ days }: { days: number[] }) {
  const th = useTheme();
  const today = new Date().getDay();
  return (
    <Row gap={1} style={{ marginTop: 4 }}>
      {WEEKDAYS_SHORT.map((d, i) => {
        const on = days.includes(i);
        return (
          <View key={i} style={{
            minWidth: 30, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
            backgroundColor: on ? (i === today ? th.colors.brand.solid : th.colors.brand.soft) : 'transparent', opacity: on ? 1 : 0.4,
          }}>
            <Text size="2xs" weight="bold" style={{ color: on ? (i === today ? th.colors.brand.onSolid : th.colors.brand.text) : th.colors.textMuted }}>{t(d)}</Text>
          </View>
        );
      })}
    </Row>
  );
}

function RoutesBody() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canManage = can(P.DISTRIBUTION_ROUTES_MANAGE);
  const [tab, setTab] = useState<Tab>('routes');
  const [form, setForm] = useState<Route | 'new' | null>(null);
  const routesQ = useQuery({ queryKey: ROUTES_KEY, queryFn: () => distributionApi.routes() });
  const rosterQ = useCustomerRoster();
  const routes = useMemo(() => [...(routesQ.data ?? [])].sort((a, b) => Number(b.isActive) - Number(a.isActive) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)), [routesQ.data]);
  const unrouted = useMemo(() => (rosterQ.data ?? []).filter((c) => c.isActive !== false && !c.routeId), [rosterQ.data]);
  const todays = routes.filter((r) => r.isActive && r.visitDays.includes(new Date().getDay()));

  const refresh = () => qc.invalidateQueries({ queryKey: [DIST_KEY] });
  const create = useMutation({
    mutationFn: (b: SaveRoute) => distSetupApi.createRoute(b),
    onSuccess: (r) => { refresh(); setForm(null); toast.success(t('{{name}} ban gaya', { name: r.name })); router.push(`/distribution/routes/${r.id}` as never); },
  });
  const update = useMutation({
    mutationFn: (v: { id: string; body: Partial<SaveRoute> }) => distSetupApi.updateRoute(v.id, v.body),
    onSuccess: () => { refresh(); setForm(null); toast.success(t('Save ho gaya')); },
  });

  const tabs = (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={tab} onChange={setTab} size="sm" options={[
        { value: 'routes', label: t('Routes'), icon: RouteIcon, count: routes.length },
        { value: 'day', label: t('Din ka plan'), icon: CalendarDays },
        { value: 'unrouted', label: t('Bina route'), icon: UserX, count: rosterQ.data ? unrouted.length : undefined },
      ]} />
      {tab === 'routes' && (
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={MapPin} label={t('Aaj ke routes')} value={String(todays.length)} hint={todays.map((r) => r.name).join(', ') || t('koi nahi')} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="warning" icon={UserX} label={t('Bina route')} value={rosterQ.data ? String(unrouted.length) : '—'} onPress={() => setTab('unrouted')} />
        </Row>
      )}
      <CachedNote query={routesQ} />
    </View>
  );

  const formSheet = form && (
    <RouteFormSheet route={form === 'new' ? null : form} saving={create.isPending || update.isPending} onClose={() => setForm(null)}
      onSave={(body) => (form === 'new' ? create.mutate(body) : update.mutate({ id: form.id, body }))} />
  );

  if (tab === 'day') return <DayView header={tabs} />;
  if (tab === 'unrouted') return <UnroutedView header={tabs} routes={routes} customers={unrouted} loading={rosterQ.isLoading} error={rosterQ.error} onRetry={rosterQ.refetch} />;

  return (
    <>
      <ListTemplate<Route>
        title={t('Routes')}
        summary={tabs}
        data={routes}
        loading={routesQ.isLoading}
        error={routesQ.error}
        onRetry={routesQ.refetch}
        refreshing={routesQ.isRefetching}
        onRefresh={routesQ.refetch}
        keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => (
          <ListRow
            icon={MapPin} iconTone={r.isActive ? 'brand' : 'neutral'}
            title={r.code ? `${r.name} · ${r.code}` : r.name}
            subtitle={<View><Text size="sm" tone="muted" numberOfLines={1}>{t('{{value}} · {{value2}} dukaanein', { value: r.bookerName ?? t('Booker nahi'), value2: r.customerCount ?? 0 })}</Text><DayLetters days={r.visitDays} /></View>}
            trailing={r.isActive ? undefined : <StatusPill tone="danger">{t('Band')}</StatusPill>}
            chevron divider onPress={() => router.push(`/distribution/routes/${r.id}` as never)}
          />
        )}
        empty={<EmptyState icon={MapPin} title={t('Abhi koi route nahi')}
          message={t('Misal: \'Shadman - Ichhra\' — Peer aur Jumeraat, booker Imran, delivery Akram. Phir us ilaqe ki dukaanein tarteeb se lagayein.')}
          action={canManage ? <Button icon={Plus} onPress={() => setForm('new')}>{t('Naya route')}</Button> : undefined} />}
        fab={canManage ? { icon: Plus, label: t('Naya route'), onPress: () => setForm('new') } : undefined}
      />
      {formSheet}
    </>
  );
}

/* ───────────── the plan for one day ───────────── */

function DayView({ header }: { header: React.ReactNode }) {
  const th = useTheme();
  const [date, setDate] = useState(todayKey());
  const [bookerId, setBookerId] = useState('');
  const teamQ = useTeam();
  const q = useQuery({ queryKey: [DIST_KEY, 'route-day', date, bookerId], queryFn: () => distSetupApi.routeDay({ date, bookerId: bookerId || undefined }) });
  const shift = (n: number) => { const d = fromYmd(date); d.setDate(d.getDate() + n); setDate(ymd(d)); };
  const bookers = (teamQ.data ?? []).filter((m) => m.isActive && m.permissions?.includes('distribution.orders.book'));
  const data = q.data;
  const totals = (data?.routes ?? []).reduce((a, r) => ({ c: a.c + r.customers, v: a.v + r.visited, o: a.o + r.orders, val: a.val + r.orderValue }), { c: 0, v: 0, o: 0, val: 0 });

  const controls = (
    <View style={{ gap: th.space(3) }}>
      {header}
      <Row gap={2}>
        <IconButton icon={ChevronLeft} flip label={t('Pichla din')} onPress={() => shift(-1)} />
        <View style={{ flex: 1 }}><DatePicker value={fromYmd(date)} onChange={(d) => setDate(ymd(d))} /></View>
        <IconButton icon={ChevronRight} flip label={t('Agla din')} onPress={() => shift(1)} />
      </Row>
      <Select value={bookerId} onChange={setBookerId} options={[{ value: '', label: t('Sab bookers') }, ...bookers.map((b) => ({ value: b.id, label: b.fullName }))]} />
      {data && (
        <Text size="sm" tone="muted">
          <Text size="sm" weight="bold">{t(WEEKDAYS[data.weekday])}</Text>
          {` ${t('· {{count}} route · {{v}}/{{c}} visit · {{o}} orders · {{val}}', { count: data.routes.length, v: totals.v, c: totals.c, o: totals.o, val: rs(totals.val) })}`}
        </Text>
      )}
    </View>
  );

  return (
    <ListTemplate<NonNullable<typeof data>['routes'][number]>
      title={t('Routes')}
      summary={controls}
      data={data?.routes}
      loading={q.isLoading}
      error={q.error}
      onRetry={q.refetch}
      refreshing={q.isRefetching}
      onRefresh={q.refetch}
      keyExtractor={(r) => r.id}
      renderItem={({ item: r }) => {
        const pct = r.customers ? r.visited / r.customers : 0;
        return (
          <ListRow
            icon={MapPin} iconTone="brand" title={r.name}
            subtitle={<View style={{ gap: 4 }}>
              <Text size="xs" tone="muted" numberOfLines={1}>{[r.bookerName ?? t('Booker nahi'), r.deliveryUserName ?? t('Delivery nahi')].join(' · ')}</Text>
              <ProgressBar value={pct} />
              <Text size="xs" tone="muted">{t('{{v}}/{{c}} visit · {{o}} orders · {{val}}', { v: r.visited, c: r.customers, o: r.orders, val: rs(r.orderValue) })}</Text>
            </View>}
            trailing={<Text weight="bold">{Math.round(pct * 100)}%</Text>}
            divider onPress={() => router.push(`/distribution/routes/${r.id}` as never)}
          />
        );
      }}
      empty={<EmptyState icon={CalendarDays} title={t('Is din koi route nahi — route ke din "Routes" me set karein.')} />}
    />
  );
}

/* ───────────── shops on no route ───────────── */

function UnroutedView({ header, routes, customers, loading, error, onRetry }: {
  header: React.ReactNode; routes: Route[]; customers: RosterCustomer[]; loading: boolean; error: unknown; onRetry: () => void;
}) {
  const qc = useQueryClient();
  const can = usePermission();
  const canManage = can(P.DISTRIBUTION_ROUTES_MANAGE);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [choose, setChoose] = useState(false);
  const [routeId, setRouteId] = useState('');
  const active = routes.filter((r) => r.isActive);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .filter((c) => !q || `${c.name} ${c.businessName ?? ''} ${c.phone ?? ''} ${c.area ?? ''} ${c.city ?? ''}`.toLowerCase().includes(q))
      .map((c) => ({ c, area: c.area?.trim() || c.city?.trim() || t('Ilaqa nahi likha') }))
      .sort((a, b) => a.area.localeCompare(b.area) || partyOf(a.c).localeCompare(partyOf(b.c)))
      .slice(0, 400);
  }, [customers, search]);

  const save = useMutation({
    mutationFn: () => distSetupApi.setRouteCustomers(routeId, picked),
    onSuccess: () => {
      const r = routes.find((x) => x.id === routeId);
      toast.success(t('{{count}} dukaanein {{value}} par lag gayin', { count: picked.length, value: r?.name ?? 'route' }));
      setPicked([]); setChoose(false);
      void qc.invalidateQueries({ queryKey: [DIST_KEY] });
    },
  });
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleArea = (area: string) => {
    const ids = rows.filter((r) => r.area === area).map((r) => r.c.id);
    setPicked((p) => (ids.every((id) => p.includes(id)) ? p.filter((x) => !ids.includes(x)) : [...new Set([...p, ...ids])]));
  };

  return (
    <>
      <ListTemplate<(typeof rows)[number]>
        title={t('Routes')}
        summary={header}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam, dukaan, phone ya ilaqa') }}
        data={rows}
        loading={loading}
        error={error}
        onRetry={onRetry}
        keyExtractor={(r) => r.c.id}
        grouped={false}
        renderItem={({ item, index }) => {
          const first = index === 0 || rows[index - 1].area !== item.area;
          const on = picked.includes(item.c.id);
          return (
            <View>
              {first && canManage && (
                <ListRow dense title={`${item.area} (${rows.filter((r) => r.area === item.area).length})`} trailing={<Text size="xs" tone="brand" weight="semibold">{t('{{area}} sab', { area: '' }).trim()}</Text>} onPress={() => toggleArea(item.area)} />
              )}
              <ListRow
                dense selected={on} title={partyOf(item.c)} subtitle={partySubOf(item.c) || '—'}
                trailing={Number(item.c.balance) > 0 ? <Text size="xs" tone="danger" weight="semibold">{rs(item.c.balance)}</Text> : undefined}
                divider onPress={canManage ? () => toggle(item.c.id) : undefined}
              />
            </View>
          );
        }}
        empty={<EmptyState icon={MapPin} title={t('Har customer kisi route par hai.')} />}
        fab={canManage && picked.length ? { icon: MapPin, label: t('{{count}} route par daalein', { count: picked.length }), onPress: () => setChoose(true) } : undefined}
      />
      <Sheet open={choose} onClose={() => setChoose(false)} title={t('Route par daalein')}
        footer={<Button fullWidth loading={save.isPending} disabled={!routeId} onPress={() => save.mutate()}>{t('{{count}} route par daalein', { count: picked.length })}</Button>}>
        <Select label={t('Route')} value={routeId} onChange={setRouteId} placeholder={t('— Route chunein —')} options={active.map((r) => ({ value: r.id, label: r.name }))} />
      </Sheet>
    </>
  );
}

