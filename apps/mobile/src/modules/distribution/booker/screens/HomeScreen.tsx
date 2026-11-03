/**
 * Booker home: start of day download, the day's progress, today's routes and
 * each shop's status (visited, order, no order, waiting to sync), search, and
 * links to the day summary, market returns and sync status.
 */

import { useRouter } from 'expo-router';
import { AlertTriangle, BarChart3, Download, RotateCcw, Store } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, Card, EmptyState, IconButton, ListRow, ListTemplate, ProgressBar, Row, Select, StatusPill, Text, useTheme } from '@/design';
import { listRoutes, localDayStats, routeCustomers, type CustomerFilter, type RouteCustomer } from '../core/repo';
import { useBookerStore, useDbQuery } from '../store';
import { daysSince, SyncAction } from '../ui/shared';

const STEP_LABEL: Record<string, string> = {
  manifest: 'Routes aur settings',
  customers: 'Customers',
  products: 'Products',
  prices: 'Price list',
  done: 'Ho gaya',
};

export function BookerHomeScreen() {
  const th = useTheme();
  const router = useRouter();
  const can = usePermission();
  const { manifest, today, lastFullDay, downloading, progress, downloadError, syncError, issues, download, sync, offline, syncing } = useBookerStore();
  const [routeSel, setRouteSel] = useState<string>('today');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>('all');

  const { data: routes = [] } = useDbQuery((db) => listRoutes(db, today), [today]);
  const dueIds = useMemo(() => routes.filter((r) => r.dueToday).map((r) => r.id), [routes]);
  const routeIds = routeSel === 'all' ? null : routeSel === 'today' ? dueIds : [routeSel];
  const { data: rows = [], loading } = useDbQuery((db) => routeCustomers(db, { dayKey: today, routeIds, search }), [today, JSON.stringify(routeIds), search]);
  const { data: stats } = useDbQuery((db) => localDayStats(db, today), [today]);

  const counts = useMemo(() => ({
    all: rows.length,
    left: rows.filter((c) => !c.orders && !c.visits).length,
    ordered: rows.filter((c) => c.orders > 0).length,
    noOrder: rows.filter((c) => c.noOrders > 0 && !c.orders).length,
    pending: rows.filter((c) => c.pending > 0).length,
  }), [rows]);
  const shown = useMemo(() => rows.filter((c) => {
    switch (filter) {
      case 'left': return !c.orders && !c.visits;
      case 'ordered': return c.orders > 0;
      case 'noOrder': return c.noOrders > 0 && !c.orders;
      case 'pending': return c.pending > 0;
      default: return true;
    }
  }), [rows, filter]);

  const needsDay = !manifest || lastFullDay !== today;
  const planned = routes.filter((r) => r.dueToday).reduce((s, r) => s + r.customers, 0);
  const dueNames = routes.filter((r) => r.dueToday).map((r) => r.name).join(', ');
  const pct = progress && progress.total > 0 ? progress.done / progress.total : 0;
  const visited = stats?.visits ?? 0;

  const routeOptions = [
    { value: 'today', label: t('Aaj ke routes') },
    ...routes.map((r) => ({ value: r.id, label: `${r.name} (${r.customers})` })),
    { value: 'all', label: t('Sab') },
  ];

  const summary = (
    <View style={{ gap: th.space(3) }}>
      {downloading ? (
        <Card title={t('Din ka data download ho raha hai')}>
          <View style={{ gap: th.space(2) }}>
            <Text size="sm" tone="muted">
              {t(STEP_LABEL[progress?.step ?? 'manifest'])} {progress && progress.step !== 'manifest' && progress.step !== 'done' ? `${progress.done}/${progress.total}` : ''}
            </Text>
            <ProgressBar value={progress?.step === 'manifest' ? 0.05 : pct} />
          </View>
        </Card>
      ) : needsDay ? (
        <Card tone="brand" title={t('Din shuru karein')}>
          <View style={{ gap: th.space(3) }}>
            <Text size="sm" tone="secondary">
              {manifest ? t('Naye din ke liye customers, products aur price list dobara download karein.') : t('Pehli dafa: apne routes ke customers, products aur price list phone par download karein.')}
            </Text>
            <Button size="xl" fullWidth icon={Download} onPress={() => download()}>{t('Start day')}</Button>
          </View>
        </Card>
      ) : (
        <Card
          title={dueNames || t('Aaj koi route nahi')}
          action={<Button variant="ghost" size="sm" icon={Download} onPress={() => download()}>{t('Update')}</Button>}
        >
          <View style={{ gap: th.space(3) }}>
            <View style={{ gap: th.space(1.5) }}>
              <Row justify="between">
                <Text size="sm" tone="muted">{t('Visit')}</Text>
                <Text size="sm" weight="semibold" ltr>{visited}/{planned}</Text>
              </Row>
              <ProgressBar value={planned ? visited / planned : 0} />
            </View>
            <Row gap={3}>
              <Metric label={t('Orders')} value={String(stats?.orders ?? 0)} />
              <Metric label={t('Order value')} value={formatMoney(stats?.value ?? 0, { compact: true })} />
              <Metric label={t('Recovery')} value={formatMoney(stats?.collected ?? 0, { compact: true })} />
            </Row>
            {offline && <Text size="xs" tone="warning">{t('Internet nahi — kaam phone par save ho raha hai')}</Text>}
          </View>
        </Card>
      )}

      {!!(downloadError || syncError) && (
        <Card tone="danger"><Text size="sm" tone="danger">{t((downloadError ?? syncError) as string)}</Text></Card>
      )}
      {issues > 0 && (
        <Card tone="warning" onPress={() => router.push('/booker/issues')}>
          <Row gap={2}>
            <AlertTriangle size={18} color={th.colors.warning.text} />
            <Text size="sm" weight="semibold" tone="warning" style={{ flex: 1 }}>{t('{{count}} entry server ne nahi li — dekhein', { count: issues })}</Text>
          </Row>
        </Card>
      )}
      {manifest && <Select value={routeSel} onChange={setRouteSel} options={routeOptions} title={t('Route')} />}
    </View>
  );

  return (
    <ListTemplate<RouteCustomer>
      title={t('Order booking')}
      subtitle={manifest?.me.fullName}
      onBack={null}
      actions={(
        <Row gap={1}>
          {can(P.DISTRIBUTION_RETURNS_COLLECT) && <IconButton icon={RotateCcw} label={t('Market return')} onPress={() => router.push('/booker/return')} />}
          <IconButton icon={BarChart3} label={t('Day summary')} onPress={() => router.push('/booker/summary')} />
          <SyncAction />
        </Row>
      )}
      summary={summary}
      search={manifest ? { value: search, onChange: setSearch, placeholder: t('Dukaan, naam ya phone') } : undefined}
      filters={manifest ? {
        value: filter,
        onChange: (v) => setFilter(v as CustomerFilter),
        options: [
          { value: 'all', label: t('Sab'), count: counts.all },
          { value: 'left', label: t('Baqi'), count: counts.left },
          { value: 'ordered', label: t('Order mila'), count: counts.ordered },
          { value: 'noOrder', label: t('No order'), count: counts.noOrder },
          { value: 'pending', label: t('Sync baqi'), count: counts.pending },
        ],
      } : undefined}
      data={manifest ? shown : []}
      loading={!!manifest && loading && !rows.length}
      refreshing={syncing}
      onRefresh={() => sync()}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => <ShopRow c={item} showBalance={!!manifest?.me.canSeeBalance} onPress={() => router.push(`/booker/customer/${item.id}`)} />}
      empty={manifest ? (
        <EmptyState
          icon={Store}
          title={search ? t('Koi dukaan nahi mili') : routeSel === 'today' && !dueIds.length ? t('Aaj aap ka koi route nahi') : t('Is list me koi dukaan nahi')}
          message={routeSel === 'today' && !dueIds.length ? t('Upar se koi aur route chunein') : undefined}
        />
      ) : <View />}
    />
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text size="xs" tone="muted" numberOfLines={1}>{label}</Text>
      <Text size="lg" weight="bold" ltr numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

function ShopRow({ c, showBalance, onPress }: { c: RouteCustomer; showBalance: boolean; onPress: () => void }) {
  const th = useTheme();
  const due = daysSince(c.oldestDueAt);
  const overdue = !!(c.creditDays && due != null && due > c.creditDays);
  const tags = (
    <Row gap={1.5} style={{ flexWrap: 'wrap', marginTop: 4 }}>
      {c.orders > 0 && <StatusPill tone="success">{t('Order {{value}}', { value: formatMoney(c.orderValue, { compact: true }) })}</StatusPill>}
      {c.noOrders > 0 && !c.orders && <StatusPill tone="neutral">{t('No order')}</StatusPill>}
      {c.collected > 0 && <StatusPill tone="info">{t('Recovery {{value}}', { value: formatMoney(c.collected, { compact: true }) })}</StatusPill>}
      {!c.orders && !c.visits && c.checkedIn > 0 && <StatusPill tone="brand">{t('Check-in')}</StatusPill>}
      {c.pending > 0 && <StatusPill tone="warning">{t('Sync baqi')}</StatusPill>}
    </Row>
  );
  return (
    <ListRow
      leading={(
        <View style={{ width: 40, height: 40, borderRadius: th.radius('md'), backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Text weight="bold" tone="brand" ltr>{c.routeSeq ?? '–'}</Text>
        </View>
      )}
      title={c.businessName || c.name}
      subtitle={(
        <View>
          <Text size="xs" tone="muted" numberOfLines={1}>{[c.businessName ? c.name : null, c.area || c.address].filter(Boolean).join(' · ') || '—'}</Text>
          {tags}
        </View>
      )}
      trailing={showBalance && c.balance != null ? (
        <View style={{ alignItems: 'flex-end' }}>
          <Amount value={c.balance} size="sm" weight="semibold" tone={c.balance > 0 ? 'danger' : 'muted'} />
          {overdue && <Text size="2xs" tone="danger" weight="semibold">{t('{{count}} din', { count: due })}</Text>}
        </View>
      ) : undefined}
      chevron
      onPress={onPress}
      divider
    />
  );
}
