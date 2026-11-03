/**
 * Auto parts dashboard (web autoparts/dashboard): the workshop job board,
 * promised dates, service reminders, vehicle paper dates and mechanic output,
 * what needs attention and quick actions. The last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Bell, Car, FileWarning, Package, Plus, Receipt, ShoppingCart, Truck, UserCog, Users, Wrench, Zap } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { jobDue } from '@nafaa/core/industries/autoparts';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Card, ListRow, Row, Text, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { autoPartsDashboardApi, serviceRemindersApi, type ReminderRow, type WorkshopJob } from '../api';
import { DASH_KEY, dateTime, dayOnly, km, vehicleName } from '../meta';

const MINUTE = 60_000;
const DAY = 86_400_000;
interface Overview {
  totals?: { totalVehicles: number; totalMechanics: number; activeJobs: number; waitingParts: number; readyDelivery: number };
  today?: { revenue: number; collected: number; deliveredCount: number };
  monthly?: { revenue: number; collected: number; jobCount: number };
  expiring?: { insurance: number; tokenTax: number; fitness: number };
  upcomingJobs?: WorkshopJob[]; overdueJobs?: WorkshopJob[];
  topMechanics?: Array<{ mechanicId: string; name: string; revenue: number; jobs: number }>;
}
const hoursTo = (iso?: string | null) => (iso ? (new Date(iso).getTime() - Date.now()) / 3_600_000 : null);
const daysTo = (iso?: string | null) => { if (!iso) return null; const s = new Date(); s.setHours(0, 0, 0, 0); return Math.floor((new Date(iso).getTime() - s.getTime()) / DAY); };

function useOps() {
  const overview = useQuery({ queryKey: [DASH_KEY], queryFn: () => autoPartsDashboardApi.overview().catch(() => null) as Promise<Overview | null>, refetchInterval: MINUTE });
  const upcomingQ = useQuery({ queryKey: ['service-reminders-dash'], queryFn: () => serviceRemindersApi.list({ upcoming: true }).catch(() => [] as ReminderRow[]), staleTime: 5 * MINUTE });
  const overdueQ = useQuery({ queryKey: ['service-reminders-overdue'], queryFn: () => serviceRemindersApi.list({ overdue: true }).catch(() => [] as ReminderRow[]), staleTime: 5 * MINUTE });
  const o = overview.data ?? {};
  return useMemo(() => {
    const board = { ...(o.totals ?? { totalVehicles: 0, totalMechanics: 0, activeJobs: 0, waitingParts: 0, readyDelivery: 0 }), today: o.today ?? { revenue: 0, collected: 0, deliveredCount: 0 }, monthly: o.monthly ?? { revenue: 0, collected: 0, jobCount: 0 } };
    const map = (j: WorkshopJob) => ({ ...j, left: hoursTo(j.promisedAt), due: jobDue(j) });
    const overdue = (o.overdueJobs ?? []).map(map);
    const upcoming = (o.upcomingJobs ?? []).map(map);
    const remOver = (overdueQ.data ?? []).filter((r) => r.status !== 'DONE');
    const remUp = (upcomingQ.data ?? []).filter((r) => r.status !== 'DONE' && !remOver.some((x) => x.id === r.id));
    const e = o.expiring ?? { insurance: 0, tokenTax: 0, fitness: 0 };
    return {
      q: overview, board, jobs: { overdue, list: [...overdue, ...upcoming].slice(0, 6), urgent: [...overdue, ...upcoming].filter((j) => j.priority === 'URGENT' || j.priority === 'EMERGENCY').length },
      reminders: { overdue: remOver, upcoming: remUp, papers: e, papersTotal: Number(e.insurance || 0) + Number(e.tokenTax || 0) + Number(e.fitness || 0), list: [...remOver, ...remUp].map((r) => ({ ...r, left: daysTo(r.dueDate) })).slice(0, 6) },
      mechanics: (o.topMechanics ?? []).filter((m) => m.mechanicId),
    };
  }, [o.totals, o.today, o.monthly, o.expiring, o.upcomingJobs, o.overdueJobs, o.topMechanics, overview, overdueQ.data, upcomingQ.data]);
}

export function AutoPartsDashboardScreen() {
  const th = useTheme();
  const can = usePermission();
  const f = useOps();
  const { board } = f;

  const attention: DashAttention[] = [];
  if (f.jobs.overdue.length) attention.push({ icon: AlertTriangle, tone: 'danger', text: t('{{count}} gaari late hai — customer ko batayein', { count: f.jobs.overdue.length }), href: '/autoparts/jobs?view=late' });
  if (board.readyDelivery) attention.push({ icon: Car, tone: 'info', text: t('{{count}} gaari tayyar hai — customer ko bulayein', { count: board.readyDelivery }), href: '/autoparts/jobs?view=ready' });
  if (board.waitingParts) attention.push({ icon: Package, tone: 'warning', text: t('{{count}} gaari parts ke intezar me hai', { count: board.waitingParts }), href: '/autoparts/jobs?view=waiting' });
  if (f.reminders.overdue.length) attention.push({ icon: Bell, tone: 'warning', text: t('{{count}} service reminder guzar gaye — customer ko call karein', { count: f.reminders.overdue.length }), href: '/autoparts/reminders' });
  if (f.reminders.papersTotal) attention.push({ icon: FileWarning, tone: 'info', text: t('{{count}} gaariyon ke kaghzat 30 din me khatam', { count: f.reminders.papersTotal }), href: '/autoparts/vehicles' });

  const actions: DashAction[] = [
    { href: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Parts bechein'), show: can(P.POS_USE) },
    { href: '/autoparts/jobs/new', icon: Zap, label: t('Naya job'), hint: t('Gaari receive karein'), show: can(P.SERVICE_JOBS_MANAGE) },
    { href: '/autoparts/jobs', icon: Wrench, label: t('Workshop jobs'), hint: f.jobs.overdue.length ? t('{{count}} late', { count: f.jobs.overdue.length }) : t('{{activeJobs}} chal rahe', { activeJobs: board.activeJobs }), show: can(P.SERVICE_JOBS_VIEW) },
    { href: '/autoparts/vehicles', icon: Car, label: t('Gaariyan'), hint: t('{{totalVehicles}} darj', { totalVehicles: board.totalVehicles }), show: can(P.CUSTOMERS_VIEW) },
    { href: '/autoparts/reminders', icon: Bell, label: t('Reminders'), hint: f.reminders.overdue.length ? t('{{count}} guzar gaye', { count: f.reminders.overdue.length }) : t('{{count}} aane wale', { count: f.reminders.upcoming.length }), show: can(P.CUSTOMERS_VIEW) },
    { href: '/autoparts/mechanics', icon: UserCog, label: t('Mechanic'), hint: t('{{totalMechanics}} log', { totalMechanics: board.totalMechanics }), show: can(P.SERVICE_JOBS_VIEW) },
    { href: '/products/new', icon: Plus, label: t('Naya part'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/products', icon: Package, label: t('Parts'), hint: t('Maal'), show: can(P.PRODUCTS_VIEW) },
    { href: '/autoparts/makes', icon: Truck, label: t('Company / model'), hint: t('Toyota, Suzuki…'), show: can(P.PRODUCTS_VIEW) },
    { href: '/customers', icon: Users, label: t('Customers'), hint: t('Khata'), show: can(P.CUSTOMERS_VIEW) },
    { href: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill'), show: can(P.SALES_VIEW) },
  ];

  return (
    <PackDashboard
      title={t('Auto Parts')}
      stats={[{ label: t('Chal rahe'), value: String(board.activeJobs) }, { label: t('Tayyar'), value: String(board.readyDelivery) }, { label: t('Aaj ki kamai'), value: formatMoney(board.today.revenue) }]}
      attention={attention}
      actions={actions}
      onRefresh={() => void f.q.refetch()}
      refreshing={f.q.isRefetching}
    >
      <CachedNote query={f.q} />
      <Card title={t('Workshop board')} description={t('Chal rahe, parts ke intezar me aur tayyar job')}>
        <Row gap={2} wrap>
          {[[t('Chal rahe'), board.activeJobs, 'accent'], [t('Parts ke intezar me'), board.waitingParts, 'warning'], [t('Tayyar'), board.readyDelivery, 'success']].map(([label, n, tone]) => (
            <View key={String(label)} style={{ flexGrow: 1, minWidth: '28%', alignItems: 'center', padding: th.space(2), borderRadius: th.radius('lg'), backgroundColor: th.colors[tone as 'accent'].soft }}><Text size="xl" weight="bold" ltr>{String(n)}</Text><Text size="2xs" tone="muted" align="center">{String(label)}</Text></View>
          ))}
        </Row>
        <Text size="xs" tone="muted" style={{ marginTop: 8 }}>{t('Is mahine {{count}} gaariyan · {{value}}', { count: board.monthly.jobCount, value: formatMoney(board.monthly.revenue) })}</Text>
      </Card>
      {f.jobs.list.length > 0 && (
        <Card flush title={t('Gaari kab deni hai')} description={t('Late aur aane wale job, waade ke waqt se')}>
          {f.jobs.list.map((j, i) => (
            <ListRow key={j.id} divider={i < f.jobs.list.length - 1} icon={Car} iconTone={j.left !== null && j.left < 0 ? 'danger' : 'info'} title={j.registrationNumber || vehicleName(j) || j.jobNumber}
              subtitle={`${[vehicleName(j), j.customerName].filter(Boolean).join(' · ')}${j.promisedAt ? ` · ${dateTime(j.promisedAt)}` : ''}`}
              trailing={<Badge tone={j.left !== null && j.left < 0 ? 'danger' : 'neutral'}>{j.left !== null && j.left < 0 ? t('Late') : j.due > 0 ? formatMoney(j.due) : t('Paid')}</Badge>} chevron onPress={() => router.push(`/autoparts/jobs/${j.id}` as never)} />
          ))}
        </Card>
      )}
      {f.reminders.list.length > 0 && (
        <Card flush title={t('Service reminder')} description={t('Oil change, service aur kaghzat ki yaad-dihani')}>
          {f.reminders.list.map((r, i) => (
            <ListRow key={r.id} divider={i < f.reminders.list.length - 1} icon={Bell} iconTone={r.left !== null && r.left < 0 ? 'danger' : 'warning'} title={r.title}
              subtitle={`${r.vehicle?.registrationNumber ?? ''}${r.dueDate ? ` · ${dayOnly(r.dueDate)}` : ''}${r.dueOdometerKm ? ` · ${km(r.dueOdometerKm)}` : ''}`} chevron onPress={() => router.push('/autoparts/reminders' as never)} />
          ))}
        </Card>
      )}
      {f.mechanics.length > 0 && (
        <Card flush title={t('Mechanic ka kaam')} description={t('30 din me mukammal job aur bill')}>
          {f.mechanics.map((m, i) => <ListRow key={m.mechanicId} divider={i < f.mechanics.length - 1} icon={UserCog} title={m.name || t('Mechanic')} subtitle={t('{{n}} job', { n: m.jobs })} trailing={<Text weight="semibold" ltr>{formatMoney(m.revenue)}</Text>} chevron onPress={() => router.push({ pathname: '/autoparts/jobs', params: { mechanic: m.mechanicId, view: 'all' } } as never)} />)}
        </Card>
      )}
    </PackDashboard>
  );
}
