/**
 * Restaurant dashboard (web restaurant/dashboard): today's sale and tips,
 * live orders (late and ready first), the table floor, the kitchen queue
 * with average times, open orders by type, and shortcuts to every
 * restaurant screen. Each block follows its own permission.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Bike, BookOpen, ChefHat, MapPin, Plus, ShoppingBag, ShoppingCart, Sparkles, Timer, Utensils, Zap, type LucideIcon,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { minutesSince, type OrderMode, type OrderStatus } from '@nafaa/core/restaurant';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission, type PermissionKey } from '@/core/permissions';
import { Amount, Card, EmptyState, HeroAmount, Icon, ListRow, PageHero, PressableScale, Row, Screen, StatTile, StatusPill, Text, useLayout, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { kotApi, ordersApi, restaurantDashboardApi, tablesApi } from '../api';
import { FLOOR_KEY, KOT_KEY, MODE_META, STATUS_META, duration, orderTitle } from '../meta';

const IN_KITCHEN: OrderStatus[] = ['PLACED', 'CONFIRMED', 'COOKING'];

interface Overview { today?: { revenue?: number; orders?: number; tips?: number; growthPercent?: number }; activeDeliveries?: number }
interface Perf { avgPrepMinutes?: number; avgServeMinutes?: number; totalCompleted?: number }

export function RestaurantDashboardScreen() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const can = usePermission();
  const seeMoney = can(P.DASHBOARD_VIEW) && can(P.REPORTS_VIEW);
  const floorQ = useQuery({ queryKey: [FLOOR_KEY], queryFn: () => tablesApi.floor(), refetchInterval: 30_000, enabled: can(P.RESTAURANT_ORDERS_VIEW) });
  const ordersQ = useQuery({ queryKey: ['restaurant-dashboard', 'open'], queryFn: () => ordersApi.list({ open: true }), refetchInterval: 20_000, enabled: can(P.RESTAURANT_ORDERS_VIEW) });
  const kotQ = useQuery({ queryKey: [KOT_KEY, 'active'], queryFn: () => kotApi.list({ active: true }), refetchInterval: 15_000, enabled: can(P.RESTAURANT_KITCHEN_VIEW) });
  const ovQ = useQuery({ queryKey: ['restaurant-dashboard', 'overview'], queryFn: () => restaurantDashboardApi.overview() as Promise<Overview>, refetchInterval: 60_000, enabled: seeMoney });
  const perfQ = useQuery({ queryKey: ['restaurant-dashboard', 'perf'], queryFn: () => restaurantDashboardApi.kitchenPerformance() as Promise<Perf>, refetchInterval: 60_000, enabled: can(P.RESTAURANT_KITCHEN_VIEW) });

  const orders = useMemo(() => {
    const open = (ordersQ.data ?? []).filter((o) => !o.saleId).map((o) => {
      const age = minutesSince(o.placedAt || o.createdAt);
      return { ...o, age, late: IN_KITCHEN.includes(o.status) && age > 20 };
    });
    const modes = new Map<OrderMode, { count: number; value: number }>();
    open.forEach((o) => { const m = modes.get(o.mode) ?? { count: 0, value: 0 }; modes.set(o.mode, { count: m.count + 1, value: m.value + o.total }); });
    return {
      open,
      late: open.filter((o) => o.late).length,
      ready: open.filter((o) => o.status === 'READY').length,
      value: open.reduce((s, o) => s + o.total, 0),
      modes: [...modes.entries()].sort((a, b) => b[1].count - a[1].count),
      list: [...open].sort((a, b) => Number(b.late) - Number(a.late) || Number(b.status === 'READY') - Number(a.status === 'READY') || b.age - a.age).slice(0, 8),
    };
  }, [ordersQ.data]);
  const st = floorQ.data?.stats;
  const kots = kotQ.data ?? [];
  const activeKots = kots.filter((k) => k.status !== 'SERVED' && k.status !== 'CANCELLED').length;
  const today = ovQ.data?.today;

  const actions: Array<{ href: string; icon: LucideIcon; label: string; perm?: PermissionKey }> = [
    { href: '/pos', icon: ShoppingCart, label: t('POS'), perm: P.POS_USE },
    { href: '/restaurant/orders/new', icon: Plus, label: t('Naya order'), perm: P.RESTAURANT_ORDERS_MANAGE },
    { href: '/restaurant/orders', icon: ShoppingBag, label: t('Orders'), perm: P.RESTAURANT_ORDERS_VIEW },
    { href: '/tables', icon: Utensils, label: t('Tables'), perm: P.RESTAURANT_ORDERS_VIEW },
    { href: '/kitchen', icon: Timer, label: t('Kitchen (KOT)'), perm: P.RESTAURANT_KITCHEN_VIEW },
    { href: '/restaurant/menu', icon: ChefHat, label: t('Menu'), perm: P.RESTAURANT_MENU_VIEW },
    { href: '/restaurant/modifiers', icon: Sparkles, label: t('Add-ons'), perm: P.RESTAURANT_MENU_VIEW },
    { href: '/restaurant/delivery', icon: MapPin, label: t('Delivery'), perm: P.RESTAURANT_ORDERS_VIEW },
    { href: '/restaurant/riders', icon: Bike, label: t('Riders'), perm: P.RESTAURANT_ORDERS_VIEW },
    { href: '/restaurant/recipes', icon: BookOpen, label: t('Recipes'), perm: P.RESTAURANT_KITCHEN_VIEW },
    { href: '/restaurant/happy-hours', icon: Zap, label: t('Happy hours'), perm: P.RESTAURANT_MENU_VIEW },
  ];
  const tileW = isTablet ? '23.5%' : '31.5%';

  return (
    <Screen title={t('Restaurant dashboard')} refreshing={ordersQ.isRefetching} onRefresh={() => { void ordersQ.refetch(); void floorQ.refetch(); void kotQ.refetch(); void ovQ.refetch(); }}>
      {seeMoney && (
        <PageHero title={t('Aaj')} loading={ovQ.isLoading}
          stats={[
            { label: t('Sale'), value: <HeroAmount value={today?.revenue ?? 0} size="2xl" /> },
            { label: t('Orders'), value: String(today?.orders ?? 0) },
            { label: t('Tip'), value: <HeroAmount value={today?.tips ?? 0} size="lg" /> },
          ]} />
      )}
      <CachedNote query={ordersQ} />
      <Row gap={2}>
        {can(P.RESTAURANT_ORDERS_VIEW) && <StatTile style={{ flex: 1 }} icon={ShoppingBag} tone={orders.late ? 'danger' : 'brand'} loading={ordersQ.isLoading} label={t('Chaalu orders')} value={String(orders.open.length)}
          hint={orders.late ? t('{{count}} late', { count: orders.late }) : orders.ready ? t('{{ready}} tayyar', { ready: orders.ready }) : <Amount value={orders.value} size="xs" tone="muted" />} onPress={() => router.push('/restaurant/orders' as never)} />}
        {can(P.RESTAURANT_ORDERS_VIEW) && <StatTile style={{ flex: 1 }} icon={Utensils} tone="success" loading={floorQ.isLoading} label={t('Tables')} value={st ? `${st.occupied} / ${st.total}` : '—'}
          hint={st ? t('{{available}} khaali', { available: st.available }) : undefined} onPress={() => router.push('/tables' as never)} />}
      </Row>
      {can(P.RESTAURANT_KITCHEN_VIEW) && (
        <Row gap={2}>
          <StatTile style={{ flex: 1 }} icon={Timer} tone="warning" loading={kotQ.isLoading} label={t('Kitchen')} value={String(activeKots)} hint={activeKots ? t('{{active}} queue me', { active: activeKots }) : t('Queue khaali')} onPress={() => router.push('/kitchen' as never)} />
          <StatTile style={{ flex: 1 }} icon={ChefHat} tone="info" loading={perfQ.isLoading} label={t('Ausat banane ka waqt')} value={duration(Math.round(Number(perfQ.data?.avgPrepMinutes ?? 0)))}
            hint={perfQ.data?.avgServeMinutes ? t('Serve {{value}}', { value: duration(Math.round(Number(perfQ.data.avgServeMinutes))) }) : undefined} />
        </Row>
      )}

      {can(P.RESTAURANT_ORDERS_VIEW) && (
        <Card title={t('Chaalu orders')} description={t('Khule orders, late aur tayyar sab se upar')} flush>
          {!orders.list.length ? <EmptyState compact title={t('Abhi koi order khula nahi')} /> : orders.list.map((o) => (
            <ListRow key={o.id} icon={MODE_META[o.mode].icon} iconTone={o.late ? 'danger' : MODE_META[o.mode].tone} title={orderTitle(o)} subtitle={`${o.orderNumber} · ${duration(Math.round(o.age))}`}
              trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}><Amount value={o.total} weight="bold" /><StatusPill tone={o.late ? 'danger' : STATUS_META[o.status].tone}>{o.late ? t('Late') : t(STATUS_META[o.status].label)}</StatusPill></View>}
              onPress={() => router.push(`/restaurant/orders/${o.id}` as never)} />
          ))}
        </Card>
      )}

      {orders.modes.length > 0 && (
        <Card title={t('Order type')}>
          <View style={{ gap: th.space(2) }}>
            {orders.modes.map(([m, v]) => (
              <Row key={m} gap={2}><Icon icon={MODE_META[m].icon} size={16} tone="muted" /><Text size="sm" style={{ flex: 1 }}>{`${t(MODE_META[m].label)} · ${v.count}`}</Text><Amount value={v.value} size="sm" weight="semibold" /></Row>
            ))}
          </View>
        </Card>
      )}

      <Card title={t('Jaldi kaam')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {actions.filter((a) => !a.perm || can(a.perm)).map((a) => (
            <PressableScale key={a.href} onPress={() => router.push(a.href as never)} haptic="tap"
              style={{ width: tileW, minHeight: 76, borderRadius: th.radius('lg'), padding: th.space(2), alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: th.colors.surfaceMuted }}>
              <Icon icon={a.icon} size={22} color={th.colors.brand.text} />
              <Text size="xs" weight="semibold" align="center" numberOfLines={2}>{a.label}</Text>
            </PressableScale>
          ))}
        </View>
      </Card>
    </Screen>
  );
}
