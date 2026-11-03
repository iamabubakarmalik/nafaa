/**
 * Florist dashboard (web florist/dashboard): today's deliveries, upcoming
 * weddings, flowers about to wilt, subscription bouquets due, what needs
 * attention and quick actions. Last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Flower2, Heart, Leaf, Plus, Receipt, Repeat, ShoppingCart, Truck, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { weddingDue } from '@nafaa/core/industries/florist';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Card, HeroText, ListRow, PageHero, PressableScale, Screen, Text, useLayout, useTheme, type StatusTone } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote } from '../../_shared/deskKit';
import { floristDashboardApi, type FloristOverview } from '../api';
import { FLORIST_KEYS, ORDER_STATUS, slotLabel } from '../meta';

const n = (v: unknown) => Number(v || 0);
const DAY = 86_400_000;
const daysTo = (iso?: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / DAY) : null);

function useOps() {
  const q = useQuery({ queryKey: [FLORIST_KEYS.overview], queryFn: () => floristDashboardApi.overview().catch(() => ({} as FloristOverview)), refetchInterval: 60_000 });
  const o = q.data ?? {};
  return useMemo(() => {
    const list = o.todayScheduledDeliveries ?? [];
    const weddings = (o.upcomingWeddingList ?? []).map((w) => ({ ...w, days: daysTo(w.weddingDate) ?? 0, balance: weddingDue(w) }));
    const wilt = (o.witheringProducts ?? []).map((p) => ({ ...p, days: daysTo(p.freshUntil) }));
    const subs = (o.dueSubscriptions ?? []).map((s) => ({ ...s, days: daysTo(s.nextDeliveryDate) }));
    return {
      q, list, weddings, wilt, subs,
      notReady: list.filter((d) => d.status === 'CONFIRMED' || d.status === 'IN_PREPARATION').length,
      withered: wilt.filter((p) => p.days !== null && p.days <= 0).length, soon: n(o.totals?.witheringSoon),
      soonWeddings: weddings.filter((w) => w.days <= 3).length, unconfirmed: weddings.filter((w) => w.status === 'QUOTED').length,
      subsToday: subs.filter((s) => s.days !== null && s.days <= 1).length, active: n(o.totals?.activeOrders), deliveredToday: n(o.totals?.deliveredToday),
      weddingCount: n(o.totals?.upcomingWeddings) || weddings.length, subsActive: n(o.totals?.activeSubscriptions),
    };
  }, [o, q]);
}

export function FloristDashboardScreen() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const can = usePermission();
  const ops = useOps();

  const attention: Array<{ icon: LucideIcon; tone: StatusTone; text: string; href: string }> = [];
  if (ops.withered) attention.push({ icon: Leaf, tone: 'danger', text: t('{{count}} phool murjha chuke — shelf se hatayein', { count: ops.withered }), href: '/florist/freshness' });
  if (ops.notReady) attention.push({ icon: Truck, tone: 'warning', text: t('{{notReady}} delivery aaj ki hai aur bouquet abhi tayyar nahi', { notReady: ops.notReady }), href: '/florist/orders?tab=today' });
  if (ops.soonWeddings) attention.push({ icon: Heart, tone: 'warning', text: t('{{count}} shadi 3 din ke andar — phool aur setup ka intezam karein', { count: ops.soonWeddings }), href: '/florist/weddings' });
  if (ops.soon > 0) attention.push({ icon: Leaf, tone: 'warning', text: t('{{soon}} phool 3 din me murjha jayenge — discount laga dein', { soon: ops.soon }), href: '/florist/freshness' });
  if (ops.subsToday) attention.push({ icon: Repeat, tone: 'info', text: t('{{count}} subscription bouquet kal tak dena hai', { count: ops.subsToday }), href: '/florist/subscriptions' });
  if (ops.unconfirmed) attention.push({ icon: AlertTriangle, tone: 'neutral', text: t('{{count}} shadi ka quote abhi pakka nahi hua', { count: ops.unconfirmed }), href: '/florist/weddings' });

  const actions: Array<{ href: string; icon: LucideIcon; label: string; hint: string; show: boolean }> = [
    { href: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/florist/orders?tab=today', icon: Truck, label: t("Today's deliveries"), hint: t('{{count}} aaj', { count: ops.list.length }), show: can(P.POS_USE) },
    { href: '/florist/orders', icon: Receipt, label: t('Orders'), hint: t('{{count}} chalu', { count: ops.active }), show: can(P.POS_USE) },
    { href: '/florist/weddings', icon: Heart, label: t('Wedding contracts'), hint: t('{{count}} aane wali', { count: ops.weddingCount }), show: can(P.POS_USE) },
    { href: '/florist/subscriptions', icon: Repeat, label: t('Subscriptions'), hint: t('{{count}} chalu', { count: ops.subsActive }), show: can(P.POS_USE) },
    { href: '/florist/freshness', icon: Leaf, label: t('Freshness'), hint: ops.withered ? t('{{count}} murjha', { count: ops.withered }) : t('Sab theek'), show: can(P.PRODUCTS_VIEW) },
    { href: '/products/new', icon: Plus, label: t('Nayi cheez'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/products', icon: Flower2, label: t('Products'), hint: t('Phool aur bouquet'), show: can(P.PRODUCTS_VIEW) },
  ].filter((a) => a.show);
  const cols = isTablet ? 5 : 3;

  return (
    <Screen title={t('Florist')} onRefresh={() => void ops.q.refetch()} refreshing={false}>
      <View style={{ gap: th.space(3) }}>
        <PageHero title={t('Florist')} chip={t('Aaj')} stats={[
          { label: t('Aaj ki delivery'), value: <HeroText size="2xl" weight="bold" ltr>{String(ops.list.length)}</HeroText> },
          { label: t('Chalu orders'), value: <HeroText size="2xl" weight="bold" ltr>{String(ops.active)}</HeroText> },
          { label: t('Murjhane wale'), value: <HeroText size="2xl" weight="bold" ltr>{String(ops.withered + ops.soon)}</HeroText> },
        ]} />
        <OfflineNote feature="floristOrders" />
        <CachedNote query={ops.q} />
        {attention.length > 0 && (
          <Card flush title={t('Abhi dhyan dein')}>
            {attention.map((a, i) => <ListRow key={i} divider={i < attention.length - 1} icon={a.icon} iconTone={a.tone} title={a.text} chevron onPress={() => router.push(a.href as never)} />)}
          </Card>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {actions.map((a) => (
            <PressableScale key={a.href} onPress={() => router.push(a.href as never)} style={{ width: `${100 / cols - 2}%` as `${number}%`, minHeight: 84, padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, gap: 4 }}>
              <a.icon size={22} color={th.colors.brand.solid} />
              <Text size="sm" weight="semibold" numberOfLines={1}>{a.label}</Text>
              <Text size="2xs" tone="muted" numberOfLines={1}>{a.hint}</Text>
            </PressableScale>
          ))}
        </View>
        {can(P.POS_USE) && (
          <Card flush title={t('Aaj ki delivery')}>
            {ops.list.length === 0 ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Aaj koi delivery nahi')}</Text></View> : ops.list.slice(0, 6).map((o, i) => (
              <ListRow key={o.id} divider={i < Math.min(ops.list.length, 6) - 1} icon={Truck} iconTone={ORDER_STATUS[o.status].tone} title={o.recipientName || o.customerName || t('Customer')}
                subtitle={`${o.area || o.deliveryAddress || ''} · ${slotLabel(o.deliveryTimeSlot)}`.replace(/^ · | · $/g, '')}
                trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Amount value={o.totalAmount} size="sm" weight="semibold" /><Badge tone={ORDER_STATUS[o.status].tone}>{t(ORDER_STATUS[o.status].label)}</Badge></View>}
                onPress={() => router.push('/florist/orders?tab=today' as never)} />
            ))}
          </Card>
        )}
        {can(P.POS_USE) && ops.weddings.length > 0 && (
          <Card flush title={t('Aane wali shadiyan')}>
            {ops.weddings.slice(0, 5).map((w, i) => (
              <ListRow key={w.id} divider={i < Math.min(ops.weddings.length, 5) - 1} icon={Heart} iconTone={w.days <= 3 ? 'warning' : 'accent'} title={`${w.brideName} & ${w.groomName}`}
                subtitle={`${formatDate(w.weddingDate)} · ${w.days <= 0 ? t('Aaj') : t('{{left}} din baad', { left: w.days })}`}
                trailing={w.balance > 0 ? <Text size="xs" tone="danger">{t('baqi {{balance}}', { balance: formatMoney(w.balance) })}</Text> : undefined} onPress={() => router.push('/florist/weddings' as never)} />
            ))}
          </Card>
        )}
        {can(P.PRODUCTS_VIEW) && ops.wilt.length > 0 && (
          <Card flush title={t('Murjhane wale phool')}>
            {ops.wilt.slice(0, 5).map((p, i) => (
              <ListRow key={p.id} divider={i < Math.min(ops.wilt.length, 5) - 1} icon={Leaf} iconTone={p.days !== null && p.days <= 0 ? 'danger' : 'warning'} title={p.product?.name ?? p.flowerType ?? t('Phool')}
                trailing={<Text size="xs" tone={p.days !== null && p.days <= 0 ? 'danger' : 'warning'}>{p.days === null ? '' : p.days <= 0 ? t('Murjha gaya') : t('{{left}} din me', { left: p.days })}</Text>} onPress={() => router.push('/florist/freshness' as never)} />
            ))}
          </Card>
        )}
        {can(P.POS_USE) && ops.subs.length > 0 && (
          <Card flush title={t('Subscription bouquet')}>
            {ops.subs.slice(0, 5).map((s, i) => (
              <ListRow key={s.id} divider={i < Math.min(ops.subs.length, 5) - 1} icon={Repeat} iconTone="info" title={s.customerName || t('Customer')} subtitle={`${s.planName} · ${s.bouquetType}`}
                trailing={<Amount value={s.pricePerDelivery} size="sm" weight="semibold" />} onPress={() => router.push('/florist/subscriptions' as never)} />
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}
