/**
 * Bakery dashboard (web bakery/dashboard): today's baking, orders due,
 * stock about to expire (with its value) and raw materials running low,
 * what needs attention now, and quick actions. Each block needs its own
 * permission; the last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Cake, ChefHat, Croissant, Flame, Package, Plus, Receipt, ShoppingBag, ShoppingCart, Timer, Users, Wheat, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { dueOf, bulkPrice, fmtQty, hoursTo, liveBatches, planStats, rawStats } from '@nafaa/core/bakery';
import { t } from '@/core/i18n';
import { useProductSearch } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Card, HeroText, ListRow, PageHero, PressableScale, ProgressBar, Row, Screen, StatTile, Text, useLayout, useTheme, type StatusTone } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { bulkOrdersApi, cakeOrdersApi, freshnessApi, ingredientsApi, productionApi } from '../api';
import { BULK_KEY, CAKE_KEY, FRESH_KEY, PRODUCTION_KEY, RAW_KEY, leftText } from '../meta';

const MINUTE = 60_000;

function useBakeryOps() {
  const can = usePermission();
  const seeOrders = can(P.BAKERY_ORDERS_VIEW);
  const seeMake = can(P.BAKERY_PRODUCTION_VIEW);
  const seeRaw = can(P.BAKERY_INGREDIENTS_VIEW);
  const cakes = useQuery({ queryKey: [CAKE_KEY, 'open'], queryFn: () => cakeOrdersApi.list({ open: 'true' }), refetchInterval: MINUTE, enabled: seeOrders });
  const bulks = useQuery({ queryKey: [BULK_KEY, 'open'], queryFn: () => bulkOrdersApi.list({ open: 'true' }), refetchInterval: MINUTE, enabled: seeOrders });
  const plans = useQuery({ queryKey: [PRODUCTION_KEY, 'today'], queryFn: () => productionApi.today(), refetchInterval: MINUTE, enabled: seeMake });
  const ingredients = useQuery({ queryKey: [RAW_KEY, 'list', false], queryFn: () => ingredientsApi.list({}), refetchInterval: 5 * MINUTE, enabled: seeRaw });
  const freshness = useQuery({ queryKey: [FRESH_KEY, 'live'], queryFn: () => freshnessApi.list({ active: 'true' }), refetchInterval: MINUTE, enabled: seeMake });
  const products = useProductSearch({ query: '', limit: 2000 });
  const priceById = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, Number(p.price || 0)])), [products.data]);

  const fresh = useMemo(() => {
    const live = liveBatches(freshness.data ?? []).map((f) => ({ ...f, value: f.currentQty * (priceById.get(f.productId) ?? 0) }));
    const within = (h: number) => live.filter((f) => f.left <= h);
    return {
      expired: live.filter((f) => f.left <= 0), urgent: live.filter((f) => f.left > 0 && f.left <= 12),
      qty: within(12).reduce((x, f) => x + f.currentQty, 0), value: within(24).reduce((x, f) => x + f.value, 0), list: within(24).slice(0, 5),
    };
  }, [freshness.data, priceById]);
  const production = useMemo(() => ({ ...planStats((plans.data ?? []).flatMap((p) => p.items ?? [])), planCount: plans.data?.length ?? 0 }), [plans.data]);
  const orders = useMemo(() => {
    const closed = (s: string) => s === 'DELIVERED' || s === 'CANCELLED';
    const all = [
      ...(cakes.data ?? []).filter((c) => !closed(c.status)).map((c) => ({ kind: 'cake' as const, id: c.id, name: c.customerName, number: c.orderNumber, left: hoursTo(c.neededBy), total: c.total, due: dueOf(c) })),
      ...(bulks.data ?? []).filter((b) => !closed(b.status)).map((b) => ({ kind: 'bulk' as const, id: b.id, name: b.organizationName, number: b.orderNumber, left: hoursTo(b.eventDate), total: bulkPrice(b), due: Math.max(bulkPrice(b) - b.paidAmount, 0) })),
    ].sort((a, b) => (a.left ?? 99_999) - (b.left ?? 99_999));
    return {
      active: all, late: all.filter((x) => x.left !== null && x.left < 0), today: all.filter((x) => x.left !== null && x.left >= 0 && x.left <= 24),
      due: all.reduce((s, x) => s + x.due, 0), list: all.slice(0, 5),
    };
  }, [cakes.data, bulks.data]);
  const raw = useMemo(() => {
    const list = (ingredients.data ?? []).filter((i) => i.isActive !== false);
    const s = rawStats(list);
    return { ...s, list: s.need.slice(0, 5) };
  }, [ingredients.data]);
  return { fresh, production, orders, raw, seeOrders, seeMake, seeRaw, loading: plans.isLoading || cakes.isLoading, refetch: () => { void cakes.refetch(); void bulks.refetch(); void plans.refetch(); void ingredients.refetch(); void freshness.refetch(); } };
}

export function BakeryDashboardScreen() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const can = usePermission();
  const { cost } = useCostMask();
  const ops = useBakeryOps();
  const { fresh, production: p, orders, raw } = ops;

  const attention: Array<{ icon: LucideIcon; tone: 'danger' | 'warning' | 'info' | 'neutral'; text: string; href: string }> = [];
  if (ops.seeMake && fresh.expired.length) attention.push({ icon: Flame, tone: 'danger', text: t('{{count}} batch ka waqt guzar chuka — aaj hi nikalna ya phenkna hai', { count: fresh.expired.length }), href: '/bakery/freshness' });
  if (ops.seeOrders && orders.late.length) attention.push({ icon: AlertTriangle, tone: 'danger', text: t('{{count}} order late hai — customer ko batana zaroori hai', { count: orders.late.length }), href: '/bakery/cake-orders' });
  if (ops.seeMake && fresh.urgent.length) attention.push({ icon: Timer, tone: 'warning', text: t('{{count}} batch agle 12 ghante me kharab ho jayega — discount laga dein', { count: fresh.urgent.length }), href: '/bakery/freshness' });
  if (ops.seeRaw && raw.critical) attention.push({ icon: Wheat, tone: 'warning', text: t('{{critical}} zaroori saamaan khatam — is ke bagair banana ruk jayega', { critical: raw.critical }), href: '/bakery/ingredients' });
  if (ops.seeOrders && orders.today.length) attention.push({ icon: Cake, tone: 'info', text: t('{{count}} order aaj dena hai', { count: orders.today.length }), href: '/bakery/cake-orders' });
  if (ops.seeMake && p.pending) attention.push({ icon: Croissant, tone: 'info', text: t('{{pending}} cheez abhi banani baqi hai', { pending: p.pending }), href: '/bakery/production' });
  if (ops.seeMake && p.planCount === 0 && !ops.loading) attention.push({ icon: ChefHat, tone: 'neutral', text: t('Aaj ka baking plan nahi bana — subah plan banana kaam asaan kar deta hai'), href: '/bakery/production' });

  const actions: Array<{ href: string; icon: LucideIcon; label: string; hint: string; show: boolean }> = [
    { href: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/bakery/cake-orders/new', icon: Cake, label: t('Cake order'), hint: t('Naya order'), show: can(P.BAKERY_ORDERS_MANAGE) },
    { href: '/bakery/production', icon: ChefHat, label: t('Baking'), hint: p.lines ? t('{{done}}/{{total}} hua', { done: p.done, total: p.lines }) : t('Plan banayein'), show: ops.seeMake },
    { href: '/bakery/freshness', icon: Timer, label: t('Freshness'), hint: fresh.expired.length ? t('{{count}} guzar gaya', { count: fresh.expired.length }) : t('Sab theek'), show: ops.seeMake },
    { href: '/bakery/ingredients', icon: Wheat, label: t('Saamaan'), hint: raw.low ? t('{{low}} kam', { low: raw.low }) : t('{{total}} cheezein', { total: raw.total }), show: ops.seeRaw },
    { href: '/products/new', icon: Plus, label: t('Nayi cheez'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/products', icon: Package, label: t('Maal'), hint: t('Products'), show: can(P.PRODUCTS_VIEW) },
    { href: '/bakery/bulk-orders', icon: ShoppingBag, label: t('Bare order'), hint: t('Shadi, daftar'), show: ops.seeOrders },
    { href: '/customers', icon: Users, label: t('Customers'), hint: t('Khata'), show: can(P.CUSTOMERS_VIEW) },
    { href: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill'), show: can(P.SALES_VIEW) },
  ].filter((a) => a.show);
  const cols = isTablet ? 5 : 3;
  const tone = (x: 'danger' | 'warning' | 'info' | 'neutral'): StatusTone => x;

  return (
    <Screen title={t('Bakery')} onRefresh={ops.refetch} refreshing={false}>
      <View style={{ gap: th.space(3) }}>
        <PageHero title={t('Bakery')} chip={t('Aaj')} stats={[
          ...(ops.seeMake ? [{ label: t('Aaj banana hai'), value: <HeroText size="2xl" weight="bold" ltr>{p.lines ? `${p.done}/${p.lines}` : '—'}</HeroText> }] : []),
          ...(ops.seeOrders ? [{ label: t('Order dene hain'), value: <HeroText size="2xl" weight="bold" ltr>{String(orders.today.length)}</HeroText> }] : []),
          ...(ops.seeMake ? [{ label: t('Jald kharab'), value: <HeroText size="2xl" weight="bold" ltr>{String(fresh.expired.length + fresh.urgent.length)}</HeroText> }] : []),
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

        {ops.seeMake && (
          <Card title={t('Aaj ki baking')} description={p.planCount ? t('{{planCount}} plan · {{pct}}% mukammal', { planCount: p.planCount, pct: p.linePct }) : t('Aaj ka plan nahi bana')} onPress={() => router.push('/bakery/production' as never)}>
            {p.lines === 0 ? <Text size="sm" tone="muted">{t('Plan bana lein — kya, kitna aur kab banana hai sab yahan nazar aayega.')}</Text> : (
              <View style={{ gap: th.space(2) }}>
                <ProgressBar value={p.linePct / 100} />
                <Row gap={2}>
                  <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Baqi')} value={String(p.pending)} tone="neutral" />
                  <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Oven me')} value={String(p.inOven)} tone="warning" />
                  <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Tayyar')} value={String(p.done)} tone="success" />
                </Row>
              </View>
            )}
          </Card>
        )}

        {ops.seeOrders && (
          <Card flush title={t('Aane wale order')} description={t('Cake aur bare order, delivery ke waqt se')} action={<Text size="sm" tone="warning">{t('Lena baqi')} <Amount value={orders.due} size="sm" tone="warning" /></Text>}>
            {orders.list.length === 0 ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Koi order nahi')}</Text> : orders.list.map((o, i) => (
              <ListRow key={o.id} divider={i < orders.list.length - 1} icon={o.kind === 'cake' ? Cake : ShoppingBag} iconTone={o.left !== null && o.left < 0 ? 'danger' : 'brand'}
                title={o.name} subtitle={`${o.number} · ${leftText(o.left)}`} trailing={<Amount value={o.total} weight="semibold" />}
                onPress={() => router.push((o.kind === 'cake' ? `/bakery/cake-orders/${o.id}` : '/bakery/bulk-orders') as never)} />
            ))}
          </Card>
        )}

        {ops.seeMake && (
          <Card flush title={t('Jald kharab hone wala')} description={t('24 ghante me expire hone wala maal')} action={fresh.value > 0 ? <Amount value={fresh.value} size="sm" tone="danger" /> : undefined}>
            {fresh.list.length === 0 ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Agle 24 ghante me kuch kharab nahi ho raha')}</Text> : fresh.list.map((f, i) => (
              <ListRow key={f.id} divider={i < fresh.list.length - 1} icon={Timer} iconTone={f.left <= 0 ? 'danger' : 'warning'} title={f.productName} subtitle={leftText(f.left)}
                trailing={<Text weight="semibold" ltr>{fmtQty(f.currentQty)}</Text>} onPress={() => router.push('/bakery/freshness' as never)} />
            ))}
          </Card>
        )}

        {ops.seeRaw && (
          <Card flush title={t('Saamaan kam ho gaya')} description={t('Reorder level se neeche ka raw material')}>
            {raw.list.length === 0 ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Sab saamaan theek hai')}</Text> : raw.list.map((r, i) => (
              <ListRow key={r.id} divider={i < raw.list.length - 1} icon={Wheat} iconTone={r.currentStock <= 0 ? 'danger' : 'warning'} title={r.name}
                subtitle={`${fmtQty(r.currentStock)} ${r.unit} · ${cost(r.costPerUnit)}/${r.unit}`} onPress={() => router.push('/bakery/ingredients' as never)} />
            ))}
          </Card>
        )}
        <Text size="xs" tone="muted">{t('Jo maal aaj nahi nikla wo kal kachra hai. Is liye "jald kharab" ki qeemat bhi likhi hai.')}</Text>
      </View>
    </Screen>
  );
}

