/**
 * Hardware dashboard (web hardware/dashboard): contractor credit, deliveries,
 * construction projects, open quotations and reorder alerts, with quick
 * actions. Last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Award, BookOpen, Building2, CreditCard, FilePlus, FileText, Package, Plus, Receipt, RefreshCw, ShoppingCart, Truck } from 'lucide-react-native';
import { View } from 'react-native';
import { deliveredPct } from '@nafaa/core/industries/hardware';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Card, ListRow, ProgressBar, Text } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote } from '../../_shared/deskKit';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { deliveriesApi, hardwareDashboardApi, quotationsApi, type HardwareOverview } from '../api';
import { KEYS, challanStatus, shortDate } from '../meta';

const MIN = 60_000;

export function HardwareDashboardScreen() {
  const can = usePermission();
  const { cost } = useCostMask();
  const ov = useQuery({ queryKey: [KEYS.dashboard], queryFn: () => hardwareDashboardApi.overview().catch(() => ({} as HardwareOverview)), refetchInterval: MIN });
  const qs = useQuery({ queryKey: [KEYS.quoteSummary], queryFn: () => quotationsApi.summary().catch(() => null), refetchInterval: MIN });
  const ds = useQuery({ queryKey: [KEYS.deliverySummary], queryFn: () => deliveriesApi.summary().catch(() => null), refetchInterval: MIN });
  const o = ov.data ?? {};
  const credit = o.creditSummary ?? { totalOutstanding: 0, totalPurchases: 0, totalOverdue90Plus: 0 };
  const todayDeliveries = o.pending?.todayDeliveries ?? ds.data?.todayScheduled ?? 0;
  const openDeliveries = o.pending?.deliveries ?? 0;
  const pendingQuotes = qs.data?.pendingCount ?? o.pending?.quotations ?? 0;
  const reorder = o.pending?.lowStockCount ?? 0;
  const overdue = o.pending?.overdueAccounts ?? 0;
  const upcoming = (o.upcomingDeliveries ?? []).slice(0, 6);
  const sites = o.activeProjects ?? [];
  const debtors = (o.topDebtors ?? []).slice(0, 5);

  const attention: DashAttention[] = [];
  if (overdue) attention.push({ icon: AlertTriangle, tone: 'danger', text: t('{{n}} thekedar ka udhaar purana ho gaya', { n: overdue }), href: '/hardware/credit-accounts' });
  if (credit.totalOverdue90Plus > 0) attention.push({ icon: CreditCard, tone: 'danger', text: t('90 din se purana udhaar {{amount}}', { amount: cost(credit.totalOverdue90Plus) }), href: '/hardware/credit-accounts' });
  if (reorder) attention.push({ icon: RefreshCw, tone: 'warning', text: t('{{n}} items mangwane hain', { n: reorder }), href: '/hardware/reorder-rules' });
  if (todayDeliveries) attention.push({ icon: Truck, tone: 'info', text: t('Aaj {{n}} challan jane hain', { n: todayDeliveries }), href: '/hardware/deliveries' });
  if (pendingQuotes) attention.push({ icon: FileText, tone: 'info', text: t('{{n}} quotation ka jawab baqi hai', { n: pendingQuotes }), href: '/hardware/quotations' });
  if (qs.data?.expiredCount) attention.push({ icon: FileText, tone: 'warning', text: t('{{n}} quotation ka waqt guzar gaya', { n: qs.data.expiredCount }), href: '/hardware/quotations' });

  const actions: DashAction[] = [
    { href: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/hardware/quotations/new', icon: FilePlus, label: t('Nayi quotation'), hint: t('Bare order ka rate'), show: can(P.POS_USE) },
    { href: '/hardware/quotations', icon: FileText, label: t('Quotations'), hint: pendingQuotes ? t('{{n}} jawab baqi', { n: pendingQuotes }) : t('Sab dekhein') },
    { href: '/hardware/deliveries', icon: Truck, label: t('Challan'), hint: todayDeliveries ? t('{{n}} aaj', { n: todayDeliveries }) : t('{{n}} baqi', { n: openDeliveries }) },
    { href: '/hardware/projects', icon: Building2, label: t('Sites'), hint: t('{{n}} chal rahe', { n: o.totals?.activeProjects ?? sites.length }) },
    { href: '/hardware/credit-accounts', icon: CreditCard, label: t('Thekedar khata'), hint: cost(credit.totalOutstanding), show: can(P.KHATA_VIEW) },
    { href: '/hardware/reorder-rules', icon: RefreshCw, label: t('Reorder'), hint: reorder ? t('{{n}} mangwana', { n: reorder }) : t('Sab theek') },
    { href: '/products/new', icon: Plus, label: t('Naya product'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/products', icon: Package, label: t('Maal'), hint: t('Items ki list'), show: can(P.PRODUCTS_VIEW) },
    { href: '/brands', icon: Award, label: t('Brands'), hint: t('Company wise'), show: can(P.BRANDS_VIEW) },
    { href: '/khata', icon: BookOpen, label: t('Khata'), hint: t('Udhaar'), show: can(P.KHATA_VIEW) },
    { href: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
  ];

  return (
    <PackDashboard title={t('Hardware')} chip={t('Aaj')} onRefresh={() => { void ov.refetch(); void qs.refetch(); void ds.refetch(); }} refreshing={ov.isRefetching}
      stats={[{ label: t('Thekedar udhaar'), value: cost(credit.totalOutstanding) }, { label: t('Challan aaj'), value: String(todayDeliveries) }, { label: t('Quotation baqi'), value: String(pendingQuotes) }]}
      attention={attention} actions={actions}>
      <OfflineNote feature="hardwareDesk" />
      <CachedNote query={ov} />
      {upcoming.length > 0 && (
        <Card flush title={t('Aane wali delivery')}>
          {upcoming.map((d, i) => (
            <ListRow key={d.id} divider={i < upcoming.length - 1} icon={Truck} iconTone={challanStatus(d.status).tone} chevron onPress={() => router.push(`/hardware/deliveries/${d.id}` as never)}
              title={d.customerName} subtitle={[d.deliveryNumber, d.scheduledDate ? shortDate(d.scheduledDate) : t('Abhi tay nahi')].join(' · ')} trailing={<Badge tone={challanStatus(d.status).tone}>{challanStatus(d.status).label}</Badge>} />
          ))}
        </Card>
      )}
      {sites.length > 0 && (
        <Card flush title={t('Chalte projects')}>
          {sites.slice(0, 5).map((p, i) => {
            const pct = deliveredPct(Number(p.totalOrdered), Number(p.totalDelivered));
            return (
              <ListRow key={p.id} divider={i < Math.min(sites.length, 5) - 1} icon={Building2} iconTone="warning" chevron onPress={() => router.push(`/hardware/projects/${p.id}` as never)} title={p.name}
                subtitle={<View style={{ gap: 4 }}><Text size="xs" tone="muted">{p.customerName}</Text>{Number(p.totalOrdered) > 0 && <><ProgressBar value={pct / 100} /><Text size="2xs" tone="muted">{t('{{pct}}% pohancha · baqi {{amount}}', { pct, amount: formatMoney(Number(p.totalPending)) })}</Text></>}</View>} />
            );
          })}
        </Card>
      )}
      {debtors.length > 0 && can(P.KHATA_VIEW) && (
        <Card flush title={t('Contractor udhaar')}>
          {debtors.map((a, i) => (
            <ListRow key={a.id} divider={i < debtors.length - 1} icon={CreditCard} iconTone={a.creditLimit > 0 && a.currentBalance > a.creditLimit ? 'danger' : 'info'} chevron onPress={() => router.push('/hardware/credit-accounts' as never)}
              title={a.customerName} subtitle={a.ageOver90Days > 0 ? t('90+ din: {{amount}}', { amount: cost(a.ageOver90Days) }) : a.businessName} trailing={<Text size="sm" weight="bold" ltr>{cost(a.currentBalance)}</Text>} />
          ))}
        </Card>
      )}
    </PackDashboard>
  );
}
