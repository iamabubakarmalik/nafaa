/**
 * Product detail for every industry (web ProductDetailPage): the product,
 * figures for the active branch (stock, sold, sale, profit, stock value),
 * alerts, and tabs: Overview · Stock · Sale · Purchase · Batches ·
 * Packing/Variants plus the industry's own. Actions: stock, edit, label,
 * featured, on/off, print. Offline it shows the phone's copy of the product.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle, ArrowRight, Boxes, CalendarClock, Eye, EyeOff, Hourglass, Layers, LineChart, MoreHorizontal, Pencil, Plus, Printer, Receipt, ShoppingCart, Star, Store, Tag, Truck,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { expiryState } from '@nafaa/core/inventory';
import { isNetworkError } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { enqueueProductUpdate, onlineNeededText, useProduct } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, DetailTemplate, EmptyState, IconButton, Row, StatTile, Tabs, Text, confirm, toast, useTheme } from '@/design';
import { insightsApi, productsApi, unitsApi, type Product } from '../../api/products';
import { ActionSheet } from '../../catalog-setup/components/ActionSheet';
import { ProductThumb } from '../../components/ProductThumb';
import { StockSheet } from '../../components/StockSheet';
import { useInventoryConfig, useProductRoutes } from '../../industry/registry';
import type { DetailContext } from '../../industry/types';
import { INV, qty, useCostMask, useOnline, useRefreshInventory } from '../../lib/shared';
import { printTable } from '../../stock/components/parts';
import { BatchesTab, OverviewTab, PurchasesTab, SalesTab, StockTab, SuppliersTab, UnitsTab } from './tabs';

/** Mirror copy in the server's shape, for offline viewing. */
function fromMirror(p: NonNullable<ReturnType<typeof useProduct>['data']>): Product {
  return {
    id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, unit: p.unit, price: p.price, costPrice: p.costPrice ?? 0, wholesalePrice: p.wholesalePrice,
    creditPrice: p.creditPrice, taxRate: p.taxRate, stock: p.stock ?? 0, shopStock: p.stock ?? 0, lowStockAlert: p.lowStockAlert, hasVariants: p.hasVariants,
    expiryTracked: p.expiryTracked, isActive: p.isActive, isFeatured: p.isFeatured, isRawMaterial: p.isRawMaterial, categoryId: p.categoryId, brandId: p.brandId,
    category: p.categoryId ? { id: p.categoryId, name: p.categoryName ?? '', color: p.categoryColor ?? '#94a3b8' } : null,
    brand: p.brandId ? { id: p.brandId, name: p.brandName ?? '' } : null, images: p.imageUrl ? [{ id: 'm', productId: p.id, url: p.imageUrl, isPrimary: true, sortOrder: 0 }] : [],
    variants: p.variants.map((v, i) => ({ id: v.id, productId: p.id, name: v.name, sku: v.sku, barcode: v.barcode, price: v.price, costPrice: v.costPrice ?? 0, stock: v.stock ?? 0, lowStockAlert: v.lowStockAlert ?? 0, isActive: true, sortOrder: i })),
    createdAt: p.updatedAt ?? '', updatedAt: p.updatedAt ?? '',
  };
}

