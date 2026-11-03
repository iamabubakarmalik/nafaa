/**
 * Meat dashboard (web meat/dashboard): weight orders in progress, orders late or
 * ready, livestock on hand, cutting jobs, halal compliance and the supply
 * plan deliveries due. Last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Beef, Building2, CalendarClock, Gauge, Heart, Package, Plus, Scissors, ShieldCheck, ShoppingCart } from 'lucide-react-native';
import { useMemo } from 'react';
import { dueOf, isLateOrder } from '@nafaa/core/industries/meat';
import { formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Card, ListRow } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote } from '../../_shared/deskKit';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { cuttingJobsApi, liveAnimalsApi, meatDashboardApi, slaughterApi, weightOrdersApi } from '../api';
import { MEAT_KEYS, ORDER_STATUS, animalText, kg } from '../meta';

const n = (v: unknown) => Number(v || 0);
const OPEN = ['CONFIRMED', 'PROCESSING', 'CUTTING', 'PACKED', 'READY', 'OUT_FOR_DELIVERY'];
const hoursTo = (iso?: string | null) => (iso ? (new Date(iso).getTime() - Date.now()) / 3_600_000 : null);
interface Overview { totals?: { activeSubscriptions?: number; activeQurbani?: number; wholesaleAccounts?: number }; revenue?: { today?: number | string; monthly?: number | string }; upcomingSubs?: Array<{ id: string; subscriptionNumber: string; contactPerson?: string; nextDeliveryDate?: string }> }

function useOps() {
  const overview = useQuery({ queryKey: [MEAT_KEYS.overview], queryFn: () => meatDashboardApi.overview().catch(() => ({})) as Promise<Overview>, refetchInterval: 60_000 });
  const live = useQuery({ queryKey: [MEAT_KEYS.animals, 'summary'], queryFn: () => liveAnimalsApi.summary().catch(() => null), refetchInterval: 60_000 });
  const halalQ = useQuery({ queryKey: [MEAT_KEYS.slaughter, 'halal-all'], queryFn: () => slaughterApi.halalCompliance().catch(() => null), refetchInterval: 300_000 });
  const ordersQ = useQuery({ queryKey: [MEAT_KEYS.orders, 'dash-open'], queryFn: () => weightOrdersApi.list({}).catch(() => []), refetchInterval: 60_000 });
  const cuttingQ = useQuery({ queryKey: [MEAT_KEYS.cutting, 'IN_PROGRESS'], queryFn: () => cuttingJobsApi.list({ status: 'IN_PROGRESS' }).catch(() => []), refetchInterval: 60_000 });
  const o = overview.data ?? {};
  return useMemo(() => {
    const open = (Array.isArray(ordersQ.data) ? ordersQ.data : []).filter((w) => OPEN.includes(w.status)).map((w) => ({ ...w, left: hoursTo(w.neededBy || w.scheduledDelivery), due: dueOf(n(w.total), n(w.paidAmount)), kg: (w.items ?? []).reduce((s, i) => s + n(i.actualKg ?? i.requestedKg), 0) }));
    const subs = (o.upcomingSubs ?? []).map((s) => ({ ...s, left: hoursTo(s.nextDeliveryDate) }));
    const types = (live.data?.byType ?? []).map((x) => ({ type: x.animalType, count: n(x._count?._all), kg: n(x._sum?.weightKg) })).sort((a, b) => b.count - a.count);
    return {
      overview, open, late: open.filter((w) => isLateOrder(w)), ready: open.filter((w) => w.status === 'READY'), due: open.reduce((s, w) => s + w.due, 0),
      list: [...open].sort((a, b) => (a.left ?? 99_999) - (b.left ?? 99_999)).slice(0, 6),
      alive: n(live.data?.aliveCount), liveKg: types.reduce((s, x) => s + x.kg, 0), types,
      invested: n(live.data?.totalCost?._sum?.purchasePrice) + n(live.data?.totalCost?._sum?.totalFeedCost),
      halalPct: halalQ.data && halalQ.data.total > 0 ? halalQ.data.halalPct : 100, halalTotal: n(halalQ.data?.total),
      cutting: (Array.isArray(cuttingQ.data) ? cuttingQ.data : []).filter((j) => j.status !== 'COMPLETED'),
      subsDue: subs.filter((s) => s.left !== null && s.left <= 24), subs,
      today: n(o.revenue?.today), month: n(o.revenue?.monthly), qurbani: n(o.totals?.activeQurbani), wholesale: n(o.totals?.wholesaleAccounts),
    };
  }, [o, ordersQ.data, live.data, halalQ.data, cuttingQ.data, overview]);
}

export function MeatDashboardScreen() {
  const can = usePermission();
  const { cost } = useCostMask();
  const ops = useOps();

  const attention: DashAttention[] = [];
  if (ops.late.length) attention.push({ icon: AlertTriangle, tone: 'danger', text: t('{{count}} order late hain', { count: ops.late.length }), href: '/meat/weight-orders' });
  if (ops.ready.length) attention.push({ icon: Package, tone: 'warning', text: t('{{data}} order tayyar — bill bana kar dein', { data: ops.ready.length }), href: '/meat/weight-orders?tab=ready' });
  if (ops.cutting.length) attention.push({ icon: Scissors, tone: 'info', text: t('{{count}} cutting ka kaam mukammal karna baqi hai', { count: ops.cutting.length }), href: '/meat/cutting' });
  if (ops.subsDue.length) attention.push({ icon: CalendarClock, tone: 'info', text: t('{{count}} supply plan ki delivery aaj / kal hai', { count: ops.subsDue.length }), href: '/meat/subscriptions' });
  if (ops.halalTotal > 0 && ops.halalPct < 100) attention.push({ icon: ShieldCheck, tone: 'warning', text: t('Halal record {{pct}}% hai', { pct: Math.round(ops.halalPct) }), href: '/meat/slaughter' });

  const actions: DashAction[] = [
    { href: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/meat/rates', icon: Gauge, label: t('Aaj ka rate'), hint: t('Din ka hisaab'), show: can(P.STOCK_MOVEMENTS_VIEW) },
    { href: '/meat/weight-orders/new', icon: Plus, label: t('Naya order'), hint: t('Wazan wala'), show: can(P.POS_USE) },
    { href: '/meat/weight-orders', icon: Package, label: t('Orders'), hint: ops.open.length ? t('{{count}} chal rahe', { count: ops.open.length }) : t('Sab dekhein'), show: can(P.SALES_VIEW) },
    { href: '/meat/live-animals', icon: Heart, label: t('Livestock'), hint: t('{{count}} baara me', { count: ops.alive }), show: can(P.PRODUCTS_VIEW) },
    { href: '/meat/slaughter', icon: ShieldCheck, label: t('Zibah'), hint: t('Halal'), show: can(P.PRODUCTS_VIEW) },
    { href: '/meat/cutting', icon: Scissors, label: t('Cutting'), hint: ops.cutting.length ? t('{{count}} chal raha', { count: ops.cutting.length }) : t('Boneless, qeema'), show: can(P.PRODUCTS_VIEW) },
    { href: '/meat/wholesale', icon: Building2, label: t('Restaurants'), hint: t('{{count}} accounts', { count: ops.wholesale }), show: can(P.CUSTOMERS_VIEW) },
    { href: '/meat/subscriptions', icon: CalendarClock, label: t('Supply plans'), hint: t('{{count}} chalu', { count: n(ops.overview.data?.totals?.activeSubscriptions) }), show: can(P.CUSTOMERS_VIEW) },
    { href: '/meat/qurbani', icon: Beef, label: t('Qurbani'), hint: t('{{count}} chal rahi', { count: ops.qurbani }), show: can(P.SALES_VIEW) },
    { href: '/products/new', icon: Plus, label: t('Nayi cheez'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
  ];

  return (
    <PackDashboard title={t('Meat')} onRefresh={() => void ops.overview.refetch()}
      stats={[{ label: t('Aaj ki sale'), value: cost(ops.today) }, { label: t('Chal rahe orders'), value: String(ops.open.length) }, { label: t('Baara me'), value: String(ops.alive) }]}
      attention={attention} actions={actions}>
      <OfflineNote feature="meatDesk" />
      <CachedNote query={ops.overview} />
      {ops.list.length > 0 && can(P.SALES_VIEW) && (
        <Card flush title={t('Orders')} description={t('Baqi {{amount}}', { amount: cost(ops.due) })}>
          {ops.list.map((w, i) => (
            <ListRow key={w.id} divider={i < ops.list.length - 1} icon={Package} iconTone={isLateOrder(w) ? 'danger' : ORDER_STATUS[w.status].tone} title={w.customerName ?? w.orderNumber}
              subtitle={`${kg(w.kg)}${w.neededBy ? ` · ${formatDateTime(w.neededBy)}` : ''}`} trailing={<Badge tone={ORDER_STATUS[w.status].tone}>{t(ORDER_STATUS[w.status].label)}</Badge>} chevron onPress={() => router.push('/meat/weight-orders' as never)} />
          ))}
        </Card>
      )}
      {ops.types.length > 0 && can(P.PRODUCTS_VIEW) && (
        <Card flush title={t('Baara me janwar — type ke hisaab se')} description={`${kg(ops.liveKg)} · ${cost(ops.invested)}`}>
          {ops.types.map((x, i) => <ListRow key={x.type} divider={i < ops.types.length - 1} dense title={animalText(x.type)} trailing={<Amount value={x.count} size="sm" bare weight="semibold" />} subtitle={kg(x.kg)} />)}
        </Card>
      )}
    </PackDashboard>
  );
}
