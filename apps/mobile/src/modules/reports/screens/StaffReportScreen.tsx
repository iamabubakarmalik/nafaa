/**
 * Staff and counters: who sold how much, discounts, voids, returns and
 * khata per person, alerts for unusual numbers, cash shifts with shorts and
 * overs, and one person's full detail. Cost and drawer money follow the
 * shop's report privacy rules.
 */

import { AlertTriangle, Clock, Trophy, UserRound } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { isAllShops } from '@/core/auth/shopScope';
import { useAuthStore } from '@/core/auth/store';
import { formatDate, formatDateTime, formatMoney, formatTime } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Avatar, Badge, BarChart, Card, ChipGroup, DonutChart, EmptyState, ErrorState, HBarList, LineChart, ListRow, Screen, Sheet, SkeletonRows, Tabs, Text, useTheme } from '@/design';
import { staffReportApi, type PersonDetail, type StaffAlert, type StaffRow } from '../api/staff';
import { BranchBar, PeriodBar } from '../components/PeriodBar';
import { CachedNote, ChartCard, Delta, KpiGrid, LineItem } from '../components/ui';
import { ExportButton } from '../components/ExportButton';
import type { ReportDoc } from '../lib/doc';
import { axisLabel, changePct, pct } from '../lib/fmt';
import { usePeriod } from '../lib/period';
import { useReport } from '../lib/useReport';

type Tab = 'team' | 'shifts';
const ALERT: Record<string, string> = { discount: 'Zyada discount', void: 'Zyada void', return: 'Zyada return', credit: 'Zyada udhaar', short: 'Galla kam', pin: 'PIN ki koshishein' };
const money = (n: number | null | undefined) => formatMoney(n ?? 0);

