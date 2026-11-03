/**
 * Furniture dashboard (web furniture/dashboard): custom order pipeline, late
 * orders, today's deliveries, carpenters, what needs attention and quick
 * actions. The last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CheckCircle2, ClipboardList, Clock, Hammer, PackageCheck, Plus, Receipt, ShoppingCart, Sofa, Truck, Users } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Avatar, Badge, Card, ListRow, ProgressBar, Row, Text, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { customOrdersApi, furnitureDashboardApi } from '../api';
import { FURNITURE_KEYS } from '../meta';

const DAY = 86_400_000;
interface OrderRow { id: string; orderNumber: string; customerName: string; productType: string; expectedDeliveryDate?: string | null; balanceAmount?: number | string | null }
interface DeliveryRow { id: string; deliveryNumber: string; customerName: string; itemsCount?: number; scheduledSlot?: string | null; status: string }
interface CarpenterRow { id: string; name: string; photoUrl?: string | null; completedProjects?: number; activeProjects?: number; totalRevenue?: number | string | null }
interface Overview {
  totals?: { totalProducts: number; totalCarpenters: number; activeCarpenters: number; activeCustomOrders: number; quotationOrders: number; completedCustomOrders: number };
  pending?: { deliveries: number; todayDeliveries: number; overdueOrders: number; quotationsToApprove: number };
  financial?: { monthlyCustomRevenue: number; totalReceivable: number; totalCollected: number };
  overdueOrders?: OrderRow[]; readyForDelivery?: OrderRow[]; todaySchedule?: DeliveryRow[]; topCarpenters?: CarpenterRow[];
}

function useOps() {
  const overview = useQuery({ queryKey: [FURNITURE_KEYS.dashboard], queryFn: () => furnitureDashboardApi.overview().then((r) => r as Overview).catch(() => null), refetchInterval: 60_000 });
  const summary = useQuery({ queryKey: [FURNITURE_KEYS.orders, 'summary'], queryFn: () => customOrdersApi.summary().catch(() => null), refetchInterval: 300_000 });
  return useMemo(() => {
    const o = overview.data;
    const s = summary.data;
    const now = Date.now();
    const overdue = (o?.overdueOrders ?? []).map((x) => ({ ...x, daysLate: x.expectedDeliveryDate ? Math.max(Math.ceil((now - new Date(x.expectedDeliveryDate).getTime()) / DAY), 1) : 0 }));
    const pipeline = [
      { key: 'quotation', label: t('Quotation'), count: s?.quotation ?? 0, tone: 'warning' as const },
      { key: 'deposit', label: t('Advance mila'), count: s?.deposit ?? 0, tone: 'info' as const },
      { key: 'production', label: t('Ban raha'), count: s?.production ?? 0, tone: 'brand' as const },
      { key: 'ready', label: t('Tayyar'), count: s?.ready ?? 0, tone: 'success' as const },
    ];
    return {
      q: overview,
      activeOrders: o?.totals?.activeCustomOrders ?? 0, quotations: o?.pending?.quotationsToApprove ?? o?.totals?.quotationOrders ?? 0,
      carpenters: o?.totals?.totalCarpenters ?? 0, activeCarpenters: o?.totals?.activeCarpenters ?? 0,
      pendingDeliveries: o?.pending?.deliveries ?? 0, todayDeliveries: o?.pending?.todayDeliveries ?? 0,
      monthRevenue: o?.financial?.monthlyCustomRevenue ?? 0, receivable: o?.financial?.totalReceivable ?? 0, collected: o?.financial?.totalCollected ?? 0,
      overdue, ready: o?.readyForDelivery ?? [], schedule: o?.todaySchedule ?? [], topCarpenters: o?.topCarpenters ?? [], pipeline,
      pipelineTotal: pipeline.reduce((a, p) => a + p.count, 0), delivered: (s?.delivered ?? 0) + (s?.completed ?? 0), products: o?.totals?.totalProducts ?? 0,
    };
  }, [overview, summary.data]);
}

export function FurnitureDashboardScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost, costHidden } = useCostMask();
  const f = useOps();

  const attention: DashAttention[] = [];
  if (f.overdue.length) attention.push({ icon: Clock, tone: 'danger', text: t('{{count}} custom order late hai — customer ko nayi date batayein', { count: f.overdue.length }), href: '/furniture/custom-orders' });
  if (f.ready.length) attention.push({ icon: PackageCheck, tone: 'warning', text: t('{{count}} order tayyar para hai — delivery schedule karein aur baqi paisa lein', { count: f.ready.length }), href: '/furniture/deliveries' });
  if (f.todayDeliveries) attention.push({ icon: Truck, tone: 'info', text: t('{{todayDeliveries}} delivery aaj jani hai', { todayDeliveries: f.todayDeliveries }), href: '/furniture/deliveries' });
  if (f.quotations) attention.push({ icon: ClipboardList, tone: 'info', text: t('{{quotations}} quotation customer ki haan ka intezar kar rahi hai — follow up karein', { quotations: f.quotations }), href: '/furniture/custom-orders' });

  const actions: DashAction[] = [
    { href: '/pos', icon: ShoppingCart, label: t('POS'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/furniture/custom-orders/new', icon: ClipboardList, label: t('Custom order'), hint: t('Naya order'), show: can(P.SERVICE_JOBS_MANAGE) },
    { href: '/furniture/custom-orders', icon: ClipboardList, label: t('Orders'), hint: t('{{activeOrders}} chaalu', { activeOrders: f.activeOrders }), show: can(P.SERVICE_JOBS_VIEW) },
    { href: '/furniture/deliveries', icon: Truck, label: t('Deliveries'), hint: f.todayDeliveries ? t('{{todayDeliveries}} aaj', { todayDeliveries: f.todayDeliveries }) : t('{{pendingDeliveries}} baqi', { pendingDeliveries: f.pendingDeliveries }), show: can(P.SERVICE_JOBS_VIEW) },
    { href: '/furniture/carpenters', icon: Hammer, label: t('Karigar'), hint: t('{{activeCarpenters}} kaam par', { activeCarpenters: f.activeCarpenters }), show: can(P.STAFF_VIEW) },
    { href: '/products/new', icon: Plus, label: t('Naya furniture'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/products', icon: Sofa, label: t('Maal'), hint: t('{{value}} cheezein', { value: f.products }), show: can(P.PRODUCTS_VIEW) },
    { href: '/customers', icon: Users, label: t('Customers'), hint: t('Khata'), show: can(P.CUSTOMERS_VIEW) },
    { href: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill'), show: can(P.SALES_VIEW) },
  ];

  return (
    <PackDashboard
      title={t('Furniture')}
      stats={[
        { label: t('Chaalu orders'), value: String(f.activeOrders) },
        { label: t('Late orders'), value: String(f.overdue.length) },
        { label: t('Aaj delivery'), value: String(f.todayDeliveries) },
      ]}
      attention={attention}
      actions={actions}
      onRefresh={() => void f.q.refetch()}
      refreshing={f.q.isRefetching}
    >
      <CachedNote query={f.q} />
      <Card title={t('Custom orders')} description={t('{{pipelineTotal}} chaalu · {{delivered}} de chuke', { pipelineTotal: f.pipelineTotal, delivered: f.delivered })}>
        {f.pipelineTotal === 0 ? <Text size="sm" tone="muted">{t('Abhi koi custom order nahi — naya order banayein, naap aur advance sab yahan nazar aayega.')}</Text> : (
          <View style={{ gap: th.space(3) }}>
            <Row gap={2} wrap>
              {f.pipeline.map((p) => <View key={p.key} style={{ minWidth: '22%', flexGrow: 1, alignItems: 'center', padding: th.space(2), borderRadius: th.radius('lg'), backgroundColor: th.colors[p.tone].soft }}><Text size="xl" weight="bold" ltr>{p.count}</Text><Text size="2xs" tone="muted" align="center">{p.label}</Text></View>)}
            </Row>
            {!costHidden && (f.receivable > 0 || f.monthRevenue > 0) && (
              <Row justify="between"><Text size="sm" tone="muted">{t('Baqi lena')} <Text size="sm" weight="bold" tone="warning">{cost(f.receivable)}</Text></Text><Text size="sm" tone="muted">{t('Mahine ki kamai')} <Text size="sm" weight="bold">{cost(f.monthRevenue)}</Text></Text></Row>
            )}
          </View>
        )}
      </Card>
      {f.overdue.length > 0 && (
        <Card flush title={t('Late orders')} description={t('Delivery ki date guzar gayi')}>
          {f.overdue.slice(0, 6).map((o, i) => (
            <ListRow key={o.id} divider={i < Math.min(f.overdue.length, 6) - 1} icon={Clock} iconTone="danger" title={o.customerName || t('Customer')}
              subtitle={`${o.orderNumber} · ${o.productType}${Number(o.balanceAmount) > 0 ? t(' · baqi {{cost}}', { cost: cost(Number(o.balanceAmount)) }) : ''}`}
              trailing={<Badge tone="danger">{t('{{daysLate}} din late', { daysLate: o.daysLate })}</Badge>} chevron onPress={() => router.push(`/furniture/custom-orders/${o.id}` as never)} />
          ))}
        </Card>
      )}
      <Card flush title={t('Aaj ki deliveries')} description={t('{{count}} aaj · {{pendingDeliveries}} baqi kul', { count: f.schedule.length, pendingDeliveries: f.pendingDeliveries })}>
        {f.schedule.length === 0 ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Aaj koi delivery nahi')}</Text></View> : f.schedule.slice(0, 6).map((d, i) => {
          const done = d.status === 'DELIVERED' || d.status === 'COMPLETED';
          return (
            <ListRow key={d.id} divider={i < Math.min(f.schedule.length, 6) - 1} icon={done ? CheckCircle2 : Truck} iconTone={done ? 'success' : 'info'} title={d.customerName || t('Customer')}
              subtitle={`${d.deliveryNumber}${d.itemsCount ? t(' · {{itemsCount}} items', { itemsCount: d.itemsCount }) : ''}`}
              trailing={<Badge tone={done ? 'success' : 'neutral'}>{done ? t('Pohanch gaya') : d.scheduledSlot || t('Kisi bhi waqt')}</Badge>} chevron onPress={() => router.push(`/furniture/deliveries/${d.id}` as never)} />
          );
        })}
      </Card>
      {f.topCarpenters.length > 0 && (
        <Card flush title={t('Karigar')} description={t('{{activeCarpenters}}/{{carpenters}} kaam par', { activeCarpenters: f.activeCarpenters, carpenters: f.carpenters })}>
          {f.topCarpenters.slice(0, 6).map((c, i) => (
            <ListRow key={c.id} divider={i < Math.min(f.topCarpenters.length, 6) - 1} avatar={<Avatar name={c.name} url={c.photoUrl ?? undefined} size={36} />} title={c.name}
              subtitle={t('{{value}} chaalu · {{value2}} mukammal', { value: c.activeProjects ?? 0, value2: c.completedProjects ?? 0 })}
              trailing={<Text size="sm" weight="semibold" ltr>{formatMoney(Number(c.totalRevenue || 0))}</Text>} chevron onPress={() => router.push(`/furniture/carpenters/${c.id}` as never)} />
          ))}
        </Card>
      )}
    </PackDashboard>
  );
}
