/**
 * Products: the whole catalog with server-side search, filters and sort (the
 * phone's own copy when offline), stock tabs with counts, totals, quick stock
 * and rate, swipe actions, multi-select bulk actions, camera scan to find or
 * create, CSV / print, analytics and the guide. Industries add their own
 * parts through config (industry/registry.ts). Same as the web products page.
 */

import { router, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  AlertTriangle, ArrowRight, BarChart3, Boxes, CalendarClock, CheckSquare, CloudOff, Download, FileUp, GraduationCap, Library, ListChecks, MoreHorizontal, Package,
  Plus, Printer, ScanLine, SlidersHorizontal, Snowflake, Table2, X,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { cleanCode } from '@nafaa/core/inventory';
import { useAuthStore } from '@/core/auth/store';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { offline } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Button, Card, Chip, EmptyState, IconButton, ListTemplate, Row, Segmented, Text, confirm, toast, useTheme,
} from '@/design';
import { Scanner } from '@/core/hardware/scanner';
import { catalogApi, type CatalogItem, type CatalogStock } from '../../api/catalog';
import { productsApi } from '../../api/products';
import { ActionSheet, type SheetAction } from '../../catalog-setup/components/ActionSheet';
import { StockSheet } from '../../components/StockSheet';
import { useInventoryConfig, useProductRoutes } from '../../industry/registry';
import { qty, useCostMask, useRefreshInventory } from '../../lib/shared';
import { StatStrip, printTable } from '../../stock/components/parts';
import { CatalogAnalytics } from './CatalogAnalytics';
import { ProductListRow, type RowCan } from './ProductRow';
import { BulkBar, FilterSheet, GuideSheet, PriceSheet } from './sheets';
import { fetchAllProducts, useCatalog, useCatalogAnalytics } from './useCatalog';

