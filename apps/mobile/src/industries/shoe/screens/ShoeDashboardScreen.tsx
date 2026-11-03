/**
 * Shoe dashboard (web shoe/dashboard): pairs and sizes in stock, sizes that
 * ran out or are low, best-selling sizes, size requests waiting, size reorder,
 * exchanges of the last 30 days, and quick actions. The last loaded numbers
 * show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, ArrowLeftRight, Award, CheckCircle2, HandMetal, Package, PackageX, Plus, Receipt, Ruler, Shirt, ShoppingCart, Users, Footprints, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Card, HBarList, HeroText, ListRow, PageHero, PressableScale, Screen, Text, useLayout, useTheme, type StatusTone } from '@/design';
import { shoeProductsApi, shoeTryOnApi } from '../api';
import { DASH_KEY } from '../meta';

export function ShoeDashboardScreen() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const can = usePermission();
  const o = useQuery({ queryKey: [DASH_KEY], queryFn: () => shoeProductsApi.overview().catch(() => null), refetchInterval: 60_000 });
  const pop = useQuery({ queryKey: ['shoe-size-popularity'], queryFn: () => shoeProductsApi.sizePopularity().catch(() => []), staleTime: 5 * 60_000 });
  const tryOn = useQuery({ queryKey: ['shoe-try-on-summary'], queryFn: () => shoeTryOnApi.summary().catch(() => null), refetchInterval: 5 * 60_000 });
  const exch = useQuery({ queryKey: ['shoe-exchanges-summary'], queryFn: () => shoeProductsApi.exchangeSummary().catch(() => null), refetchInterval: 5 * 60_000 });
  const reorder = useQuery({ queryKey: [DASH_KEY, 'reorder'], queryFn: () => shoeProductsApi.reorder(8).catch(() => null), refetchInterval: 5 * 60_000, enabled: can(P.PRODUCTS_VIEW) });
  const totals = o.data?.totals;
  const gaps = [...(o.data?.outOfStockVariants ?? []), ...(o.data?.lowStockVariants ?? [])];

  const attention: Array<{ icon: LucideIcon; tone: StatusTone; text: string; href: string }> = [];
  if (totals?.outOfStockCount) attention.push({ icon: PackageX, tone: 'warning', text: t('{{outOfStockCount}} size bilkul khatam — customer us size ke liye wapas chala jayega', { outOfStockCount: totals.outOfStockCount }), href: '/products' });
  if (tryOn.data?.pending) attention.push({ icon: HandMetal, tone: 'info', text: t('{{pending}} customer size ke intezar me — maal mangwa kar batayein', { pending: tryOn.data.pending }), href: '/shoe/try-on' });
  if (totals?.lowStockCount) attention.push({ icon: AlertTriangle, tone: 'info', text: t('{{lowStockCount}} size kam reh gaye — agle order me shamil karein', { lowStockCount: totals.lowStockCount }), href: '/products' });

  const actions: Array<{ href: string; icon: LucideIcon; label: string; hint: string; show: boolean }> = [
    { href: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/products/new', icon: Plus, label: t('Naya joota'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/products', icon: Footprints, label: t('Maal'), hint: t('{{n}} cheezein', { n: totals?.totalProducts ?? 0 }), show: can(P.PRODUCTS_VIEW) },
    { href: '/shoe/try-on', icon: HandMetal, label: t('Size requests'), hint: t('{{n}} khuli', { n: tryOn.data?.pending ?? 0 }), show: can(P.POS_USE) },
    { href: '/shoe/exchanges', icon: ArrowLeftRight, label: t('Exchange'), hint: t('Badalna'), show: can(P.RETURNS_CREATE) },
    { href: '/shoe/size-charts', icon: Ruler, label: t('Size charts'), hint: t('PK / EU / US'), show: can(P.PRODUCTS_VIEW) },
    { href: '/shoe/brands', icon: Award, label: t('Brands'), hint: t('{{n}} brand', { n: totals?.totalBrands ?? 0 }), show: can(P.BRANDS_VIEW) },
    { href: '/customers', icon: Users, label: t('Customers'), hint: t('Khata'), show: can(P.CUSTOMERS_VIEW) },
    { href: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill'), show: can(P.SALES_VIEW) },
  ].filter((a) => a.show);
  const cols = isTablet ? 5 : 3;

  return (
    <Screen title={t('Shoe store')} onRefresh={() => { void o.refetch(); void tryOn.refetch(); void reorder.refetch(); }} refreshing={false}>
      <View style={{ gap: th.space(3) }}>
        <PageHero title={t('Shoe store')} chip={t('Aaj')} stats={[
          { label: t('Joray stock me'), value: <HeroText size="2xl" weight="bold" ltr>{String(totals?.totalStockUnits ?? 0)}</HeroText> },
          { label: t('Size khatam'), value: <HeroText size="2xl" weight="bold" ltr>{String(totals?.outOfStockCount ?? 0)}</HeroText> },
          { label: t('Size requests'), value: <HeroText size="2xl" weight="bold" ltr>{String(tryOn.data?.pending ?? 0)}</HeroText> },
        ]} />
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
        <Card flush title={t('Size khatam / kam')} description={t('{{outOfStockCount}} khatam · {{lowStockCount}} kam', { outOfStockCount: totals?.outOfStockCount ?? 0, lowStockCount: totals?.lowStockCount ?? 0 })}>
          {gaps.length === 0 ? <ListRow title={t('Har size stock me hai')} icon={CheckCircle2} iconTone="success" /> : gaps.slice(0, 6).map((v, i, a) => (
            <ListRow key={v.id} dense divider={i < a.length - 1} icon={Package} iconTone={v.stock <= 0 ? 'danger' : 'warning'} title={`${v.productName ?? ''} ${v.sizeSystem === 'UK' ? 'PK' : v.sizeSystem} ${v.size}`.trim()}
              subtitle={v.boxNumber ? t('Dabba {{n}}', { n: v.boxNumber }) : undefined} trailing={<Badge tone={v.stock <= 0 ? 'danger' : 'warning'}>{v.stock}</Badge>} chevron onPress={() => router.push(`/products/${v.productId}` as never)} />
          ))}
        </Card>
        {!!pop.data?.length && <Card title={t('Sab se zyada bikne wale size')}><HBarList colorful rows={pop.data.slice(0, 8).map((s) => ({ key: s.size, label: s.size, value: s.sold }))} /></Card>}
        {!!reorder.data?.items.length && (
          <Card flush title={t('Size reorder')} description={t('Bikne wale size jo khatam ho rahe')}>
            {reorder.data.items.slice(0, 5).map((r, i, a) => (
              <ListRow key={r.productId} dense divider={i < a.length - 1} icon={Shirt} iconTone="warning" title={r.name} subtitle={r.sizes.slice(0, 4).map((s) => `${s.size ?? s.name} (${s.stock})`).join(', ')}
                trailing={<Badge tone="warning">{t('{{n}} mangwayein', { n: r.sizes.reduce((x, s) => x + s.suggest, 0) })}</Badge>} chevron onPress={() => router.push(`/products/${r.productId}` as never)} />
            ))}
          </Card>
        )}
        {!!exch.data?.last30Days?.count && <Card><Text size="sm" tone="secondary">{t('Pichle 30 din me {{n}} exchange · {{value}}', { n: exch.data.last30Days.count, value: formatMoney(exch.data.last30Days.value) })}</Text></Card>}
      </View>
    </Screen>
  );
}