export function StaffReportScreen() {
  const th = useTheme();
  const can = usePermission();
  const period = usePeriod('month');
  const [tab, setTab] = useState<Tab>('team');
  const [status, setStatus] = useState('');
  const [person, setPerson] = useState<{ id: string; name: string } | null>(null);
  const range = { from: period.period.from, to: period.period.to };

  const q = useReport('staff-overview', range, () => staffReportApi.overview(range));
  const shifts = useInfiniteQuery({
    queryKey: ['report', 'staff-shifts', range, status],
    queryFn: ({ pageParam }) => staffReportApi.shifts({ ...range, status: status || undefined, page: pageParam, limit: 25 }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.page < l.pages ? l.page + 1 : undefined),
    enabled: tab === 'shifts',
    placeholderData: keepPreviousData,
  });
  const d = q.data;
  const rows = useMemo(() => [...(d?.staff ?? [])].sort((a, b) => b.net - a.net), [d]);
  const shiftRows = useMemo(() => shifts.data?.pages.flatMap((p) => p.items) ?? [], [shifts.data]);
  const s0 = shifts.data?.pages[0];

  const doc = (): ReportDoc | null => d ? ({
    title: t('Staff & counter'), subtitle: period.label, fileName: `staff-${range.from}-${range.to}`,
    summary: [[t('Staff'), String(d.totals.staff)], [t('Net sale'), money(d.totals.net)], [t('Bills'), String(d.totals.bills)], [t('Discount'), money(d.totals.manualDiscount)], [t('Void'), String(d.totals.voided)]],
    tables: [{ heading: t('Staff'), columns: [t('Naam'), t('Bills'), t('Net sale'), t('Discount'), t('Void'), t('Return')], rows: rows.map((r) => [r.name, r.bills, money(r.net), money(r.manualDiscount), r.voided, r.returnedBills]) }],
  }) : null;

  const team = !d ? null : (
    <View style={{ gap: th.space(4) }}>
      <KpiGrid items={[
        { label: t('Net sale'), tone: 'brand', value: <Amount value={d.totals.net} size="lg" weight="bold" />, hint: <Delta value={changePct(d.totals.net, d.previous?.net)} /> },
        { label: t('Bills'), tone: 'info', value: <Text size="lg" weight="bold">{d.totals.bills}</Text>, hint: <Delta value={changePct(d.totals.bills, d.previous?.bills)} /> },
        { label: t('Discount'), tone: 'warning', value: <Amount value={d.totals.manualDiscount} size="lg" weight="bold" />, hint: <Delta value={changePct(d.totals.manualDiscount, d.previous?.manualDiscount)} upIsGood={false} /> },
        { label: t('Void bills'), tone: 'danger', value: <Text size="lg" weight="bold">{d.totals.voided}</Text>, hint: money(d.totals.voidedValue) },
        { label: t('Return'), value: <Text size="lg" weight="bold">{d.totals.returnsDone}</Text>, hint: money(d.totals.returnsDoneValue) },
        { label: t('Staff'), value: <Text size="lg" weight="bold">{d.totals.staff}</Text>, hint: `${t('Ausat')} ${money(d.team.perStaff)}` },
      ]} />
      {d.alerts.length > 0 && (
        <Card flush title={t('Dhyan chahiye')}>
          {d.alerts.slice(0, 8).map((a: StaffAlert, i, arr) => (
            <ListRow key={`${a.userId}${a.kind}`} dense divider={i < arr.length - 1} icon={AlertTriangle} iconTone={a.level === 'high' ? 'danger' : 'warning'} title={a.name} subtitle={`${t(ALERT[a.kind] ?? a.kind)} · ${a.kind === 'void' || a.kind === 'pin' || a.kind === 'short' ? a.value : `${a.value.toFixed(1)}%`} ${t('(team: {{team}})', { team: a.kind === 'void' || a.kind === 'pin' || a.kind === 'short' ? a.team : `${a.team.toFixed(1)}%` })}`}
              onPress={() => a.userId && setPerson({ id: a.userId, name: a.name })} />
          ))}
        </Card>
      )}
      <ChartCard title={t('Kis ne kitna becha')}>
        <HBarList colorful rows={rows.slice(0, 10).map((r) => ({ key: r.id ?? r.name, label: r.name, value: r.net, display: money(r.net), hint: `${t('{{count}} bills', { count: r.bills })} · ${t('Ausat')} ${money(r.average)}`, onPress: r.id ? () => setPerson({ id: r.id!, name: r.name }) : undefined }))} />
      </ChartCard>
      <Card flush title={t('Leaderboard')}>
        {rows.map((r: StaffRow, i) => (
          <ListRow key={r.id ?? r.name} dense divider={i < rows.length - 1} leading={<Avatar name={r.name} url={r.avatarUrl ?? undefined} size={36} />} title={`${i < 3 ? ['🥇', '🥈', '🥉'][i] + ' ' : ''}${r.name}`}
            subtitle={`${r.bills} ${t('bills')} · ${t('Discount')} ${pct(r.discountPct, 0)} · ${t('Void')} ${r.voided} · ${t('Return')} ${r.returnedBills}`}
            trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={r.net} weight="bold" />{r.profit != null && <Amount value={r.profit} size="2xs" colorize />}</View>}
            onPress={r.id ? () => setPerson({ id: r.id!, name: r.name }) : undefined} />
        ))}
      </Card>
      {d.trend.length > 1 && <ChartCard title={t('Roz ki sale')}><BarChart labels={d.trend.map((x) => axisLabel(x.key))} series={[{ key: 'n', values: d.trend.map((x) => x.net) }]} format={formatMoney} /></ChartCard>}
      {d.byShop.length > 1 && <ChartCard title={t('Branch ke hisaab se')}><HBarList colorful rows={d.byShop.map((b) => ({ key: b.id ?? b.name, label: b.name, value: b.net, display: money(b.net), hint: b.top ? `${t('Behtareen')}: ${b.top.name}` : undefined }))} /></ChartCard>}
      {d.idle.length > 0 && <Card flush title={t('Is period me koi bill nahi')}>{d.idle.map((p, i) => <ListRow key={p.id} dense divider={i < d.idle.length - 1} icon={UserRound} title={p.name} subtitle={p.role} />)}</Card>}
    </View>
  );

  const shiftsView = (
    <View style={{ gap: th.space(3) }}>
      <ChipGroup value={status} onChange={setStatus} options={[{ value: '', label: t('Sab') }, { value: 'open', label: t('Khuli') }, { value: 'closed', label: t('Band') }, { value: 'short', label: t('Short') }, { value: 'over', label: t('Over') }, { value: 'matched', label: t('Barabar') }]} />
      {!s0 ? <SkeletonRows count={4} /> : (
        <>
          <KpiGrid items={[
            { label: t('Shifts'), value: <Text size="lg" weight="bold">{s0.totals.shifts}</Text>, hint: `${s0.totals.open} ${t('khuli')}` },
            { label: t('Barabar'), tone: 'success', value: <Text size="lg" weight="bold" ltr>{pct(s0.totals.matchedPct, 0)}</Text> },
            { label: t('Galla kam'), tone: 'danger', value: <Amount value={s0.totals.short} size="lg" weight="bold" />, hint: t('{{count}} shifts', { count: s0.totals.shortCount }) },
            { label: t('Galla zyada'), tone: 'warning', value: <Amount value={s0.totals.over} size="lg" weight="bold" />, hint: t('{{count}} shifts', { count: s0.totals.overCount }) },
          ]} />
          <Card flush>
            {shiftRows.length === 0 ? <View style={{ padding: th.space(4) }}><Text tone="muted">{t('Koi shift nahi')}</Text></View> : shiftRows.map((r, i) => (
              <ListRow key={r.id} dense divider={i < shiftRows.length - 1} icon={Clock} iconTone={r.status === 'OPEN' ? 'warning' : r.difference && Math.abs(r.difference) >= 1 ? 'danger' : 'success'}
                title={`${r.number} · ${r.openedBy.fullName}`} subtitle={`${formatDateTime(r.openedAt)}${r.closedAt ? ` – ${formatTime(r.closedAt)}` : ''}${r.shop ? ` · ${r.shop.name}` : ''}`}
                trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>{r.status === 'OPEN' ? <Badge tone="warning">{t('Khuli')}</Badge> : <Amount value={r.difference ?? 0} weight="bold" colorize signed />}<Amount value={r.cashSales} size="2xs" tone="muted" /></View>}
                onPress={() => setPerson({ id: r.openedBy.id, name: r.openedBy.fullName })} />
            ))}
          </Card>
        </>
      )}
    </View>
  );

  return (
    <Screen title={t('Staff & counter')} onRefresh={() => { void q.refetch(); if (tab === 'shifts') void shifts.refetch(); }} refreshing={q.isRefetching} actions={<ExportButton build={doc} disabled={!d} />}>
      {!can(P.REPORTS_VIEW) || !can(P.STAFF_VIEW) ? <EmptyState icon={Trophy} title={t('Aap ko yeh dekhne ki ijazat nahi')} /> : (
        <>
          <PeriodBar state={period} allowAll />
          <Tabs value={tab} onChange={setTab} tabs={[{ value: 'team', label: t('Team') }, { value: 'shifts', label: t('Shifts') }]} />
          <CachedNote query={q} />
          {q.isError && !d ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : tab === 'team' ? (team ?? <SkeletonRows count={5} />) : shiftsView}
        </>
      )}
      <PersonSheet person={person} range={range} onClose={() => setPerson(null)} />
    </Screen>
  );
}

