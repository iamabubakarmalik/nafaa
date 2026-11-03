/**
 * Audit: what to watch in the shop. Voids, refunds, big discounts, sales
 * below cost, drawer shorts, cash taken out, stock losses, PIN use, settings
 * changes and logins, each with a severity. Staff with the most flags come
 * first. Same right as the activity log.
 */

import { AlertTriangle, KeyRound, ShieldAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { isAllShops } from '@/core/auth/shopScope';
import { useAuthStore } from '@/core/auth/store';
import { formatDateTime, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, BarChart, Card, ChipGroup, EmptyState, ErrorState, HBarList, ListRow, Screen, Sheet, SkeletonRows, Tabs, Text, useTheme, SearchBar } from '@/design';
import { auditApi, type AuditEvent, type AuditType, type Severity } from '../api/audit';
import { BranchBar, PeriodBar } from '../components/PeriodBar';
import { CachedNote, ChartCard, KpiGrid, LineItem } from '../components/ui';
import { ExportButton } from '../components/ExportButton';
import type { ReportDoc } from '../lib/doc';
import { axisLabel } from '../lib/fmt';
import { usePeriod } from '../lib/period';
import { useReport } from '../lib/useReport';

type Tab = 'overview' | 'events' | 'logins';
const TYPE: Record<AuditType, string> = {
  void: 'Void bill', refund: 'Return', discount: 'Bara discount', below_cost: 'Cost se kam par sale', pin: 'PIN', drawer: 'Galla farq', cash_out: 'Cash nikala', stock_loss: 'Stock nuksan',
  damage: 'Damage', transfer_short: 'Transfer me kami', expense_deleted: 'Expense mita', settings: 'Settings badli', login: 'Login',
};
const SEV: Record<Severity, { label: string; tone: 'danger' | 'warning' | 'neutral' }> = { high: { label: 'High', tone: 'danger' }, medium: { label: 'Medium', tone: 'warning' }, low: { label: 'Low', tone: 'neutral' } };
const money = (n: number | null | undefined) => formatMoney(n ?? 0);

export function AuditScreen() {
  const th = useTheme();
  const can = usePermission();
  const allShops = useAuthStore((s) => isAllShops(s.currentShopId));
  const period = usePeriod('week');
  const [tab, setTab] = useState<Tab>('overview');
  const [branch, setBranch] = useState('');
  const [staffId, setStaffId] = useState('');
  const [type, setType] = useState<'' | AuditType>('');
  const [severity, setSeverity] = useState<'' | Severity>('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<AuditEvent | null>(null);
  const f = { from: period.period.from === 'all' ? period.today : period.period.from, to: period.period.to, branch: branch || undefined, staffId: staffId || undefined };

  const overview = useReport('audit-overview', f, () => auditApi.overview(f), { enabled: tab === 'overview' });
  const events = useInfiniteQuery({
    queryKey: ['report', 'audit-events', f, type, severity, search],
    queryFn: ({ pageParam }) => auditApi.events({ ...f, type: type || undefined, severity: severity || undefined, search: search.trim() || undefined, sort: 'new', page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.hasMore ? l.page + 1 : undefined),
    enabled: tab === 'events',
    placeholderData: keepPreviousData,
  });
  const logins = useReport('audit-logins', f, () => auditApi.logins({ ...f, limit: 40 }), { enabled: tab === 'logins' });
  const active = tab === 'overview' ? overview : tab === 'logins' ? logins : events;
  const o = overview.data;
  const rows = useMemo(() => events.data?.pages.flatMap((p) => p.items) ?? [], [events.data]);

  const doc = (): ReportDoc | null => o ? ({
    title: t('Audit'), subtitle: period.label, fileName: `audit-${f.from}-${f.to}`,
    summary: [[t('Events'), String(o.totals.events)], [t('High'), String(o.totals.high)], [t('Void bills'), `${o.totals.voids} · ${money(o.totals.voidValue)}`], [t('Return'), `${o.totals.refunds} · ${money(o.totals.refundValue)}`], [t('Discount'), `${o.totals.discounts} · ${money(o.totals.discountValue)}`]],
    tables: [{ heading: t('Staff'), columns: [t('Naam'), t('Events'), t('High'), t('Void'), t('Return')], rows: o.staff.map((s) => [s.name, s.events, s.high, s.voids, s.refunds]) }],
  }) : null;

  const overviewView = !o ? null : (
    <View style={{ gap: th.space(4) }}>
      <KpiGrid items={[
        { label: t('Events'), tone: 'info', value: <Text size="lg" weight="bold">{o.totals.events}</Text>, hint: `${o.totals.high} ${t('High')} · ${o.totals.medium} ${t('Medium')}` },
        { label: t('Void bills'), tone: 'danger', value: <Text size="lg" weight="bold">{o.totals.voids}</Text>, hint: money(o.totals.voidValue) },
        { label: t('Return'), tone: 'warning', value: <Text size="lg" weight="bold">{o.totals.refunds}</Text>, hint: money(o.totals.refundValue) },
        { label: t('Bara discount'), tone: 'warning', value: <Text size="lg" weight="bold">{o.totals.discounts}</Text>, hint: money(o.totals.discountValue) },
        { label: t('Galla kam / zyada'), tone: 'danger', value: <Text size="lg" weight="bold">{`${o.totals.drawerShort} / ${o.totals.drawerOver}`}</Text> },
        { label: t('Raat ke waqt'), value: <Text size="lg" weight="bold">{o.totals.afterHours}</Text>, hint: o.settings.hours },
      ]} />
      {o.watch.length > 0 && (
        <Card flush title={t('Dhyan chahiye')}>
          {o.watch.map((w, i) => <ListRow key={i} dense divider={i < o.watch.length - 1} icon={AlertTriangle} iconTone={w.tone === 'bad' ? 'danger' : 'warning'} title={w.title} subtitle={w.text} onPress={w.userId ? () => { setStaffId(w.userId!); setTab('events'); } : undefined} />)}
        </Card>
      )}
      <ChartCard title={t('Kya kya hua')}>
        <HBarList rows={o.byType.map((x) => ({ key: x.type, label: t(TYPE[x.type] ?? x.type), value: x.count, color: x.high ? '#e11d48' : undefined, display: String(x.count), hint: x.amount ? money(x.amount) : undefined, onPress: () => { setType(x.type); setTab('events'); } }))} />
      </ChartCard>
      {o.trend.length > 1 && <ChartCard title={t('Roz ke events')}><BarChart labels={o.trend.map((x) => axisLabel(x.key))} series={[{ key: 'h', label: t('High'), values: o.trend.map((x) => x.high), color: '#e11d48' }, { key: 'm', label: t('Medium'), values: o.trend.map((x) => x.medium), color: '#d97706' }]} /></ChartCard>}
      <Card flush title={t('Staff')} description={t('Zyada flags wale pehle')}>
        {o.staff.map((s, i) => (
          <ListRow key={s.id ?? s.name} dense divider={i < o.staff.length - 1} title={s.name} subtitle={`${t('Void')} ${s.voids} · ${t('Return')} ${s.refunds} · ${t('Discount')} ${s.discounts}${s.shortCount ? ` · ${t('Galla kam')} ${s.shortCount}` : ''}`}
            trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Badge tone={s.level === 'high' ? 'danger' : s.level === 'medium' ? 'warning' : 'neutral'}>{t(SEV[s.level].label)}</Badge><Text size="2xs" tone="muted" ltr>{`${s.events} events`}</Text></View>}
            onPress={s.id ? () => { setStaffId(s.id!); setTab('events'); } : undefined} />
        ))}
      </Card>
      {o.shops.length > 1 && <ChartCard title={t('Branch ke hisaab se')}><HBarList colorful rows={o.shops.map((s) => ({ key: s.id, label: s.name, value: s.events, display: String(s.events), hint: `${s.high} ${t('High')}` }))} /></ChartCard>}
    </View>
  );

  const eventsView = (
    <View style={{ gap: th.space(3) }}>
      <SearchBar value={search} onChangeText={setSearch} placeholder={t('Bill number ya naam…')} />
      <ChipGroup value={severity} onChange={(v) => setSeverity(v as '' | Severity)} options={[{ value: '', label: t('Sab') }, { value: 'high', label: t('High') }, { value: 'medium', label: t('Medium') }, { value: 'low', label: t('Low') }]} />
      <ChipGroup value={type} onChange={(v) => setType(v as '' | AuditType)} options={[{ value: '', label: t('Har kism') }, ...(Object.keys(TYPE) as AuditType[]).map((k) => ({ value: k, label: t(TYPE[k]), count: events.data?.pages[0]?.counts[k] }))]} />
      {staffId && <ChipGroup multiple value={['s']} onChange={() => setStaffId('')} options={[{ value: 's', label: o?.people.find((p) => p.id === staffId)?.name ?? t('Staff') }]} />}
      {events.isLoading ? <SkeletonRows count={5} /> : rows.length === 0 ? <EmptyState icon={ShieldAlert} title={t('Is period me kuch nahi mila')} /> : (
        <Card flush>
          {rows.map((e, i) => (
            <ListRow key={e.id} dense divider={i < rows.length - 1} icon={AlertTriangle} iconTone={e.severity === 'high' ? 'danger' : e.severity === 'medium' ? 'warning' : 'neutral'} title={e.title} subtitle={`${e.userName ?? ''} · ${formatDateTime(e.at)}${e.afterHours ? ` · ${t('raat')}` : ''}`}
              trailing={e.amount ? <Amount value={e.amount} weight="semibold" /> : <Badge tone={SEV[e.severity].tone}>{t(SEV[e.severity].label)}</Badge>} onPress={() => setOpen(e)} />
          ))}
          {events.hasNextPage && <ListRow dense title={t('Aur dikhayein')} onPress={() => void events.fetchNextPage()} />}
        </Card>
      )}
    </View>
  );

  const l = logins.data;
  const loginsView = !l ? null : (
    <View style={{ gap: th.space(4) }}>
      <KpiGrid items={[
        { label: t('Logins'), tone: 'info', value: <Text size="lg" weight="bold">{l.totals.logins}</Text> },
        { label: t('Fail'), tone: 'danger', value: <Text size="lg" weight="bold">{l.totals.failed}</Text> },
        { label: t('Naye device'), tone: 'warning', value: <Text size="lg" weight="bold">{l.totals.newDevices}</Text> },
        { label: t('Raat ke waqt'), value: <Text size="lg" weight="bold">{l.totals.afterHours}</Text> },
      ]} />
      <Card flush title={t('Login history')}>
        {l.items.map((r, i) => <ListRow key={r.id} dense divider={i < l.items.length - 1} icon={KeyRound} iconTone={r.success ? 'success' : 'danger'} title={r.userName} subtitle={`${r.deviceName ?? ''}${r.location ? ` · ${r.location}` : ''} · ${formatDateTime(r.createdAt)}`} trailing={r.success ? (r.isNewDevice ? <Badge tone="warning">{t('Naya device')}</Badge> : undefined) : <Badge tone="danger">{t('Fail')}</Badge>} />)}
      </Card>
    </View>
  );

  return (
    <Screen title={t('Audit')} onRefresh={() => void active.refetch()} refreshing={active.isRefetching} actions={<ExportButton build={doc} disabled={!o} />}>
      {!can(P.ACTIVITY_VIEW) ? <EmptyState icon={ShieldAlert} title={t('Aap ko yeh dekhne ki ijazat nahi')} /> : (
        <>
          <PeriodBar state={period} presets={['today', 'yesterday', 'week', 'month', 'lastMonth']} />
          {allShops && <BranchBar value={branch} onChange={setBranch} />}
          <Tabs value={tab} onChange={setTab} tabs={[{ value: 'overview', label: t('Overview') }, { value: 'events', label: t('Events') }, { value: 'logins', label: t('Logins') }]} />
          <CachedNote query={active} />
          {active.isError && !active.data ? <ErrorState error={active.error} onRetry={() => void active.refetch()} /> : tab === 'overview' ? (overviewView ?? <SkeletonRows count={5} />) : tab === 'events' ? eventsView : (loginsView ?? <SkeletonRows count={5} />)}
        </>
      )}
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.title} description={open ? formatDateTime(open.at) : undefined}>
        {open && (
          <View style={{ gap: th.space(2) }}>
            <Badge tone={SEV[open.severity].tone}>{t(SEV[open.severity].label)}</Badge>
            {open.detail ? <Text size="sm" tone="secondary">{open.detail}</Text> : null}
            <LineItem label={t('Kisne')} value={open.userName ?? '—'} />
            {open.shopName && <LineItem label={t('Branch')} value={open.shopName} />}
            {open.amount ? <LineItem label={t('Amount')} value={<Amount value={open.amount} weight="semibold" />} /> : null}
            {open.cost != null && <LineItem label={t('Cost')} value={<Amount value={open.cost} />} />}
            {open.ref.code && <LineItem last label={t('Reference')} value={open.ref.code} />}
            {open.flags.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{open.flags.map((fl) => <Badge key={fl} tone="warning">{fl}</Badge>)}</View>}
          </View>
        )}
      </Sheet>
    </Screen>
  );
}