export function ProductDetailScreen() {
  const th = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const cfg = useInventoryConfig();
  const config = cfg.detail;
  const routes = useProductRoutes();
  const online = useOnline();
  const refreshAll = useRefreshInventory();
  const shopId = useAuthStore((s) => s.currentShopId);
  const permission = usePermission();
  const { costHidden, cost } = useCostMask();
  const can = {
    edit: permission(P.PRODUCTS_EDIT),
    stock: permission(P.STOCK_ADJUSTMENTS_MANAGE),
    purchases: permission(P.PURCHASES_VIEW),
    buy: permission(P.PURCHASES_CREATE),
    labels: permission(P.BARCODE_LABELS_VIEW),
  };
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('overview');
  const [stockOpen, setStockOpen] = useState(false);
  const [more, setMore] = useState(false);

  const mirror = useProduct(id);
  const product = useQuery({ queryKey: [INV, 'product', id], queryFn: () => productsApi.getOne(id), enabled: !!id, retry: (n, e) => !isNetworkError(e) && n < 1 });
  const units = useQuery({ queryKey: [INV, 'product-units', id], queryFn: () => unitsApi.byProduct(id).catch(() => []), enabled: !!id && online });
  const insights = useQuery({ queryKey: [INV, 'product-insights', id, days, shopId], queryFn: () => insightsApi.get(id, days), enabled: !!id && online, placeholderData: (p) => p });
  const extra = useQuery({ queryKey: [INV, config.extra?.key ?? 'none', id], queryFn: () => config.extra!.load(id), enabled: !!id && !!config.extra && online });

  const refresh = () => { void product.refetch(); void insights.refetch(); void units.refetch(); void refreshAll({ sync: true }); };
  const p: Product | undefined = product.data ?? (mirror.data ? fromMirror(mirror.data) : undefined);
  const branch = insights.data?.shops.find((s) => s.shopId === shopId);
  const stock = branch ? branch.stock : Number(mirror.data?.stock ?? p?.shopStock ?? p?.stock ?? 0);
  const ctx: DetailContext<unknown> | null = p ? { product: p, units: units.data ?? [], insights: insights.data, extra: extra.data, stock, costHidden, refresh } : null;

  const tabs = useMemo(() => {
    if (!ctx) return [];
    const list: Array<{ value: string; label: string; icon: typeof LineChart; render?: () => React.ReactNode }> = [
      { value: 'overview', label: t('Overview'), icon: LineChart },
      { value: 'stock', label: t('Stock'), icon: Hourglass },
      { value: 'sales', label: t('Sale'), icon: Receipt },
    ];
    if (can.purchases) list.push({ value: 'purchases', label: t('Purchase'), icon: Truck });
    list.push({ value: 'suppliers', label: t('Suppliers'), icon: Store });
    if ((ctx.product.batches?.length ?? 0) || ctx.product.expiryTracked) list.push({ value: 'batches', label: t('Batches'), icon: CalendarClock });
    const nU = ctx.units.length;
    const nV = ctx.product.variants?.length ?? 0;
    if (nU || nV) list.push({ value: 'units', label: nU && nV ? t('Packing / Variants') : nU ? t('Packing') : t('Variants'), icon: nV ? Layers : Boxes });
    for (const x of config.tabs ?? []) if (!x.when || x.when(ctx)) list.push({ value: x.id, label: t(x.label), icon: x.icon, render: () => x.render(ctx) });
    return list;
  }, [ctx, config.tabs, can.purchases]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p || !ctx) {
    return (
      <DetailTemplate title={t('Product')} loading={product.isLoading || mirror.isLoading} error={product.error && !mirror.data ? product.error : undefined} onRetry={product.refetch}>
        {!product.isLoading && !mirror.isLoading && <EmptyState icon={Boxes} title={t('Product nahi mila')} action={<Button iconEnd={ArrowRight} iconEndFlip onPress={() => router.back()}>{t('Products ki list')}</Button>} />}
      </DetailTemplate>
    );
  }

  const ins = insights.data;
  const shops = ins?.shops ?? [];
  const allStock = shops.reduce((s, x) => s + x.stock, 0);
  const low = stock > 0 && stock <= p.lowStockAlert;
  const today = new Date().toISOString().slice(0, 10);
  const expiring = (p.batches ?? []).filter((b) => b.isActive && b.quantity > 0 && ['expired', 'soon'].includes(expiryState(b.expiryDate, today)));
  const margin = ins && ins.totals.revenue > 0 ? (ins.totals.profit / ins.totals.revenue) * 100 : null;
  const tile = config.tile?.(ctx);
  const image = [...(p.images ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)[0]?.url;
  const tags = (p.tags ?? []).map((g) => g.tag).filter(Boolean);
  const active = tabs.find((x) => x.value === tab) ?? tabs[0];

  const setFlag = async (patch: { isActive?: boolean; isFeatured?: boolean }, done: string) => {
    try {
      await enqueueProductUpdate(p.id, patch).catch(async (e) => { if (!online) throw e; await productsApi.update(p.id, patch); });
      toast.success(done);
      refresh();
    } catch { toast.error(t('Nahi hua')); }
  };
  const switchOff = async () => {
    const ok = await confirm({
      title: t('"{{name}}" band karein?', { name: p.name }), tone: 'danger', confirmLabel: t('Band karein'), cancelLabel: t('Rehne dein'),
      message: [t('POS, online store aur naye bill mein nahi dikhegi. Purane bill, stock aur history waise hi rahenge. Baad mein dobara chalu kar sakte hain.'),
        stock > 0 ? t('Abhi {{stock}} {{unit}} stock pada hai — band karne se stock nahi hatega.', { stock: qty(stock), unit: p.unit }) : ''].filter(Boolean).join('\n\n'),
    });
    if (ok) await setFlag({ isActive: false }, t('Band kar di'));
  };
  const print = () => printTable({
    title: p.name, subtitle: [p.sku, p.barcode, p.category?.name].filter(Boolean).join(' · '),
    columns: [t('Cheez'), t('Qeemat')],
    rows: [
      [t('Retail price'), formatPKR(p.price)],
      ...(p.wholesalePrice ? [[t('Wholesale price'), formatPKR(p.wholesalePrice)]] : []),
      ...(p.creditPrice ? [[t('Credit (udhaar) price'), formatPKR(p.creditPrice)]] : []),
      ...(costHidden ? [] : [[t('Cost price'), formatPKR(p.costPrice)]]),
      [t('Stock'), `${qty(stock)} ${p.unit}`],
      ...(ins ? [[t('{{window}} din ki sale', { window: ins.window }), `${qty(ins.totals.qty)} ${p.unit} · ${formatPKR(ins.totals.revenue)}`]] : []),
      ...ctx.units.map((u) => [`${u.unitName} (${qty(u.conversionRate)} ${p.unit})`, formatPKR(u.price)]),
    ],
  });

  return (
    <View style={{ flex: 1 }}>
      <DetailTemplate
        title={p.name}
        subtitle={[p.category?.name, p.unit].filter(Boolean).join(' · ')}
        onRefresh={refresh}
        refreshing={product.isRefetching}
        actions={(
          <Row gap={0.5}>
            {can.labels && <IconButton icon={Tag} label={t('Label')} onPress={() => router.push({ pathname: '/barcode-labels', params: { productIds: JSON.stringify([p.id]) } } as never)} />}
            <IconButton icon={MoreHorizontal} label={t('Aur')} onPress={() => setMore(true)} />
          </Row>
        )}
        summary={(
          <View style={{ gap: th.space(3) }}>
            <Row gap={3} align="start">
              <ProductThumb name={p.name} category={p.category?.name} url={image} size={84} />
              <View style={{ flex: 1, gap: 4 }}>
                <Row gap={1} wrap>
                  {!p.isActive && <Badge tone="neutral">{t('Band hai')}</Badge>}
                  {p.isFeatured && <Badge tone="warning" icon={Star}>{t('Khaas')}</Badge>}
                  {p.category && <Badge tone="accent">{p.category.name}</Badge>}
                  {config.badges?.(ctx).map((b) => <Badge key={b.label} tone={b.tone ?? 'info'}>{b.label}</Badge>)}
                </Row>
                <Text size="xl" weight="bold">{p.name}</Text>
                <Row gap={1.5} wrap>
                  <Text weight="bold" ltr>{formatPKR(p.price)}</Text>
                  <Text tone="muted">{`/ ${p.unit}`}</Text>
                  {p.wholesalePrice ? <Text size="sm" tone="muted">{t('Wholesale {{wholesalePrice}}', { wholesalePrice: formatPKR(p.wholesalePrice) })}</Text> : null}
                  {p.creditPrice ? <Text size="sm" tone="muted">{t('Credit {{creditPrice}}', { creditPrice: formatPKR(p.creditPrice) })}</Text> : null}
                </Row>
                <Row gap={1} wrap>
                  {p.sku && <Badge tone="neutral">{t('SKU {{sku}}', { sku: p.sku })}</Badge>}
                  {p.barcode && <Badge tone="neutral">{p.barcode}</Badge>}
                  {p.brand && <Badge tone="neutral">{p.brand.name}</Badge>}
                  {tags.map((g) => <Badge key={g.id} tone="neutral">{`#${g.name}`}</Badge>)}
                </Row>
              </View>
            </Row>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
              <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={Boxes} tone={stock <= 0 ? 'danger' : low ? 'warning' : 'success'}
                label={branch ? t('Stock · {{name}}', { name: branch.name }) : t('Stock')} value={`${qty(stock)} ${p.unit}`} onPress={() => setTab('stock')}
                hint={shops.length > 1 ? t('Sab branches: {{allStock}} {{unit}}', { allStock: qty(allStock), unit: p.unit }) : stock <= 0 ? t('Khatam') : low ? t('Kam — had {{lowStockAlert}}', { lowStockAlert: qty(p.lowStockAlert) }) : ins?.totals.daysLeft != null ? t('~{{daysLeft}} din chalega', { daysLeft: ins.totals.daysLeft }) : t('Had {{lowStockAlert}}', { lowStockAlert: qty(p.lowStockAlert) })} />
              <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={ShoppingCart} tone="info" label={t('{{days}} din mein bika', { days })} onPress={() => setTab('sales')}
                value={ins ? `${qty(ins.totals.qty)} ${p.unit}` : '—'} hint={ins ? t('{{bills}} bill · roz ~{{perDay}}', { bills: ins.totals.bills, perDay: qty(ins.totals.perDay) }) : online ? undefined : t('Internet nahi')} />
              <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={Receipt} tone="brand" label={t('{{days}} din ki Sale', { days })} value={ins ? formatPKR(ins.totals.revenue) : '—'} />
              <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={LineChart} tone="success" label={t('{{days}} din ka Profit', { days })} value={ins ? cost(ins.totals.profit) : '—'}
                hint={costHidden ? t('Cost lock') : margin !== null ? t('{{value}}% margin', { value: margin.toFixed(1) }) : p.costPrice ? undefined : t('Cost nahi likhi')} />
              {tile
                ? <StatTile style={{ flexBasis: '100%' }} label={tile.label} value={tile.value} hint={tile.hint} tone="accent" />
                : <StatTile style={{ flexBasis: '100%' }} label={t('Stock ki value')} value={cost(Math.max(0, stock) * p.costPrice)} hint={t('Bechne par {{value}}', { value: formatPKR(Math.max(0, stock) * p.price) })} tone="accent" />}
            </View>
            {(stock <= 0 || low) && p.isActive && (
              <Card tone={stock <= 0 ? 'danger' : 'warning'}>
                <Row gap={2} align="start">
                  <AlertTriangle size={16} color={(stock <= 0 ? th.colors.danger : th.colors.warning).text} />
                  <Text size="sm" style={{ flex: 1 }}>
                    {(stock <= 0 ? t('Stock khatam hai — grahak wapas ja raha hoga') : t('Sirf {{stock}} {{unit}} bacha hai', { stock: qty(stock), unit: p.unit }))
                      + (ins && ins.totals.perDay > 0 ? t(' · roz ~{{perDay}} bikta hai, {{value}} mangwa lein (2 hafte ka)', { perDay: qty(ins.totals.perDay), value: Math.ceil(ins.totals.perDay * 14) }) : '')}
                  </Text>
                </Row>
                {can.buy && <Button size="sm" variant="link" iconEnd={ArrowRight} iconEndFlip onPress={() => router.push({ pathname: '/purchases/new', params: { from: 'low-stock', lines: JSON.stringify([{ productId: p.id, qty: Math.max(1, Math.ceil((ins?.totals.perDay ?? 0) * 14)), cost: p.costPrice }]) } } as never)}>{t('Purchase karein')}</Button>}
              </Card>
            )}
            {expiring.length > 0 && (
              <Card tone="warning" onPress={() => setTab('batches')}>
                <Row gap={2}><CalendarClock size={16} color={th.colors.warning.text} />
                  <Text size="sm" style={{ flex: 1 }}>{t('{{count}} batch {{value}}', { count: expiring.length, value: expiring.some((b) => expiryState(b.expiryDate, today) === 'expired') ? t('expire ho chuke / qareeb hain') : t('30 din mein expire honge') })}</Text>
                </Row>
              </Card>
            )}
            {config.alerts?.(ctx)}
            {!online && <Text size="xs" tone="muted">{onlineNeededText('reports')}</Text>}
            <Tabs tabs={tabs.map(({ value, label, icon }) => ({ value, label, icon }))} value={active.value} onChange={setTab} />
          </View>
        )}
        bottomActions={(can.stock || can.edit) ? (
          <>
            {can.stock && <Button variant="secondary" icon={Plus} style={{ flex: 1 }} onPress={() => setStockOpen(true)}>{t('Stock')}</Button>}
            {can.edit && <Button icon={Pencil} style={{ flex: 1 }} onPress={() => router.push(routes.edit(p.id) as never)}>{t('Edit')}</Button>}
          </>
        ) : undefined}
      >
        {active.value === 'overview' && <OverviewTab product={p} insights={ins} days={days} setDays={setDays} costHidden={costHidden} facts={config.facts?.(ctx) ?? []} stock={stock} />}
        {active.value === 'stock' && <StockTab product={p} insights={ins} stock={stock} shopId={shopId} canAdjust={can.stock} onAdjust={() => setStockOpen(true)} />}
        {active.value === 'sales' && <SalesTab insights={ins} />}
        {active.value === 'purchases' && <PurchasesTab product={p} costHidden={costHidden} canBuy={can.buy} />}
        {active.value === 'suppliers' && <SuppliersTab product={p} costHidden={costHidden} />}
        {active.value === 'batches' && <BatchesTab product={p} />}
        {active.value === 'units' && <UnitsTab product={p} units={ctx.units} stock={stock} costHidden={costHidden} />}
        {active.render?.()}
      </DetailTemplate>
      <StockSheet open={stockOpen} onClose={() => setStockOpen(false)} chips={config.stockChips} onSaved={() => refresh()}
        item={{ id: p.id, name: p.name, unit: p.unit, stock, price: p.price }} />
      <ActionSheet open={more} onClose={() => setMore(false)} title={p.name} actions={[
        { icon: Star, label: p.isFeatured ? t('Aam karein') : t('Khaas banayein'), hidden: !can.edit, onPress: () => void setFlag({ isFeatured: !p.isFeatured }, p.isFeatured ? t('Aam kar di') : t('Khaas bana di')) },
        { icon: p.isActive ? EyeOff : Eye, label: p.isActive ? t('Band karein') : t('Chalu karein'), hidden: !can.edit, destructive: p.isActive, onPress: () => (p.isActive ? void switchOff() : void setFlag({ isActive: true }, t('Chalu kar di'))) },
        { icon: Printer, label: t('Print'), onPress: () => void print() },
        { icon: Plus, label: t('Purchase'), hidden: !can.buy, onPress: () => router.push('/purchases/new' as never) },
      ]} />
    </View>
  );
}
