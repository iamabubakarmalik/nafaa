/**
 * Sports dashboard (web sports/dashboard): team orders due soon, repairs in
 * the shop, top brands, what needs attention and quick actions. Each block
 * needs its own permission; the last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlarmClock, Award, BarChart3, Package, PackageCheck, Plus, Receipt, ShoppingCart, Trophy, Users, Wrench, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Card, HeroText, ListRow, PageHero, PressableScale, Screen, Text, useLayout, useTheme, type StatusTone } from '@/design';
import { daysFromToday } from '@/industries/_shared/deskKit';
import { repairServicesApi, sportsDashboardApi, teamOrdersApi } from '../api';
import { REPAIR_STATUS, TEAM_STATUS, day, typeLabel } from '../meta';

const MINUTE = 60_000;

export function SportsDashboardScreen() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const can = usePermission();
  const seeWork = can(P.POS_USE);
  const overview = useQuery({ queryKey: ['sports-dashboard-overview'], queryFn: () => sportsDashboardApi.overview(), refetchInterval: MINUTE });
  const team = useQuery({ queryKey: ['sports-team-summary'], queryFn: () => teamOrdersApi.summary(), refetchInterval: 5 * MINUTE, enabled: seeWork });
  const repair = useQuery({ queryKey: ['sports-repair-summary'], queryFn: () => repairServicesApi.summary(), refetchInterval: 5 * MINUTE, enabled: seeWork });
  const o = overview.data ?? {};
  const totals = o.totals ?? { totalBrands: 0, totalProducts: 0, activeTeamOrders: 0, pendingRepairs: 0, overdueRepairs: 0 };
  const counts = team.data?.counts;
  const deliveries = useMemo(() => ((o.upcomingTeamDeliveries ?? []) as any[]).map((d) => ({ ...d, days: daysFromToday(d.expectedDeliveryDate) ?? 99 })), [o.upcomingTeamDeliveries]);
  const repairs = useMemo(() => ((o.activeRepairs ?? []) as any[]).map((r) => ({ ...r, late: r.estimatedReadyAt ? (daysFromToday(r.estimatedReadyAt) ?? 0) < 0 : false })).sort((a, b) => Number(b.late) - Number(a.late)), [o.activeRepairs]);
  const atRisk = deliveries.filter((d) => d.days <= 3 && d.status !== 'READY').length;
  const toCollect = repair.data?.completed ?? 0;
  const brands = (o.topBrands ?? []) as Array<{ id: string; name: string; totalRevenue?: number }>;

  const attention: Array<{ icon: LucideIcon; tone: 'danger' | 'warning' | 'info'; text: string; href: string }> = [];
  if (seeWork && totals.overdueRepairs) attention.push({ icon: AlarmClock, tone: 'danger', text: t('{{count}} repair late hai — customer ko batana zaroori hai', { count: totals.overdueRepairs }), href: '/sports/repair-services' });
  if (seeWork && atRisk) attention.push({ icon: AlarmClock, tone: 'warning', text: t('{{count}} team order 3 din me dena hai aur tayyar nahi', { count: atRisk }), href: '/sports/team-orders' });
  if (seeWork && (counts?.ready ?? 0) > 0) attention.push({ icon: PackageCheck, tone: 'info', text: t('{{count}} team order tayyar hai — team ko batayein', { count: counts?.ready ?? 0 }), href: '/sports/team-orders' });
  if (seeWork && toCollect > 0) attention.push({ icon: Wrench, tone: 'info', text: t('{{count}} repair tayyar hai — customer ko bulayein', { count: toCollect }), href: '/sports/repair-services' });

  const actions: Array<{ href: string; icon: LucideIcon; label: string; hint: string; show: boolean }> = [
    { href: '/pos', icon: ShoppingCart, label: t('POS'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/products/new', icon: Plus, label: t('Naya product'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/products', icon: Package, label: t('Products'), hint: t('{{n}} items', { n: totals.totalProducts }), show: can(P.PRODUCTS_VIEW) },
    { href: '/sports/team-orders/new', icon: Users, label: t('Team order'), hint: t('Naya order'), show: seeWork },
    { href: '/sports/team-orders', icon: Trophy, label: t('Team orders'), hint: counts?.ready ? t('{{n}} tayyar', { n: counts.ready }) : t('{{n}} chaalu', { n: totals.activeTeamOrders }), show: seeWork },
    { href: '/sports/repair-services', icon: Wrench, label: t('Repairs'), hint: totals.overdueRepairs ? t('{{n}} late', { n: totals.overdueRepairs }) : t('{{n}} baqi', { n: totals.pendingRepairs }), show: seeWork },
    { href: '/brands', icon: Award, label: t('Brands'), hint: t('{{n}} brands', { n: totals.totalBrands }), show: can(P.BRANDS_VIEW) },
    { href: '/customers', icon: Users, label: t('Customers'), hint: t('Khata'), show: can(P.CUSTOMERS_VIEW) },
    { href: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill'), show: can(P.SALES_VIEW) },
    { href: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab'), show: can(P.REPORTS_VIEW) },
  ].filter((a) => a.show);
  const cols = isTablet ? 5 : 3;
  const tone = (x: 'danger' | 'warning' | 'info'): StatusTone => x;

  return (
    <Screen title={t('Sports')} onRefresh={() => { void overview.refetch(); void team.refetch(); void repair.refetch(); }} refreshing={false}>
      <View style={{ gap: th.space(3) }}>
        <PageHero title={t('Sports')} chip={t('Aaj')} stats={[
          { label: t('Team orders'), value: <HeroText size="xl" weight="bold" ltr>{String(totals.activeTeamOrders)}</HeroText> },
          { label: t('Tayyar'), value: <HeroText size="xl" weight="bold" ltr>{String(counts?.ready ?? 0)}</HeroText> },
          { label: t('Repairs'), value: <HeroText size="xl" weight="bold" ltr>{String(totals.pendingRepairs)}</HeroText> },
        ]} />
        {attention.length > 0 && (
          <Card flush title={t('Abhi dhyan dein')}>
            {attention.map((a, i) => <ListRow key={i} divider={i < attention.length - 1} icon={a.icon} iconTone={tone(a.tone)} title={a.text} chevron onPress={() => router.push(a.href as never)} />)}
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
        {seeWork && (
          <Card flush title={t('Team order delivery')} description={t('Agle 14 din me dene wale team orders aur baqi amount')}>
            {deliveries.length === 0 ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Koi order nahi')}</Text> : deliveries.slice(0, 5).map((d, i) => (
              <ListRow key={d.id} dense divider={i < Math.min(deliveries.length, 5) - 1} icon={Users} iconTone={d.days < 0 ? 'danger' : TEAM_STATUS[d.status]?.tone ?? 'brand'} title={d.teamName}
                subtitle={`${d.orderNumber} · ${day(d.expectedDeliveryDate)}`} trailing={d.balanceAmount ? <Amount value={d.balanceAmount} weight="semibold" tone="warning" /> : undefined} onPress={() => router.push('/sports/team-orders' as never)} />
            ))}
          </Card>
        )}
        {seeWork && (
          <Card flush title={t('Repair me saamaan')} description={t('Bat, racket aur doosra saamaan jo repair me hai')}>
            {repairs.length === 0 ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Abhi koi repair nahi')}</Text> : repairs.slice(0, 5).map((r, i) => (
              <ListRow key={r.id} dense divider={i < Math.min(repairs.length, 5) - 1} icon={Wrench} iconTone={r.late ? 'danger' : REPAIR_STATUS[r.status]?.tone ?? 'neutral'} title={`${t(r.itemType)}${r.itemBrand ? ` · ${r.itemBrand}` : ''}`}
                subtitle={`${r.serviceNumber} · ${r.customerName}${r.estimatedReadyAt ? ` · ${day(r.estimatedReadyAt)}` : ''}`} onPress={() => router.push('/sports/repair-services' as never)} />
            ))}
          </Card>
        )}
        {brands.length > 0 && (
          <Card flush title={t('Top brands')} description={t('Sab se zyada bikne wale brands')}>
            {brands.slice(0, 5).map((b, i) => <ListRow key={b.id} dense divider={i < Math.min(brands.length, 5) - 1} icon={Award} iconTone="warning" title={b.name} trailing={b.totalRevenue ? <Amount value={b.totalRevenue} compact weight="semibold" /> : undefined} onPress={() => router.push('/brands' as never)} />)}
          </Card>
        )}
      </View>
    </Screen>
  );
}
