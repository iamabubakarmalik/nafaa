/**
 * Cosmetics dashboard (web cosmetics/dashboard): batches near or past expiry,
 * this month's customer birthdays, what needs attention and quick actions.
 * Batch numbers need the server; the last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Award, BookOpen, Cake, CalendarClock, Gift, Heart, PackageX, Package, Plus, Receipt, ShoppingCart, TestTube2, Users } from 'lucide-react-native';
import { useMemo } from 'react';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Card, ListRow, Text, useTheme } from '@/design';
import { customersApi } from '@/modules/customers/api/customers';
import { batchesApi } from '@/modules/inventory/api/products';
import { businessDayKey } from '@/core/format';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { COSMETICS_KEYS, dayOnly, daysFrom, expiryTone } from '../meta';

const MINUTE = 60_000;

export function useCosmeticsOps() {
  const can = usePermission();
  const seeStock = can(P.PRODUCTS_VIEW);
  const soon = useQuery({ queryKey: [COSMETICS_KEYS.expiry, 'soon', 30], queryFn: () => batchesApi.expiringSoon(30), refetchInterval: 5 * MINUTE, enabled: seeStock });
  const expired = useQuery({ queryKey: [COSMETICS_KEYS.expiry, 'expired'], queryFn: () => batchesApi.expired(), refetchInterval: 5 * MINUTE, enabled: seeStock });
  const birthdays = useQuery({
    queryKey: ['cosmetics-birthdays'],
    queryFn: () => customersApi.directory({ status: 'active', type: 'all', activity: 'all', sort: 'name', birthday: 'month', scope: 'all' }, 1, 1),
    staleTime: 30 * MINUTE, enabled: can(P.CUSTOMERS_VIEW),
  });
  return useMemo(() => {
    const live = <T extends { isActive: boolean; quantity: number }>(rows?: T[]) => (rows ?? []).filter((b) => b.isActive && b.quantity > 0);
    const list = live(soon.data).map((b) => ({ ...b, days: daysFrom(b.expiryDate) ?? 999 })).sort((a, b) => a.days - b.days);
    const today = Number(businessDayKey().slice(8));
    const people = [...(birthdays.data?.stats.birthdays ?? [])].sort((a, b) => a.day - b.day);
    return {
      expiry: { expired: live(expired.data).length, soon: list.length, week: list.filter((b) => b.days <= 7).length, list },
      birthdays: { all: people, upcoming: people.filter((p) => p.day >= today) },
      refetch: () => { void soon.refetch(); void expired.refetch(); void birthdays.refetch(); },
    };
  }, [soon, expired, birthdays]);
}

export function CosmeticsDashboardScreen() {
  const th = useTheme();
  const can = usePermission();
  const { expiry, birthdays, refetch } = useCosmeticsOps();
  const seeStock = can(P.PRODUCTS_VIEW);

  const attention: DashAttention[] = [];
  if (seeStock && expiry.expired) attention.push({ icon: PackageX, tone: 'danger', text: t('{{expired}} batch expire ho chuke — shelf se hata dein', { expired: expiry.expired }), href: '/cosmetics/expiry' });
  if (seeStock && expiry.week) attention.push({ icon: CalendarClock, tone: 'warning', text: t('{{week}} batch 7 din me expire honge — discount laga kar nikaal dein', { week: expiry.week }), href: '/cosmetics/expiry' });
  else if (seeStock && expiry.soon) attention.push({ icon: CalendarClock, tone: 'info', text: t('{{soon}} batch 30 din me expire honge', { soon: expiry.soon }), href: '/cosmetics/expiry' });
  if (birthdays.upcoming.length) attention.push({ icon: Cake, tone: 'info', text: t('{{count}} customers ki salgirah is mahine — offer bhejein', { count: birthdays.upcoming.length }), href: '/customers' });

  const actions: DashAction[] = [
    { href: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/products/new', icon: Plus, label: t('Naya product'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/products', icon: Package, label: t('Products'), hint: t('Stock aur rate'), show: seeStock },
    { href: '/cosmetics/expiry', icon: CalendarClock, label: t('Expiry'), hint: expiry.soon ? t('{{soon}} qareeb', { soon: expiry.soon }) : t('Batch dekhein'), show: seeStock },
    { href: '/cosmetics/testers', icon: TestTube2, label: t('Testers'), hint: t('Try wale piece'), show: seeStock },
    { href: '/brands', icon: Award, label: t('Brands'), hint: t('Maybelline, Rivaj…'), show: can(P.BRANDS_VIEW) },
    { href: '/combos', icon: Gift, label: t('Deals'), hint: t('Gift set, bundle'), show: seeStock },
    { href: '/loyalty', icon: Heart, label: t('Loyalty'), hint: t('Points'), show: can(P.LOYALTY_VIEW) },
    { href: '/customers', icon: Users, label: t('Customers'), hint: t('Khata'), show: can(P.CUSTOMERS_VIEW) },
    { href: '/khata', icon: BookOpen, label: t('Khata'), hint: t('Udhaar'), show: can(P.KHATA_VIEW) },
    { href: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill'), show: can(P.SALES_VIEW) },
  ];

  return (
    <PackDashboard title={t('Cosmetics')} onRefresh={refetch}
      stats={seeStock ? [{ label: t('Expire ho gaye'), value: String(expiry.expired) }, { label: t('30 din me'), value: String(expiry.soon) }, { label: t('Salgirah'), value: String(birthdays.all.length) }] : []}
      attention={attention} actions={actions}>
      {seeStock && (
        <Card flush title={t('Expiry qareeb')} description={t('30 din me expire hone wale batch')} onPress={() => router.push('/cosmetics/expiry' as never)}>
          {expiry.list.length === 0 ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Koi batch expire hone ke qareeb nahi')}</Text> : expiry.list.slice(0, 6).map((b, i, a) => (
            <ListRow key={b.id} divider={i < a.length - 1} icon={CalendarClock} iconTone={expiryTone(b.days)} title={[b.product?.name, b.variant?.name].filter(Boolean).join(' · ')}
              subtitle={`${b.batchNumber} · ${b.quantity}`} trailing={<Badge tone={expiryTone(b.days)}>{dayOnly(b.expiryDate)}</Badge>}
              onPress={() => router.push(`/products/${b.productId}` as never)} />
          ))}
        </Card>
      )}
      {birthdays.all.length > 0 && (
        <Card flush title={t('Is mahine salgirah')} description={t('Customers jin ki salgirah is mahine hai')}>
          {birthdays.all.slice(0, 6).map((p, i, a) => (
            <ListRow key={p.id} divider={i < a.length - 1} icon={Cake} title={p.name} subtitle={p.phone ?? undefined} trailing={<Text weight="bold" ltr>{String(p.day)}</Text>} onPress={() => router.push(`/customers/${p.id}` as never)} />
          ))}
        </Card>
      )}
    </PackDashboard>
  );
}