const csvCell = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function ProductsScreen({ tabBar }: { tabBar?: boolean }) {
  const th = useTheme();
  const params = useLocalSearchParams<{ categoryId?: string; brandId?: string; tagId?: string; noCost?: string; stock?: string }>();
  const cfg = useInventoryConfig();
  const config = cfg.list;
  const routes = useProductRoutes();
  const c = useCatalog({
    categoryId: params.categoryId || undefined, brandId: params.brandId || undefined, tagId: params.tagId || undefined,
    noCost: params.noCost === '1' || undefined, stock: (params.stock as CatalogStock) || 'all',
  });
  const permission = usePermission();
  const { costHidden, cost } = useCostMask();
  const refresh = useRefreshInventory();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const can = {
    create: permission(P.PRODUCTS_CREATE),
    edit: permission(P.PRODUCTS_EDIT),
    delete: permission(P.PRODUCTS_DELETE),
    // Stock was always changed through product edit on the web, so either right allows it.
    stock: permission(P.STOCK_ADJUSTMENTS_MANAGE) || permission(P.PRODUCTS_EDIT),
  };
  const [tab, setTab] = useState<string>(() => (config.extraTab?.initial ? config.extraTab.id : 'products'));
  const [stockItem, setStockItem] = useState<CatalogItem | null>(null);
  const [priceItem, setPriceItem] = useState<CatalogItem | null>(null);
  const [scan, setScan] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [guide, setGuide] = useState(false);
  const [exporting, setExporting] = useState(false);
  const analytics = useCatalogAnalytics(tab === 'analytics');
  const d = c.data;
  const st = d?.stats;
  const noun = config.noun ?? 'cheezein';
  const selecting = c.selected.size > 0;

  const openStock = useCallback((i: CatalogItem) => {
    const locked = config.stockLocked?.(i);
    if (locked) { toast.info(locked); return; }
    setStockItem(i);
  }, [config]);
  const remove = useCallback(async (i: CatalogItem) => {
    const ok = await confirm({
      title: t('"{{name}}" hatayein?', { name: i.name }), tone: 'danger', confirmLabel: t('Hatayein'),
      message: t('Jis cheez ki sale ya purchase hui ho wo mitti nahi, sirf band hoti hai — purane bill aur stock record salamat rehte hain.'),
    });
    if (!ok) return;
    try {
      const r = await productsApi.remove(i.id, false);
      if (r?.softDeleted) toast.info(t('"{{name}}" band kar diya', { name: i.name }), { message: t('Is ki sale ya purchase hui hai, is liye record rehta hai.') });
      else toast.success(t('"{{name}}" hata diya', { name: i.name }));
      void refresh();
    } catch { toast.error(t('Hataya nahi ja saka')); }
  }, [refresh]);

  const onScan = async (raw: string) => {
    const term = cleanCode(raw);
    if (!term) return false;
    const local = await offline.products.byBarcode(term).catch(() => null);
    let hit: CatalogItem | null = null;
    if (!local) {
      const res = await catalogApi.list({ stock: 'all', active: 'all', sort: 'name', search: term }, 1, 5).catch(() => null);
      hit = res?.items.find((i) => [i.barcode, i.sku].some((v) => v?.toLowerCase() === term.toLowerCase())) ?? (res?.items.length === 1 ? res.items[0] : null);
    }
    if (local || hit) {
      setScan(false);
      c.clear(); c.setSearch(term);
      const name = local?.product.name ?? hit!.name;
      toast.success(name, can.stock && hit ? { action: { label: t('+ Stock'), onPress: () => openStock(hit!) } } : undefined);
      return true;
    }
    setScan(false);
    if (await config.onScanMiss?.(term)) return true;
    toast.error(t('"{{term}}" kisi cheez par nahi mila', { term }),
      can.create ? { action: { label: t('Nayi banayein'), onPress: () => router.push({ pathname: routes.create, params: { barcode: term } } as never) } } : undefined);
    return false;
  };

  const exportCsv = async (onlyIds?: string[]) => {
    setExporting(true);
    try {
      const { items } = await fetchAllProducts(c.filters);
      const rows = onlyIds ? items.filter((i) => onlyIds.includes(i.id)) : items;
      if (!rows.length) { toast.error(t('Koi cheez nahi')); return; }
      const head = [t('Naam'), 'SKU', t('Barcode'), t('Category'), t('Brand'), t('Unit'), ...(costHidden ? [] : [t('Cost')]), t('Rate'), t('Wholesale'), t('Credit'), t('Stock'), t('Halat')];
      const lines = rows.map((i) => [i.name, i.sku, i.barcode, i.category?.name, i.brand?.name, i.unit, ...(costHidden ? [] : [i.costPrice]), i.price, i.wholesalePrice ?? '', i.creditPrice ?? '', i.stock, i.isActive ? t('Chalu') : t('Band')]);
      const csv = [head, ...lines].map((r) => r.map(csvCell).join(',')).join('\n');
      const path = `${FileSystem.cacheDirectory}products-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(path, `﻿${csv}`);
      await Sharing.shareAsync(path, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: t('Products') });
    } catch { toast.error(t('Export nahi hua')); } finally { setExporting(false); }
  };
  const print = async () => {
    const { items, stats } = await fetchAllProducts(c.filters, 3000).catch(() => ({ items: [] as CatalogItem[], stats: undefined }));
    await printTable({
      title: t('{{label}} — maal ki list', { label: t(cfg.label) }),
      subtitle: `${tenantName ?? ''} · ${t('Cheezein: {{count}} · Kam: {{value}} · Khatam: {{value2}}', { count: items.length, value: stats?.low ?? 0, value2: stats?.out ?? 0 })}`,
      columns: [t('Cheez'), t('Category'), ...(costHidden ? [] : [t('Cost')]), t('Rate'), t('Stock')],
      rows: items.map((i) => [i.name, i.category?.name ?? '', ...(costHidden ? [] : [formatPKR(i.costPrice)]), formatPKR(i.price), `${qty(i.stock)} ${i.unit}`]),
    });
  };

  const tabs: Array<{ id: CatalogStock; label: string }> = [
    { id: 'all', label: t('Sab') }, { id: 'in', label: t('Stock mein') }, { id: 'low', label: t('Kam') }, { id: 'out', label: t('Khatam') },
    { id: 'dead', label: t('Nahi bik raha') }, ...((d?.tabs.expiring ?? 0) > 0 ? [{ id: 'expiring' as const, label: t('Expiry qareeb') }] : []),
  ];

  const filterChips: Array<[string, () => void]> = [];
  if (c.f.categoryId) filterChips.push([d?.categories.find((x) => x.id === c.f.categoryId)?.name ?? t('Category'), () => c.set('categoryId', undefined)]);
  if (c.f.brandId) filterChips.push([d?.brands.find((x) => x.id === c.f.brandId)?.name ?? t('Brand'), () => c.set('brandId', undefined)]);
  if (c.f.tagId) filterChips.push([`#${d?.tagNames[c.f.tagId]?.name ?? t('Tag')}`, () => c.set('tagId', undefined)]);
  if (c.f.featured) filterChips.push([t('Sirf khaas'), () => c.set('featured', undefined)]);
  if (c.f.noCost) filterChips.push([t('Cost nahi likhi'), () => c.set('noCost', undefined)]);
  if (c.f.kindOf) filterChips.push([c.f.kindOf === 'raw' ? t('Raw material') : t('Bechne wale'), () => c.set('kindOf', undefined)]);
  if (c.f.active !== 'active') filterChips.push([c.f.active === 'inactive' ? t('Band wale') : t('Chalu + band'), () => c.set('active', 'active')]);
  for (const k of ['condition', 'etype', 'kind', 'serial'] as const) if (c.f[k]) filterChips.push([String(c.f[k]), () => c.set(k, undefined)]);

  const rowCan: RowCan = { edit: can.edit, delete: can.delete, stock: can.stock, price: can.edit };
  const source = config.useSource?.();
  const extrasFor = useCallback((i: CatalogItem) => config.extras?.(i, { costHidden, source }) ?? {}, [config, costHidden, source]);
  const allVisibleSelected = c.items.length > 0 && c.items.every((i) => c.selected.has(i.id));
  const ExtraTab = config.extraTab?.Component;
  const Banners = config.Banners;
  const listTab = tab === 'products';

  const moreActions: SheetAction[] = [
    { icon: CheckSquare, label: t('Chunein'), onPress: () => c.setSelected(new Set(c.items.slice(0, 1).map((i) => i.id))), hidden: !c.items.length },
    { icon: Library, label: t('Library se products'), onPress: () => router.push('/products/library' as never), hidden: !can.create },
    { icon: FileUp, label: t('Excel import'), onPress: () => router.push('/products/bulk-import' as never), hidden: !can.create },
    { icon: Table2, label: t('Bulk banayein'), onPress: () => router.push({ pathname: '/products/bulk-import', params: { start: 'blank' } } as never), hidden: !can.create },
    { icon: ListChecks, label: t('Bulk edit — bohat se products ek saath (spreadsheet)'), onPress: () => router.push('/products/bulk-edit' as never), hidden: !can.edit },
    ...(config.actions ?? []).filter((a) => !a.permission || permission(a.permission as never)).map((a) => ({
      icon: a.icon, label: t(a.label), onPress: () => (a.onPress ? a.onPress() : router.push(a.href as never)),
    })),
    { icon: Download, label: exporting ? t('Ban raha…') : t('CSV'), onPress: () => void exportCsv() },
    { icon: Printer, label: t('Print'), onPress: () => void print() },
    { icon: GraduationCap, label: t('Guide'), onPress: () => setGuide(true) },
  ];

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={tab} onChange={setTab} options={[
        { value: 'products', label: t('Maal'), icon: Boxes, count: c.count || undefined },
        { value: 'analytics', label: t('Analytics'), icon: BarChart3 },
        ...(config.extraTab ? [{ value: config.extraTab.id, label: t(config.extraTab.label), icon: config.extraTab.icon }] : []),
      ]} />
      {listTab && st && (
        <StatStrip items={[
          { label: t('Stock ki cost'), value: cost(st.costValue), hint: t('{{units}} units', { units: qty(st.units) }) },
          { label: t('Bechne par milega'), value: formatPKR(st.saleValue), tone: 'success', hint: costHidden ? undefined : t('profit {{cost}}', { cost: cost(st.saleValue - st.costValue) }) },
          ...(c.offline ? [] : [
            { label: t('{{value}} din ki sale', { value: st.windowDays }), value: formatPKR(st.revenue30), tone: 'info' as const, hint: t('{{sold30}} units biki', { sold30: qty(st.sold30) }) },
            { label: t('Pada hua maal'), value: cost(st.deadValue), tone: 'warning' as const, hint: t('{{dead}} nahi bik rahi', { dead: st.dead }), onPress: () => c.setStock('dead') },
          ]),
        ]} />
      )}
      {c.offline && (
        <Card tone="info">
          <Row gap={2} align="start"><CloudOff size={16} color={th.colors.info.text} />
            <Text size="sm" style={{ flex: 1 }}>{t('Internet nahi — phone par save maal dikh raha hai. Sale aur expiry ka hisaab internet aane par.')}</Text>
          </Row>
        </Card>
      )}
      {listTab && d && d.alerts.low.length > 0 && c.f.stock === 'all' && !c.hasFilters && (
        <Card tone="warning">
          <Row gap={1.5} wrap>
            <AlertTriangle size={16} color={th.colors.warning.text} />
            <Text size="sm" weight="semibold">{t('{{low}} cheezein kam hain:', { low: st?.low })}</Text>
            {d.alerts.low.slice(0, 4).map((a) => (
              <Chip key={a.id} label={`${a.name} · ${qty(a.stock)}`} onPress={() => { const it = c.items.find((i) => i.id === a.id); if (it && can.stock) openStock(it); else c.setSearch(a.name); }} />
            ))}
            <Button size="sm" variant="link" iconEnd={ArrowRight} iconEndFlip onPress={() => c.setStock('low')}>{t('Sab dekhein')}</Button>
          </Row>
        </Card>
      )}
      {listTab && d && Banners && <Banners data={d} setFilter={(k, v) => c.set(k as never, v as never)} />}
      {listTab && c.f.noCost && !costHidden && (
        <Card tone="warning">
          <Text size="sm"><Text size="sm" weight="bold">{t('{{count}} cheezon ki Cost nahi likhi.', { count: c.count })}</Text> {t('Jab tak Cost nahi, in ki poori sale Profit mein gini jati hai.')}</Text>
          {can.edit && <Button size="sm" icon={ListChecks} style={{ marginTop: 8 }} onPress={() => router.push({ pathname: '/products/bulk-edit', params: { nocost: '1' } } as never)}>{t('Ek saath Cost bharein')}</Button>}
        </Card>
      )}
      {listTab && filterChips.length > 0 && (
        <Row gap={1.5} wrap>
          {filterChips.map(([label, off]) => <Chip key={label} label={label} icon={X} selected onPress={off} />)}
          <Button size="sm" variant="link" onPress={c.clear}>{t('Filter hatayein')}</Button>
        </Row>
      )}
      {listTab && c.items.length > 0 && selecting && (
        <Button size="sm" variant="ghost" icon={CheckSquare} onPress={() => c.setSelected(allVisibleSelected ? new Set() : new Set(c.items.map((i) => i.id)))}>
          {allVisibleSelected ? t('Chunna khatam') : t('Nazar aane wale {{count}} chunein', { count: c.items.length })}
        </Button>
      )}
      {tab === 'analytics' && (
        <CatalogAnalytics data={analytics.data} stats={st} loading={analytics.isLoading || c.loading} costHidden={costHidden} offline={c.offline} detail={routes.detail} />
      )}
      {ExtraTab && tab === config.extraTab?.id && <ExtraTab />}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ListTemplate
        title={t('Products')}
        subtitle={st ? `${st.products} ${t(noun)}` : undefined}
        tabBar={tabBar}
        actions={(
          <Row gap={0.5}>
            <IconButton icon={ScanLine} label={t('Barcode scan')} onPress={() => setScan(true)} />
            <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={c.moreFilters || undefined} onPress={() => setFiltersOpen(true)} />
            <IconButton icon={MoreHorizontal} label={t('Aur')} onPress={() => setMoreOpen(true)} />
          </Row>
        )}
        search={listTab ? { value: c.search, onChange: c.setSearch, placeholder: t('Naam, SKU ya barcode…'), onScan: () => setScan(true) } : undefined}
        filters={listTab ? { value: c.f.stock, onChange: (v) => c.setStock(v as CatalogStock), options: tabs.map((x) => ({ value: x.id, label: x.label, count: d?.tabs[x.id], icon: x.id === 'dead' ? Snowflake : x.id === 'expiring' ? CalendarClock : x.id === 'low' ? AlertTriangle : undefined })) } : undefined}
        summary={summary}
        data={listTab ? c.items : []}
        loading={listTab && c.loading}
        error={listTab && !d ? c.error : undefined}
        onRetry={() => void c.refetch()}
        refreshing={c.refetching}
        onRefresh={() => { void c.refetch(); void refresh({ sync: true }); }}
        onEndReached={c.loadMore}
        footer={c.loadingMore ? <ActivityIndicator style={{ margin: th.space(4) }} /> : undefined}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <ProductListRow item={item} extras={extrasFor(item)} tagNames={d?.tagNames ?? {}} costHidden={costHidden} days={st?.windowDays ?? 30} offline={c.offline}
            selected={c.selected.has(item.id)} selecting={selecting} can={config.stockLocked?.(item) ? { ...rowCan, stock: false } : rowCan}
            onOpen={(i) => router.push(routes.detail(i.id) as never)} onToggle={c.toggle} onStock={openStock} onPrice={setPriceItem}
            onEdit={(i) => router.push(routes.edit(i.id) as never)} onDelete={(i) => void remove(i)} />
        )}
        empty={listTab ? (
          <EmptyState icon={Package} title={c.hasFilters ? t('Is filter mein kuch nahi') : t('Abhi koi maal nahi')}
            message={c.hasFilters ? t('Filter badal kar dekhein ya hata dein.') : t('Pehli cheez daalein — ek ek kar ke, ya Excel se sab ek saath.')}
            action={c.hasFilters ? <Button variant="secondary" onPress={c.clear}>{t('Filter hatayein')}</Button>
              : can.create ? <Button icon={Plus} onPress={() => router.push(routes.create as never)}>{t('Nayi cheez')}</Button> : undefined} />
        ) : <View />}
        fab={can.create && !selecting && listTab ? { icon: Plus, label: t('Naya'), onPress: () => router.push(routes.create as never) } : undefined}
      />
      {selecting && listTab && (
        <BulkBar ids={[...c.selected]} can={can} onClear={() => c.setSelected(new Set())} onExport={() => void exportCsv([...c.selected])}
          onDone={() => { c.setSelected(new Set()); void refresh(); }} />
      )}
      {scan && <Scanner title={t('Barcode scan')} onClose={() => setScan(false)} onCode={onScan} />}
      <StockSheet open={!!stockItem} item={stockItem} chips={stockItem ? config.stockChips?.(stockItem) : undefined} onClose={() => setStockItem(null)} />
      <PriceSheet item={priceItem} onClose={() => setPriceItem(null)} />
      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} data={d} f={c.f} set={c.set} sort={c.sort} setSort={c.setSort}
        config={config} costHidden={costHidden} onClear={c.clear} />
      <ActionSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t('Products')} actions={moreActions} />
      <GuideSheet open={guide} onClose={() => setGuide(false)} extra={config.guide} />
    </View>
  );
}