function PersonSheet({ person, range, onClose }: { person: { id: string; name: string } | null; range: { from: string; to: string }; onClose: () => void }) {
  const th = useTheme();
  const q = useReport('staff-person', { id: person?.id, ...range }, () => staffReportApi.person(person!.id, range), { enabled: !!person });
  const p: PersonDetail | undefined = q.data;
  return (
    <Sheet open={!!person} onClose={onClose} title={person?.name} description={p ? `${p.person.role}${p.person.shop ? ` · ${p.person.shop}` : ''}` : undefined} height={0.9}>
      {!p ? (q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : <SkeletonRows count={5} />) : (
        <View style={{ gap: th.space(4) }}>
          {p.trend.length > 1 && <ChartCard title={t('Roz ki sale')}><LineChart labels={p.trend.map((x) => axisLabel(x.key))} series={[{ key: 'n', label: t('Sale'), data: p.trend.map((x) => x.net) }]} format={formatMoney} height={130} /></ChartCard>}
          {p.payments.length > 0 && <ChartCard title={t('Payment methods')}><DonutChart slices={p.payments.map((x) => ({ key: x.method, label: x.method, value: x.net }))} /></ChartCard>}
          {p.products.length > 0 && <ChartCard title={t('Sab se zyada becha')}><HBarList rows={p.products.slice(0, 6).map((x) => ({ key: x.id, label: x.name, value: x.net, display: money(x.net), hint: `${x.qty} ${x.unit}` }))} /></ChartCard>}
          {p.attendance.summary && (
            <Card title={t('Haazri')}>
              <LineItem label={t('Din')} value={String(p.attendance.summary.days)} />
              <LineItem label={t('Ghante')} value={String(Math.round(p.attendance.summary.hours))} />
              <LineItem label={t('Late')} value={String(p.attendance.summary.late)} />
              <LineItem last label={t('Absent')} value={String(p.attendance.summary.absent)} />
            </Card>
          )}
          {p.shifts.length > 0 && <Card flush title={t('Shifts')}>{p.shifts.map((s, i) => <ListRow key={s.id} dense divider={i < p.shifts.length - 1} title={s.number} subtitle={formatDateTime(s.openedAt)} trailing={s.difference != null ? <Amount value={s.difference} colorize signed weight="bold" /> : <Badge tone="warning">{t('Khuli')}</Badge>} />)}</Card>}
          {p.returns.length > 0 && <Card flush title={t('Returns')}>{p.returns.slice(0, 10).map((r, i, a) => <ListRow key={r.id} dense divider={i < a.length - 1} title={`${r.number} · ${r.sale.number}`} subtitle={formatDate(r.at)} trailing={<Amount value={r.amount} weight="semibold" />} />)}</Card>}
          {p.voided.length > 0 && <Card flush title={t('Void bills')}>{p.voided.slice(0, 10).map((r, i, a) => <ListRow key={r.id} dense divider={i < a.length - 1} title={r.number} subtitle={formatDate(r.voidedAt)} trailing={<Amount value={r.total} weight="semibold" />} />)}</Card>}
          {p.pins.length > 0 && <Card flush title={t('PIN')}>{p.pins.slice(0, 10).map((r, i, a) => <ListRow key={r.id} dense divider={i < a.length - 1} icon={AlertTriangle} iconTone={r.ok ? 'success' : 'danger'} title={r.text} subtitle={formatDateTime(r.at)} />)}</Card>}
        </View>
      )}
    </Sheet>
  );
}
