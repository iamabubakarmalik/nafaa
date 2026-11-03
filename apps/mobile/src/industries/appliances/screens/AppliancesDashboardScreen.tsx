/**
 * Appliances dashboard (web appliances/dashboard): field work (repairs and
 * installations), what needs attention, service health, revenue by stream and
 * quick actions. Last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Barcode, BookOpen, FileSignature, HardHat, Package, Plus, Receipt, Recycle, Shield, ShoppingCart, Truck, UserX, Users, Wrench, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { SERVICE_OPEN } from '@nafaa/core/industries/appliances';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Card, HBarList, ListRow, Row, Skeleton, Text, useTheme, type StatusTone } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { businessDayKey } from '@/core/format';
import { OfflineNote } from '../../_shared/deskKit';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { amcContractsApi, appliancesAnalyticsApi, applianceSerialApi, deliveriesApi, installationsApi, serviceRequestsApi, techniciansApi, warrantyClaimsApi, type Installation, type ServiceRequest } from '../api';
import { KEYS, installStatus, serviceStatus } from '../meta';
import { slotLabel } from '../../_shared/trade/desk';

const MIN = 60_000;
const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

function useOps() {
  const range = useMemo(() => { const to = businessDayKey(); const from = businessDayKey(Date.now() - 30 * 86_400_000); return { from, to }; }, []);
  const profit = useQuery({ queryKey: [KEYS.profit, range], queryFn: () => safe(appliancesAnalyticsApi.profit(range), null), staleTime: 5 * MIN });
  const svc = useQuery({ queryKey: [KEYS.service, 'summary'], queryFn: () => safe(serviceRequestsApi.summary(), null), refetchInterval: MIN });
  const inst = useQuery({ queryKey: [KEYS.install, 'summary'], queryFn: () => safe(installationsApi.summary(), null), refetchInterval: MIN });
  const tech = useQuery({ queryKey: [KEYS.tech, 'summary'], queryFn: () => safe(techniciansApi.summary(), null), refetchInterval: 5 * MIN });
  const amc = useQuery({ queryKey: [KEYS.amc, 'summary'], queryFn: () => safe(amcContractsApi.summary(), null), refetchInterval: 5 * MIN });
  const del = useQuery({ queryKey: [KEYS.delivery, 'summary'], queryFn: () => safe(deliveriesApi.summary(), null), refetchInterval: MIN });
  const serial = useQuery({ queryKey: [KEYS.serial, 'summary'], queryFn: () => safe(applianceSerialApi.summary(), null), refetchInterval: 5 * MIN });
  const claims = useQuery({ queryKey: [KEYS.claim, 'summary'], queryFn: () => safe(warrantyClaimsApi.summary(), null), refetchInterval: 5 * MIN });
  const queue = useQuery({ queryKey: [KEYS.service, 'queue'], queryFn: () => safe(serviceRequestsApi.queue(), [] as ServiceRequest[]), refetchInterval: MIN });
  const today = useQuery({ queryKey: [KEYS.install, 'today'], queryFn: () => safe(installationsApi.today(), [] as Installation[]), refetchInterval: MIN });
  return { profit: profit.data, svc: svc.data, inst: inst.data, tech: tech.data, amc: amc.data, del: del.data, serial: serial.data, claims: claims.data, queue: queue.data ?? [], today: today.data ?? [], loading: svc.isLoading || inst.isLoading, svcQ: svc, refetch: () => [profit, svc, inst, tech, amc, del, serial, claims, queue, today].forEach((q) => void q.refetch()), refreshing: svc.isRefetching };
}

interface FieldJob { id: string; kind: 'repair' | 'install'; customer: string; detail: string; number: string; label: string; tone: StatusTone; slot?: string; late: boolean; urgent: boolean; href: string }

export function AppliancesDashboardScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost } = useCostMask();
  const o = useOps();
  const { svc, inst, tech, amc, del, claims, serial, profit } = o;

  const jobs = useMemo(() => {
    const repairs: FieldJob[] = o.queue.filter((s) => SERVICE_OPEN.includes(s.status)).map((s) => ({
      id: s.id, kind: 'repair', customer: s.customerName, detail: `${s.productName} — ${s.reportedIssue}`, number: s.requestNumber, label: serviceStatus(s.status).label, tone: serviceStatus(s.status).tone,
      slot: s.scheduledTimeSlot, late: !!s.isOverdue, urgent: s.priority === 'URGENT', href: `/appliances/service-requests/${s.id}`,
    }));
    const installs: FieldJob[] = o.today.map((i) => ({
      id: i.id, kind: 'install', customer: i.customerName, detail: i.productName, number: i.installationNumber, label: installStatus(i.status).label, tone: installStatus(i.status).tone,
      slot: i.scheduledTimeSlot, late: false, urgent: false, href: `/appliances/installations/${i.id}`,
    }));
    const rank = (j: FieldJob) => (j.late ? 0 : j.urgent ? 1 : 2);
    return [...installs, ...repairs].sort((a, b) => rank(a) - rank(b)).slice(0, 8);
  }, [o.queue, o.today]);

  const unassigned = (svc?.unassigned ?? 0) + (inst?.unassigned ?? 0);
  const outstanding = Number(svc?.month?.outstanding ?? 0) + Number(inst?.month?.outstanding ?? 0);
  const streams = (profit?.streams ?? []).filter((s) => s.revenue > 0).sort((a, b) => b.revenue - a.revenue);

  const attention: DashAttention[] = [];
  if (svc?.urgent) attention.push({ icon: AlertTriangle, tone: 'danger', text: t('{{n}} foran shikayat khuli hain', { n: svc.urgent }), href: '/appliances/service-requests' });
  if (svc?.overdue) attention.push({ icon: AlertTriangle, tone: 'danger', text: t('{{n}} repair late hain', { n: svc.overdue }), href: '/appliances/service-requests' });
  if (inst?.overdue) attention.push({ icon: AlertTriangle, tone: 'warning', text: t('{{n}} installation ki date guzar gayi', { n: inst.overdue }), href: '/appliances/installations' });
  if (unassigned) attention.push({ icon: UserX, tone: 'warning', text: t('{{n}} kaam par banda nahi laga', { n: unassigned }), href: '/appliances/service-requests' });
  if (del?.noVehicle) attention.push({ icon: Truck, tone: 'warning', text: t('{{n}} deliveries ki gaari nahi lagi', { n: del.noVehicle }), href: '/appliances/deliveries' });
  if (amc?.expiringSoon) attention.push({ icon: FileSignature, tone: 'info', text: t('{{n}} AMC 30 din me khatam — renew ka phone karein', { n: amc.expiringSoon }), href: '/appliances/amc-contracts' });
  if (claims?.missing.count) attention.push({ icon: Shield, tone: 'warning', text: t('{{n}} warranty repair ka claim nahi bana — {{amount}} wapas ho sakta hai', { n: claims.missing.count, amount: formatMoney(claims.missing.recoverable) }), href: '/appliances/warranty-claims/missing' });
  if (claims?.stale) attention.push({ icon: Shield, tone: 'info', text: t('{{n}} claims 30 din se company ke paas', { n: claims.stale }), href: '/appliances/warranty-claims' });
  if (inst?.month && outstanding > 0) attention.push({ icon: Receipt, tone: 'info', text: t('{{amount}} jobs ka paisa baqi hai', { amount: formatMoney(outstanding) }), href: '/appliances/service-requests' });

  const actions: DashAction[] = [
    { href: '/pos', icon: ShoppingCart, label: t('POS counter'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/appliances/service-requests', icon: Wrench, label: t('Repair'), hint: svc?.open ? t('{{n}} khule', { n: svc.open }) : t('Kaam darj karein') },
    { href: '/appliances/installations', icon: HardHat, label: t('Installation'), hint: t('{{n}} aaj', { n: inst?.todayJobs ?? 0 }) },
    { href: '/appliances/deliveries', icon: Truck, label: t('Delivery'), hint: t('{{n}} baqi', { n: del?.open ?? 0 }) },
    { href: '/appliances/technicians', icon: Users, label: t('Technicians'), hint: t('{{n}} khali', { n: tech?.free ?? 0 }) },
    { href: '/appliances/amc-contracts', icon: FileSignature, label: t('AMC'), hint: t('{{n}} chal rahe', { n: amc?.active ?? 0 }) },
    { href: '/appliances/warranty-claims', icon: Shield, label: t('Warranty claims'), hint: t('{{n}} khule', { n: claims?.open ?? 0 }) },
    { href: '/appliances/serials', icon: Barcode, label: t('Serial register'), hint: t('Unit ka safar') },
    { href: '/appliances/trade-ins', icon: Recycle, label: t('Old items'), hint: t('Purana saman') },
    { href: '/products/new', icon: Plus, label: t('Naya product'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/products', icon: Package, label: t('Products'), hint: t('Maal ki list'), show: can(P.PRODUCTS_VIEW) },
    { href: '/khata', icon: BookOpen, label: t('Khata'), hint: t('Udhaar'), show: can(P.KHATA_VIEW) },
  ];

  return (
    <PackDashboard
      title={t('Appliances')} chip={t('Aaj')} onRefresh={o.refetch} refreshing={o.refreshing}
      stats={[
        { label: t('Khule repair'), value: String(svc?.open ?? 0) }, { label: t('Installation aaj'), value: String(inst?.todayJobs ?? 0) },
        { label: t('Khuli delivery'), value: String(del?.open ?? 0) },
        ...(streams.length ? [{ label: t('Is mahine ki kamai'), value: cost(profit?.totals?.revenue) }] : []),
      ]}
      attention={attention} actions={actions}>
      <OfflineNote feature="appliancesDesk" />
      <CachedNote query={o.svcQ} />
      <Card flush title={t('Aaj ka field kaam')}>
        {o.loading ? <View style={{ padding: th.space(3) }}><Skeleton height={80} /></View> : jobs.length === 0 ? (
          <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Aaj koi field kaam nahi')}</Text></View>
        ) : jobs.map((j, i) => (
          <ListRow key={`${j.kind}${j.id}`} divider={i < jobs.length - 1} icon={j.kind === 'repair' ? Wrench : HardHat} iconTone={j.late || j.urgent ? 'danger' : j.tone} chevron onPress={() => router.push(j.href as never)}
            title={j.customer} subtitle={<View style={{ gap: 2 }}><Text size="xs" tone="muted" numberOfLines={1}>{j.detail}</Text><Row gap={1}><Badge tone={j.tone}>{j.label}</Badge>{j.slot ? <Badge>{slotLabel(j.slot)}</Badge> : null}{j.late ? <Badge tone="danger">{t('Late')}</Badge> : null}</Row></View>} />
        ))}
      </Card>
      {streams.length > 0 && (
        <Card title={t('Kamai kahan se')}>
          <HBarList colorful rows={streams.map((s) => ({ key: s.key, label: s.label ?? s.key, value: s.revenue, display: <Text size="xs" tone="muted" ltr>{formatMoney(s.revenue)}</Text> }))} />
        </Card>
      )}
      {serial && (
        <Card title={t('Serial stock')}>
          <Row gap={3} wrap>
            <Text size="sm">{t('Stock me: {{n}}', { n: serial.inStock.units })}</Text>
            <Text size="sm">{t('Bik gaye: {{n}}', { n: serial.sold.units })}</Text>
            {serial.warrantyExpiringSoon > 0 && <Text size="sm" tone="warning">{t('Warranty khatam hone wali: {{n}}', { n: serial.warrantyExpiringSoon })}</Text>}
          </Row>
        </Card>
      )}
      {tech && tech.leaderboard.length > 0 && (
        <Card title={t('Technicians')}>
          <HBarList colorful rows={tech.leaderboard.slice(0, 5).map((x) => ({ key: x.id, label: x.name, value: x.monthRevenue, display: <Text size="xs" tone="muted">{`${x.openJobs} ${t('khule')} · ${x.monthJobs}`}</Text> }))} />
        </Card>
      )}
    </PackDashboard>
  );
}
