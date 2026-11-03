/**
 * Dairy dashboard (web dairy/dashboard): today's deliveries, milk bought from
 * gawale, subscriber volume and money owed both ways. Last loaded numbers show
 * offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BookOpen, Factory, FileText, Milk, Package, Plus, Route as RouteIcon, ShoppingCart, Truck, Users, Warehouse, Beaker, Wallet } from 'lucide-react-native';
import { useMemo } from 'react';
import { dailyLiters } from '@nafaa/core/industries/dairy';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Card, ListRow, Text } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote } from '../../_shared/deskKit';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { dairyCustomersApi, dairyDashboardApi, type DairyCustomer, type DairyOverview } from '../api';
import { DAIRY_KEYS, liters } from '../meta';

const n = (v: unknown) => Number(v || 0);

function useOps() {
  const overview = useQuery({ queryKey: [DAIRY_KEYS.overview], queryFn: () => dairyDashboardApi.overview().catch(() => ({} as DairyOverview)), refetchInterval: 60_000 });
  const customers = useQuery({ queryKey: [DAIRY_KEYS.overview, 'customers'], queryFn: () => dairyCustomersApi.list({}).catch(() => [] as DairyCustomer[]), refetchInterval: 60_000 });
  const o = overview.data ?? {};
  return useMemo(() => {
    const td = o.today ?? {};
    const scheduled = n(td.scheduledDeliveries);
    const delivered = n(td.deliveredCount);
    const list = Array.isArray(customers.data) ? customers.data : [];
    const active = list.filter((c) => c.status === 'ACTIVE');
    return {
      overview, scheduled, delivered, pending: Math.max(scheduled - delivered, 0), liters: n(td.deliveredLiters), revenue: n(td.deliveredRevenue),
      suppliedLiters: n(td.suppliedLiters), suppliedAmount: n(td.suppliedAmount), supplies: n(td.farmerSupplies),
      subscribers: { total: list.length, active: active.length, paused: list.filter((c) => c.status === 'SUSPENDED').length, daily: active.reduce((s, c) => s + dailyLiters(c), 0) },
      receivable: n(o.financials?.customerOutstanding), debtorCount: n(o.financials?.customerCount), farmerPayable: n(o.financials?.farmerPayable),
      month: { liters: n(o.monthly?.liters), revenue: n(o.monthly?.revenue), deliveries: n(o.monthly?.deliveries) },
      farmers: (o.topFarmers ?? []).map((f) => ({ id: f.farmer?.id ?? '', name: f.farmer?.name ?? t('Gawala'), liters: n(f.liters), amount: n(f.amount) })),
      debtors: (o.topDebtors ?? []).map((d) => ({ id: d.id, name: d.name, balance: n(d.currentBalance) })),
    };
  }, [o, customers.data, overview]);
}

export function DairyDashboardScreen() {
  const can = usePermission();
  const { cost } = useCostMask();
  const ops = useOps();

  const attention: DashAttention[] = [];
  if (ops.pending) attention.push({ icon: Truck, tone: 'warning', text: t('Aaj {{count}} ghar ki delivery baqi hai', { count: ops.pending }), href: '/dairy/deliveries' });
  if (ops.debtorCount) attention.push({ icon: Wallet, tone: 'danger', text: t('{{count}} customers ka {{amount}} baqi hai', { count: ops.debtorCount, amount: cost(ops.receivable) }), href: '/dairy/customers' });
  if (ops.farmerPayable > 0) attention.push({ icon: Milk, tone: 'info', text: t('Gawalon ko {{amount}} dena hai', { amount: cost(ops.farmerPayable) }), href: '/dairy/farmers' });
  if (ops.subscribers.paused) attention.push({ icon: Users, tone: 'neutral', text: t('{{count}} customers ki delivery ruki hui hai', { count: ops.subscribers.paused }), href: '/dairy/customers' });

  const actions: DashAction[] = [
    { href: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/dairy/deliveries', icon: Truck, label: t('Delivery'), hint: ops.pending ? t('{{count}} baqi', { count: ops.pending }) : t('Aaj ki list'), show: can(P.POS_USE) },
    { href: '/dairy/supplies', icon: Warehouse, label: t('Doodh aaya'), hint: t('Gawale ki entry'), show: can(P.PURCHASES_VIEW) },
    { href: '/dairy/customers', icon: Users, label: t('Customers'), hint: t('{{count}} chalu', { count: ops.subscribers.active }), show: can(P.CUSTOMERS_VIEW) },
    { href: '/dairy/bills', icon: FileText, label: t('Mahine ke bill'), hint: t('Statement'), show: can(P.KHATA_VIEW) },
    { href: '/dairy/farmers', icon: Milk, label: t('Gawale'), hint: t('Hisaab'), show: can(P.SUPPLIERS_VIEW) },
    { href: '/dairy/production', icon: Factory, label: t('Dahi / makhan'), hint: t('Banaya'), show: can(P.STOCK_MOVEMENTS_VIEW) },
    { href: '/dairy/routes', icon: RouteIcon, label: t('Routes'), hint: t('Delivery'), show: can(P.CUSTOMERS_VIEW) },
    { href: '/dairy/quality-tests', icon: Beaker, label: t('Quality tests'), hint: t('Fat, SNF'), show: can(P.PURCHASES_VIEW) },
    { href: '/products/new', icon: Plus, label: t('Nayi cheez'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/products', icon: Package, label: t('Maal'), hint: t('Sab cheezein'), show: can(P.PRODUCTS_VIEW) },
    { href: '/khata', icon: BookOpen, label: t('Khata'), hint: t('Udhaar'), show: can(P.KHATA_VIEW) },
  ];

  return (
    <PackDashboard title={t('Dairy')} onRefresh={() => void ops.overview.refetch()}
      stats={[
        { label: t('Doodh gaya'), value: liters(ops.liters) },
        { label: t('Doodh aaya'), value: liters(ops.suppliedLiters) },
        { label: t('Customers ka baqi'), value: cost(ops.receivable) },
      ]}
      attention={attention} actions={actions}>
      <OfflineNote feature="dairyDesk" />
      <CachedNote query={ops.overview} />
      <Card title={t('Aaj')} flush>
        <ListRow dense title={t('Delivery')} subtitle={`${ops.delivered} / ${ops.scheduled}`} trailing={<Amount value={ops.revenue} size="sm" weight="semibold" />} chevron onPress={() => router.push('/dairy/deliveries' as never)} />
        <ListRow dense title={t('Doodh aaya')} subtitle={t('{{totalSupplies}} parchi', { totalSupplies: ops.supplies })} trailing={<Amount value={ops.suppliedAmount} size="sm" weight="semibold" />} chevron onPress={() => router.push('/dairy/supplies' as never)} />
        <ListRow dense title={t('Roz ka doodh')} subtitle={t('{{count}} chalu', { count: ops.subscribers.active })} trailing={<Text size="sm" weight="semibold" ltr>{liters(ops.subscribers.daily)}</Text>} chevron onPress={() => router.push('/dairy/customers' as never)} />
      </Card>
      {ops.debtors.length > 0 && can(P.CUSTOMERS_VIEW) && (
        <Card flush title={t('Baqi wale customers')}>
          {ops.debtors.slice(0, 5).map((d, i, a) => <ListRow key={d.id} divider={i < a.length - 1} icon={Users} iconTone="danger" title={d.name} trailing={<Amount value={d.balance} size="sm" weight="semibold" tone="danger" />} chevron onPress={() => router.push(`/dairy/customers/${d.id}` as never)} />)}
        </Card>
      )}
      {ops.farmers.length > 0 && can(P.SUPPLIERS_VIEW) && (
        <Card flush title={t('Sab se zyada doodh dene wale')}>
          {ops.farmers.slice(0, 5).map((f, i, a) => <ListRow key={f.id || i} divider={i < a.length - 1} icon={Milk} iconTone="info" title={f.name} subtitle={liters(f.liters)} trailing={<Amount value={f.amount} size="sm" weight="semibold" />} />)}
        </Card>
      )}
    </PackDashboard>
  );
}
