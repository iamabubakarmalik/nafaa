/**
 * Distribution home: what is waiting at each step today (approve, invoice,
 * load, on the van, recoveries to verify), the day's cash from load sheets,
 * the oldest credit, a booker-wise list and the month's targets.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  AlertTriangle, BadgeCheck, ClipboardList, FileText, HandCoins, Landmark, Lock, PackageCheck, Target, Truck, Undo2, Users,
} from 'lucide-react-native';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Button, Card, EmptyState, ListRow, PageHero, ProgressBar, Row, Screen, SectionHeader, Skeleton, StatTile, Text, useLayout, useTheme,
} from '@/design';
import { DIST_KEY, distributionApi } from '../api/distribution.api';
import { phase2Api } from '../api/phase2.api';
import { CachedNote, StatusChip } from '../components/parts';
import { DistributionGate } from '../components/DistributionGate';
import { dayKeyLabel, partyName, rs, SHEET_STATUS } from '../lib/meta';

export function DashboardScreen() {
  return <DistributionGate><Dashboard /></DistributionGate>;
}

function Dashboard() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const can = usePermission();
  const canReports = can(P.REPORTS_VIEW);
  const canKhata = can(P.KHATA_VIEW);

  const dashQ = useQuery({ queryKey: [DIST_KEY, 'dashboard'], queryFn: distributionApi.dashboard, refetchInterval: 60_000 });
  const d = dashQ.data;
  const date = d?.date;
  const dsrQ = useQuery({ queryKey: [DIST_KEY, 'dsr', date], queryFn: () => distributionApi.dsr({ date }), enabled: !!date && canReports });
  const sheetsQ = useQuery({ queryKey: [DIST_KEY, 'sheets', 'day', date], queryFn: () => distributionApi.loadSheets({ from: date, to: date, limit: 20 }), enabled: !!date });
  const targetsQ = useQuery({ queryKey: [DIST_KEY, 'targets', 'dashboard'], queryFn: () => phase2Api.targets(), retry: false });
  const overdueQ = useQuery({ queryKey: [DIST_KEY, 'recoveries', 'overdue-top'], queryFn: () => distributionApi.recoveries({ overdueOnly: true, limit: 6 }), enabled: canKhata });

  const w = d?.waiting;
  const sheets = sheetsQ.data?.sheets.filter((s) => s.status !== 'CANCELLED') ?? [];
  const cash = sheets.reduce((a, s) => ({ expected: a.expected + s.expectedCash, handed: a.handed + (s.handedIn ?? 0), short: a.short + (s.status === 'SETTLED' ? s.shortAmount : 0) }), { expected: 0, handed: 0, short: 0 });
  const go = (href: string) => () => router.push(href as never);
  const tile = { flexBasis: isTablet ? '23%' : '47%', flexGrow: 1 } as const;

  return (
    <Screen title={t('Distribution')} refreshing={dashQ.isRefetching} onRefresh={() => void dashQ.refetch()}>
      <View style={{ gap: th.space(4) }}>
        <PageHero
          title={t('Distribution')}
          chip={date ? dayKeyLabel(date) : t('Aaj')}
          meta={t('Booker ke orders se le kar delivery aur recovery tak — aaj kya baqi hai')}
          loading={dashQ.isLoading}
          stats={d ? [
            { label: t('Aaj ke orders'), value: String(d.today.orders), hint: rs(d.today.value) },
            { label: t('Visits'), value: `${d.today.productiveVisits}/${d.today.visits}`, hint: t('order wali / kul') },
          ] : [{ label: t('Aaj ke orders'), value: '—' }]}
        />
        <CachedNote query={dashQ} />
        {d && <StatTile tone="danger" label={t('Market me udhaar')} value={<Amount value={d.receivable.amount} size="xl" weight="bold" />} hint={t('{{customers}} customers', { customers: d.receivable.customers })} onPress={() => router.push('/distribution/recoveries')} />}
        {dashQ.isError && !d && <EmptyState icon={Truck} title={t('Kaam nahi hua, dobara koshish karein')} action={<Button onPress={() => void dashQ.refetch()}>{t('Retry')}</Button>} />}

        <Row gap={2} style={{ flexWrap: 'wrap' }}>
          {!w ? [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} style={{ ...tile, height: 84, borderRadius: 16 }} />) : <>
            <StatTile style={tile} icon={BadgeCheck} tone="warning" label={t('Approve baqi')} value={String(w.toApprove.count)} hint={rs(w.toApprove.value)} onPress={go('/distribution/orders?status=BOOKED')} />
            <StatTile style={tile} icon={FileText} tone={w.invoiceProblems ? 'danger' : 'info'} label={t('Invoice baqi')} value={String(w.approvedNotInvoiced.count)}
              hint={w.invoiceProblems ? t('{{invoiceProblems}} me masla', { invoiceProblems: w.invoiceProblems }) : rs(w.approvedNotInvoiced.value)} onPress={go('/distribution/orders?status=APPROVED')} />
            <StatTile style={tile} icon={PackageCheck} tone="accent" label={t('Load baqi')} value={String(w.toLoad.count)} hint={rs(w.toLoad.value)} onPress={go('/distribution/orders?status=INVOICED')} />
            <StatTile style={tile} icon={Truck} tone="warning" label={t('Gaari par')} value={String(w.onVans.count)}
              hint={t('{{vans}} sheet · {{value}}', { vans: (w.openSheets.OPEN?.count ?? 0) + (w.openSheets.DISPATCHED?.count ?? 0), value: rs(w.onVans.value) })} onPress={go('/distribution/load-sheets')} />
            <StatTile style={tile} icon={HandCoins} tone="success" label={t('Verify baqi')} value={String(w.collectionsToVerify.count)} hint={rs(w.collectionsToVerify.amount)} onPress={go('/distribution/recoveries?tab=verify')} />
          </>}
        </Row>

        {d?.phase2 && (
          <Row gap={2} style={{ flexWrap: 'wrap' }}>
            <StatTile style={tile} icon={Undo2} tone="danger" label={t('Market returns approve')} value={String(d.phase2.returnsToApprove.count)} hint={rs(d.phase2.returnsToApprove.value)} onPress={go('/distribution/returns')} />
            <StatTile style={tile} icon={Landmark} tone="brand" label={t('Cheque bank me dene')} value={String(d.phase2.chequesToDeposit.count)} hint={rs(d.phase2.chequesToDeposit.amount)} onPress={go('/distribution/cheques')} />
            <StatTile style={tile} icon={Truck} tone="warning" label={t('Vans bahar')} value={String(d.phase2.vansOut)} hint={t('din khula hai')} onPress={go('/distribution/vans')} />
            <StatTile style={tile} icon={Lock} tone="accent" label={t('Stock rok kar')} value={String(d.phase2.ordersHoldingStock)} hint={t('approved, Invoice baqi')} onPress={go('/distribution/orders?status=APPROVED')} />
          </Row>
        )}

        <View style={{ gap: th.space(2) }}>
          <SectionHeader title={t('Booker — aaj')} />
          <Card flush>
            {!canReports ? <EmptyState compact icon={Users} title={t('Booker ki report dekhne ke liye Reports ki permission chahiye.')} />
              : !dsrQ.data ? <View style={{ padding: th.space(3) }}><Skeleton style={{ height: 120, borderRadius: 12 }} /></View>
                : !dsrQ.data.bookers.length ? <EmptyState compact icon={Users} title={t('Aaj abhi kisi booker ne visit ya order nahi kiya.')} />
                  : dsrQ.data.bookers.map((b, i, a) => (
                    <ListRow key={b.bookerId} divider={i < a.length - 1} title={b.bookerName}
                      subtitle={`${t('{{count}} visits', { count: `${b.visited}/${b.planned}` })} · ${t('{{count}} orders', { count: b.orders })} · ${Math.round(b.strikeRate)}%`}
                      trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={b.value} weight="semibold" />
                        {b.collected > 0 && <Text size="xs" tone="muted">{t('Recovery')} {rs(b.collected)}</Text>}</View>} />
                  ))}
          </Card>
        </View>

        <View style={{ gap: th.space(2) }}>
          <SectionHeader title={t('Aaj ka cash')} />
          <Card>
            <Row gap={2} justify="between">
              <Fig label={t('Expected')} value={cash.expected} />
              <Fig label={t('Jama hua')} value={cash.handed} />
              <Fig label={cash.short >= 0 ? t('Kam') : t('Zyada')} value={Math.abs(cash.short)} tone={cash.short > 0 ? 'danger' : cash.short < 0 ? 'success' : undefined} />
            </Row>
          </Card>
          {!!sheets.length && (
            <Card flush>
              {sheets.slice(0, 5).map((s, i, a) => (
                <ListRow key={s.id} icon={Truck} divider={i < a.length - 1} chevron title={s.number}
                  subtitle={`${s.routeName ?? s.deliveryUserName ?? t('{{invoiceCount}} invoices', { invoiceCount: s.invoiceCount })} · ${rs(s.totalValue)}`}
                  trailing={<StatusChip meta={SHEET_STATUS[s.status]} />} onPress={() => router.push(`/distribution/load-sheets/${s.id}` as never)} />
              ))}
            </Card>
          )}
        </View>

        {!!targetsQ.data?.targets.length && (
          <View style={{ gap: th.space(2) }}>
            <SectionHeader title={t('Targets')} action={<Button variant="link" size="sm" onPress={go('/distribution/targets')}>{t('Sab')}</Button>} />
            <Card>
              <Text size="xs" tone="muted">{t('{{pace}}% mahina guzra · {{daysLeft}} din baqi', { pace: targetsQ.data.pace, daysLeft: targetsQ.data.daysLeft })}</Text>
              <View style={{ gap: th.space(3), marginTop: th.space(2) }}>
                {[...targetsQ.data.targets].sort((a, b) => a.pct - b.pct).slice(0, 5).map((x) => (
                  <View key={x.id} style={{ gap: 4 }}>
                    <Row justify="between">
                      <Row gap={1.5} style={{ flexShrink: 1 }}><Target size={14} color={th.colors.textMuted} /><Text size="sm" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{x.label}</Text></Row>
                      <Text size="sm" weight="semibold" tone={x.onTrack ? 'success' : 'warning'}>{Math.round(x.pct)}%</Text>
                    </Row>
                    <ProgressBar value={Math.min(1, x.pct / 100)} />
                  </View>
                ))}
              </View>
            </Card>
          </View>
        )}

        {canKhata && !!overdueQ.data?.customers.length && (
          <View style={{ gap: th.space(2) }}>
            <SectionHeader title={t('Purana udhaar')} action={<Button variant="link" size="sm" onPress={go('/distribution/recoveries')}>{t('Sab')}</Button>} />
            <Card flush>
              {overdueQ.data.customers.map((r, i, a) => (
                <ListRow key={r.customer.id} icon={AlertTriangle} iconTone="danger" divider={i < a.length - 1} title={partyName(r.customer)} subtitle={r.routeName ?? t('Route nahi')}
                  trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={r.balance} weight="semibold" /><Text size="xs" tone="danger">{t('{{dueDays}} din', { dueDays: r.dueDays })}</Text></View>} />
              ))}
            </Card>
          </View>
        )}

        <Row gap={2}>
          <Button style={{ flex: 1 }} variant="secondary" icon={ClipboardList} onPress={go('/distribution/orders')}>{t('Orders')}</Button>
          <Button style={{ flex: 1 }} variant="secondary" icon={Truck} onPress={go('/distribution/load-sheets')}>{t('Load sheets')}</Button>
        </Row>
      </View>
    </Screen>
  );
}

function Fig({ label, value, tone }: { label: string; value: number; tone?: 'danger' | 'success' }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text size="xs" tone="muted">{label}</Text>
      <Amount value={value} weight="bold" tone={tone} />
    </View>
  );
}
