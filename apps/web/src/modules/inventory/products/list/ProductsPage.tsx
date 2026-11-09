/**
 * Products: the whole catalog with server-side search, filters and sort, so
 * every count and total covers all products, not just the loaded ones. Grid
 * or table view, quick stock, bulk actions, scan, CSV, print/PDF and
 * whole-catalog analytics. Industries add their own details through config.
 *
 * Keys: / search · B scan · V view · A analytics · N new · R refresh · G guide.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownWideNarrow, BarChart3, Boxes, CalendarClock, Check, CloudOff, Download, FileUp, Filter, GraduationCap,
  LayoutGrid, Layers, ListChecks, MousePointerClick, Package, Plus, RefreshCw, ScanLine, Search, Snowflake, Sparkles, Star,
  Columns3, Globe, Rows3, Square, SquareCheck, Table2, Tag, ToggleRight, Truck, Wallet, X, type LucideIcon,
  Wheat,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, Kbd, Modal, MoreFilters, PageHero, PageShell, SearchField, Segmented, Skeleton, heroButton, heroIconButton, heroPrimaryButton,
  type FilterGroup, type FilterOption,
} from '@/design-system/components';
import { usePriceTierSettings } from '@modules/pos/lib/usePriceTierSettings';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { useAnyPermission, usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { catalogApi, type CatalogFilters, type CatalogItem, type CatalogPage, type CatalogSort, type CatalogStock } from './api';
import { treeOrder } from '@modules/inventory/categories/lib/tree';
import { useCatalog, useCatalogAnalytics, type OptionalColumn } from './useCatalog';
import { fetchAllProducts, productsCsv, productsDoc } from './exportProducts';
import { BulkBar } from './components/BulkBar';
import { CatalogAnalytics } from './components/CatalogAnalytics';
import { ProductCard, ProductRow, qty } from './components/ProductCard';
import { StockModal } from './components/StockModal';
import type { GuideStep, ProductsPageConfig } from './types';
import { t as tr } from '@core/i18n';

const SORTS: Array<FilterOption<CatalogSort>> = [
  { value: 'name', label: tr('Naam (A–Z)') },
  { value: 'new', label: tr('Naye pehle') },
  { value: 'old', label: tr('Purane pehle') },
  { value: 'bestSelling', label: tr('Zyada bikne wale'), hint: tr('Pichhle 30 din') },
  { value: 'slow', label: tr('Kam bikne wale'), hint: tr('Pada hua maal pehle') },
  { value: 'stockLow', label: tr('Kam stock pehle') },
  { value: 'stockHigh', label: tr('Zyada stock pehle') },
  { value: 'priceHigh', label: tr('Mehngay pehle') },
  { value: 'priceLow', label: tr('Sastay pehle') },
];
const COST_SORTS: Array<FilterOption<CatalogSort>> = [
  { value: 'value', label: tr('Stock ki qeemat'), hint: tr('Sab se zyada paisa laga') },
  { value: 'margin', label: tr('Zyada profit wale') },
];
const STATUS: Array<FilterOption<CatalogFilters['active']>> = [
  { value: 'active', label: tr('Chalu'), hint: tr('POS par bikti hain') },
  { value: 'inactive', label: tr('Band'), hint: tr('Chhupi hui') },
  { value: 'all', label: tr('Sab') },
];
/** Category facet in tree order (parents first, children indented); "none" last. */
function categoryOptions(list: CatalogPage['categories']) {
  const none = list.filter((x) => x.id === 'none');
  return [...treeOrder(list.filter((x) => x.id !== 'none')), ...none.map((x) => ({ ...x, depth: 0 }))];
}

const KIND_DEFAULT: Record<string, string> = { made: tr('Khud banaya'), bought: tr('Khareed kar') };


export function ProductsPage({ config }: { config: ProductsPageConfig }) {
  const [params] = useSearchParams();
  const c = useCatalog({
    categoryId: params.get('categoryId') ?? undefined,
    brandId: params.get('brandId') ?? undefined,
    tagId: params.get('tagId') ?? undefined,
    supplierId: params.get('supplierId') ?? undefined,
    noCost: params.get('noCost') === '1' || undefined,
  });
  const navigate = useNavigate();
  const { sales: money, cost, costHidden } = useMasked();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const can = {
    create: usePermission(PERMISSIONS.PRODUCTS_CREATE),
    edit: usePermission(PERMISSIONS.PRODUCTS_EDIT),
    delete: usePermission(PERMISSIONS.PRODUCTS_DELETE),
    // Stock was always changed through product edit, so either right allows it.
    stock: useAnyPermission(useMemo(() => [PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE, PERMISSIONS.PRODUCTS_EDIT], [])),
  };
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<string>(() => (config.extraTab?.initial ? config.extraTab.id : 'products'));
  const [stockItem, setStockItemRaw] = useState<CatalogItem | null>(null);
  // Products whose stock comes from elsewhere (carpet rolls) never open the stock dialog.
  const setStockItem = (i: CatalogItem | null) => {
    const locked = i ? config.stockLocked?.(i) : null;
    if (locked) { toast.info(locked); return; }
    setStockItemRaw(i);
  };
  const [scanner, setScanner] = useState(false);
  const [guide, setGuide] = useState(false);
  const [exporting, setExporting] = useState(false);
  const analytics = useCatalogAnalytics(tab === 'analytics');
  const d = c.data;
  const st = d?.stats;
  const noun = config.noun ?? 'cheezein';

  const exportCsv = async (onlyIds?: string[]) => {
    setExporting(true);
    try {
      const { items, stats } = await fetchAllProducts(c.filters);
      const rows = onlyIds ? items.filter((i) => onlyIds.includes(i.id)) : items;
      if (!rows.length) { toast.error(tr('Koi cheez nahi')); return; }
      productsCsv(rows, [tr('Maal ki list — {{value}}{{value2}}', { value: tenantName ?? '', value2: shopName ? ` · ${shopName}` : '' }),
        tr('Cheezein: {{count}} · Kam: {{value}} · Khatam: {{value2}}', { count: rows.length, value: stats?.low ?? 0, value2: stats?.out ?? 0 })], !costHidden);
      toast.success(tr('{{count}} cheezein CSV mein', { count: rows.length }));
    } catch { toast.error(tr('Export nahi hua')); } finally { setExporting(false); }
  };
  const printDoc = async () => {
    const { items, stats } = await fetchAllProducts(c.filters, 3000);
    return productsDoc(items, stats, tr('{{label}} — maal ki list', { label: config.label }), money, !costHidden);
  };

  const onScan = useCallback(async (code: string) => {
    setScanner(false);
    const term = code.trim();
    if (!term) return;
    try {
      const res = await catalogApi.list({ stock: 'all', active: 'all', sort: 'name', search: term }, 1, 5);
      const hit = res.items.find((i) => [i.barcode, i.sku].some((v) => v?.toLowerCase() === term.toLowerCase())) ?? (res.items.length === 1 ? res.items[0] : null);
      if (hit) {
        c.clear(); c.setSearch(term);
        toast.success(hit.name, can.stock ? { action: { label: tr('+ Stock'), onClick: () => setStockItem(hit) } } : undefined);
        return;
      }
      if (await config.onScanMiss?.(term, navigate)) return;
      toast.error(tr('"{{term}}" kisi cheez par nahi mila', { term }), can.create ? { action: { label: tr('Nayi banayein'), onClick: () => navigate(`${config.paths.create}?barcode=${encodeURIComponent(term)}`) } } : undefined);
    } catch { toast.error(tr('Dhoonda nahi ja saka')); }
  }, [c, config, can.create, can.stock, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (k === 'b') setScanner(true);
      else if (k === 'v') c.setView(c.view === 'grid' ? 'table' : 'grid');
      else if (k === 'a') setTab((t) => (t === 'analytics' ? 'products' : 'analytics'));
      else if (k === 'n' && can.create) navigate(config.paths.create);
      else if (k === 'r') void c.refresh();
      else if (k === 'g') setGuide(true);
      else if (e.key === 'Escape' && c.selected.size) c.setSelected(new Set());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [c, can.create, config.paths.create, navigate]);

  const tabs: Array<{ id: CatalogStock; label: string; icon: LucideIcon; tone?: string }> = [
    { id: 'all', label: tr('Sab'), icon: Boxes },
    { id: 'in', label: tr('Stock mein'), icon: Package },
    { id: 'low', label: tr('Kam'), icon: AlertTriangle, tone: 'text-amber-600' },
    { id: 'out', label: tr('Khatam'), icon: X, tone: 'text-rose-600' },
    { id: 'dead', label: tr('Nahi bik raha'), icon: Snowflake, tone: 'text-slate-500' },
    ...((d?.tabs.expiring ?? 0) > 0 ? [{ id: 'expiring' as const, label: tr('Expiry qareeb'), icon: CalendarClock, tone: 'text-amber-600' }] : []),
  ];
  const labelOf = (kind: 'condition' | 'etype' | 'kind', v: string) => config.facetLabels?.[kind]?.[v] ?? (kind === 'kind' ? KIND_DEFAULT[v] : undefined) ?? v;
  const extrasFor = (i: CatalogItem) => config.extras?.(i, { costHidden, money }) ?? {};
  const allVisibleSelected = c.items.length > 0 && c.items.every((i) => c.selected.has(i.id));
  const selectVisible = () => c.setSelected(allVisibleSelected ? new Set() : new Set(c.items.map((i) => i.id)));

  // Load the next page when the end of the list scrolls into view.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !c.hasMore) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting && !c.loadingMore) void c.loadMore(); }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [c, c.hasMore, c.loadingMore]);

  // Tier price columns exist only once the owner turns price tiers on; until then they stay hidden.
  const tierCols = usePriceTierSettings().on;
  const shownCols = {
    wholesale: tierCols && c.cols.includes('wholesale'), credit: tierCols && c.cols.includes('credit'),
    supplier: c.cols.includes('supplier'), online: c.cols.includes('online'),
  };
  const colOptions: Array<FilterOption<OptionalColumn | 'none'>> = ([
    ...(tierCols ? [['wholesale', tr('Wholesale price')], ['credit', tr('Credit price')]] as const : []),
    ['supplier', tr('Supplier')], ['online', tr('Online')],
  ] as Array<readonly [OptionalColumn, string]>)
    .map(([value, label]) => ({ value, label, icon: c.cols.includes(value) ? SquareCheck : Square, hint: c.cols.includes(value) ? tr('Dikh raha hai') : tr('Chhupa hai') }));
  const extraCols = Object.values(shownCols).filter(Boolean).length;
  const cardProps = (i: CatalogItem) => ({
    item: i, config, extras: extrasFor(i), tagNames: d?.tagNames ?? {}, money, cost, costHidden, days: st?.windowDays ?? 30,
    selected: c.selected.has(i.id), selecting: c.selected.size > 0, onToggle: () => c.toggle(i.id),
    onStock: () => setStockItem(i), onDeleted: () => void c.refresh(), can: config.stockLocked?.(i) ? { ...can, stock: false } : can,
    cols: shownCols, compact: c.density === 'compact',
  });

  // Less used filters, each with its own clear label so no two read the same.
  const FACET_LABEL = { condition: tr('Condition'), etype: tr('Product type'), kind: tr('Banaya ya khareeda') } as const;
  const moreGroups: FilterGroup[] = [
    { id: 'active', label: tr('Halat'), icon: ToggleRight, value: c.f.active, empty: 'active', options: STATUS, onChange: (v) => c.set('active', v as CatalogFilters['active']) },
    ...(config.filters ?? []).flatMap((key): FilterGroup[] => {
      if (key === 'tags') {
        return d?.tags.length ? [{ id: key, label: tr('Tag'), icon: Tag, value: c.f.tagId ?? 'all', empty: 'all',
          options: [{ value: 'all', label: tr('Sab') }, ...d.tags.map((t) => ({ value: t.id, label: `#${t.name}`, hint: `${t.count}`, color: t.color })), { value: 'none', label: tr('Baghair tag') }],
          onChange: (v) => c.set('tagId', v === 'all' ? undefined : v) }] : [];
      }
      if (key === 'serial') {
        return (d?.facets.serial.tracked ?? 0) > 0 ? [{ id: key, label: tr('Serial'), icon: ListChecks, value: c.f.serial ?? 'all', empty: 'all',
          options: [{ value: 'all', label: tr('Sab') }, { value: 'tracked', label: tr('Serial wale ({{tracked}})', { tracked: d!.facets.serial.tracked }) }, { value: 'mismatch', label: tr('Ginti ghalat ({{mismatch}})', { mismatch: d!.facets.serial.mismatch }), hint: tr('Stock aur serial barabar nahi') }],
          onChange: (v) => c.set('serial', v === 'all' ? undefined : (v as 'tracked' | 'mismatch')) }] : [];
      }
      const facet = key === 'kind' ? d?.facets.kinds : key === 'condition' ? d?.facets.conditions : key === 'etype' ? d?.facets.etypes : null;
      if (!facet?.length) return [];
      return [{ id: key, label: FACET_LABEL[key as keyof typeof FACET_LABEL], icon: Filter, value: c.f[key as keyof typeof FACET_LABEL] ?? 'all', empty: 'all',
        options: [{ value: 'all', label: tr('Sab') }, ...facet.map((x) => ({ value: x.id, label: `${labelOf(key as keyof typeof FACET_LABEL, x.id)} (${x.count})` }))],
        onChange: (v) => c.set(key as keyof typeof FACET_LABEL, v === 'all' ? undefined : v) }];
    }),
    { id: 'online', label: tr('Online'), icon: Globe, value: c.f.online ?? 'all', empty: 'all',
      options: [{ value: 'all', label: tr('Sab') }, { value: 'listed', label: tr('Online lagi hui'), hint: st?.online != null ? `${st.online}` : undefined }, { value: 'unlisted', label: tr('Online nahi') }],
      onChange: (v) => c.set('online', v === 'all' ? undefined : (v as 'listed' | 'unlisted')) },
    { id: 'kindOf', label: tr('Raw material'), icon: Wheat, value: c.f.kindOf ?? 'all', empty: 'all',
      options: [{ value: 'all', label: tr('Sab') }, { value: 'sale', label: tr('Sirf bechne wale') }, { value: 'raw', label: tr('Sirf raw material') }],
      onChange: (v) => c.set('kindOf', v === 'all' ? undefined : (v as 'raw' | 'sale')) },
    { id: 'featured', label: tr('Khaas'), icon: Star, value: c.f.featured ? 'yes' : 'all', empty: 'all',
      options: [{ value: 'all', label: tr('Sab') }, { value: 'yes', label: tr('Sirf khaas') }],
      onChange: (v) => c.set('featured', v === 'yes' ? true : undefined) },
    ...(costHidden ? [] : [{ id: 'noCost', label: tr('Cost'), icon: Wallet, value: c.f.noCost ? 'none' : 'all', empty: 'all',
      options: [{ value: 'all', label: tr('Sab') }, { value: 'none', label: tr('Cost nahi likhi'), hint: tr('In ki poori sale Profit ginti hai') }],
      onChange: (v: string) => c.set('noCost', v === 'none' ? true : undefined) }]),
  ];

  const filterChips: Array<[string, () => void]> = [];
  if (c.f.categoryId) filterChips.push([d?.categories.find((x) => x.id === c.f.categoryId)?.path ?? d?.categories.find((x) => x.id === c.f.categoryId)?.name ?? tr('Category'), () => c.set('categoryId', undefined)]);
  if (c.f.supplierId) filterChips.push([d?.suppliers?.find((x) => x.id === c.f.supplierId)?.name ?? tr('Supplier'), () => c.set('supplierId', undefined)]);
  if (c.f.online) filterChips.push([c.f.online === 'listed' ? tr('Online lagi hui') : tr('Online nahi'), () => c.set('online', undefined)]);
  if (c.f.brandId) filterChips.push([d?.brands.find((x) => x.id === c.f.brandId)?.name ?? tr('Brand'), () => c.set('brandId', undefined)]);
  if (c.f.tagId) filterChips.push([`#${d?.tagNames[c.f.tagId]?.name ?? tr('Tag')}`, () => c.set('tagId', undefined)]);
  if (c.f.kind) filterChips.push([labelOf('kind', c.f.kind), () => c.set('kind', undefined)]);
  if (c.f.condition) filterChips.push([labelOf('condition', c.f.condition), () => c.set('condition', undefined)]);
  if (c.f.etype) filterChips.push([labelOf('etype', c.f.etype), () => c.set('etype', undefined)]);
  if (c.f.serial) filterChips.push([c.f.serial === 'mismatch' ? tr('Serial ginti ghalat') : tr('Serial wale'), () => c.set('serial', undefined)]);
  if (c.f.featured) filterChips.push([tr('Sirf khaas'), () => c.set('featured', undefined)]);
  if (c.f.noCost) filterChips.push([tr('Cost nahi likhi'), () => c.set('noCost', undefined)]);
  if (c.f.kindOf) filterChips.push([c.f.kindOf === 'raw' ? tr('Raw material') : tr('Bechne wale'), () => c.set('kindOf', undefined)]);
  if (c.f.active !== 'active') filterChips.push([c.f.active === 'inactive' ? tr('Band wale') : tr('Chalu + band'), () => c.set('active', 'active')]);
  if (c.search.trim()) filterChips.push([`"${c.search.trim()}"`, () => c.setSearch('')]);

  const ExtraTab = config.extraTab?.Component;
  // A standalone extra tab brings its own search and filters, so the catalog controls step aside.
  const catalogControls = !(config.extraTab?.standalone && tab === config.extraTab.id);
  const Banners = config.Banners;
  const HeroExtra = config.HeroExtra;

  return (
    <PageShell className="pb-12">
      {scanner && <BarcodeScanner onDetected={(code: string) => void onScan(code)} onClose={() => setScanner(false)} />}
      {stockItem && <StockModal item={stockItem} chips={config.stockChips?.(stockItem)} money={money} onClose={() => setStockItemRaw(null)} onSaved={() => void c.refresh()} />}
      {guide && <ProductsGuide extra={config.guide} onClose={() => setGuide(false)} />}

      <PageHero
        title={tr('Products')}
        chip={<><Package />{st ? `${st.products} ${tr(noun)}` : '…'}</>}
        busy={c.fetching && !c.loading}
        meta={`${config.label} · ${shopName ?? tenantName ?? ''}`}
        loading={c.loading || !st}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={() => setScanner(true)} title={tr('Barcode scan (B)')} className={heroButton}><ScanLine className="h-4 w-4" /><span className="hidden sm:inline">{tr('Scan')}</span></button>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting} className={heroButton}><Download className="h-4 w-4" />{exporting ? tr('Ban raha…') : tr('CSV')}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label={tr('Print')} /></span>
          {HeroExtra && <HeroExtra />}
          {can.create && config.paths.bulkImport && <Link to={config.paths.bulkImport} title={tr('Excel ya CSV file se products daalein')} className={heroButton}><FileUp className="h-4 w-4" /><span className="hidden sm:inline">{tr('Excel import')}</span></Link>}
          {can.create && <Link to="/products/bulk-create" title={tr('Bohat se products ek sheet me likh kar banayein')} className={heroButton}><Table2 className="h-4 w-4" /><span className="hidden sm:inline">{tr('Bulk banayein')}</span></Link>}
          {can.edit && <Link to="/products/bulk-edit" title={tr('Bulk edit — bohat se products ek saath (spreadsheet)')} className={heroIconButton}><ListChecks className="h-4 w-4" /></Link>}
          <button type="button" onClick={() => void c.refresh()} title={tr('Taaza karein (R)')} className={heroIconButton}><RefreshCw className={cn('h-4 w-4', c.fetching && 'animate-spin')} /></button>
          <button type="button" onClick={() => setGuide(true)} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.create && <Link to={config.paths.create} className={heroPrimaryButton}><Plus className="h-4 w-4" />{tr('Naya')}</Link>}
        </>}
        stats={[
          { label: tr('Products'), value: st ? st.products.toLocaleString('en-PK') : '', hint: st ? tr('{{inStock}} stock me · {{inactive}} band', { inStock: st.inStock, inactive: st.inactive }) : '' },
          { label: tr('Stock ki cost'), value: st ? cost(st.costValue) : '', hint: st ? (costHidden ? tr('{{units}} units', { units: qty(st.units) }) : tr('Bechne par {{value}}', { value: money(st.saleValue) })) : '' },
          { label: tr('Kam stock'), value: st ? st.low.toLocaleString('en-PK') : '', hint: tr('mangwana hai') },
          { label: tr('Khatam'), value: st ? st.out.toLocaleString('en-PK') : '', hint: st ? tr('{{dead}} nahi bik rahi', { dead: st.dead }) : '' },
        ]}
      />

      {c.offline && (
        <p className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-[0.8125rem] font-medium text-sky-800 ring-1 ring-sky-100">
          <CloudOff className="h-4 w-4" /> {' '}{tr('Internet nahi — computer par save maal dikh raha hai. Sale aur expiry ka hisaab internet aane par.')}
        </p>
      )}

      {catalogControls && <>
      {/* Stock tabs with counts */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
        {tabs.map((t) => {
          const on = c.f.stock === t.id;
          const n = d?.tabs[t.id];
          return (
            <button key={t.id} type="button" onClick={() => c.setStock(t.id)}
              className={cn('inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-[0.8125rem] font-semibold transition',
                on ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-700 ring-1 ring-slate-200/80 hover:bg-slate-50')}>
              <t.icon className={cn('h-4 w-4', !on && t.tone)} />{t.label}
              <span className={cn('min-w-[1.5rem] rounded-full px-1.5 text-center text-[0.6875rem] tabular-nums', on ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>{n ?? '·'}</span>
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      {d && d.alerts.low.length > 0 && c.f.stock === 'all' && !c.hasFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200/70">
          <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-amber-900"><AlertTriangle className="h-4 w-4 text-amber-600" />{tr('{{low}} cheezein kam hain:', { low: st?.low })}</span>
          {d.alerts.low.slice(0, 6).map((a) => (
            <button key={a.id} type="button" disabled={!can.stock}
              onClick={() => { const it = c.items.find((i) => i.id === a.id); if (it) setStockItem(it); else c.setSearch(a.name); }}
              className="rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-medium text-amber-900 ring-1 ring-amber-200 enabled:hover:bg-amber-100">
              {a.name} · <span className="font-bold tabular-nums">{qty(a.stock)}</span>
            </button>
          ))}
          <button type="button" onClick={() => c.setStock('low')} className="ms-auto text-[0.75rem] font-semibold text-amber-800 hover:underline">{tr('Sab dekhein →')}</button>
        </div>
      )}
      {d && Banners && <Banners data={d} setFilter={(k, v) => c.set(k as never, v as never)} />}
      {c.f.noCost && !costHidden && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="min-w-[12rem] flex-1">
            <b>{tr('{{count}} cheezon ki Cost nahi likhi.', { count: c.count.toLocaleString('en-PK') })}</b> {' '}{tr('Jab tak Cost nahi, in ki poori sale Profit mein gini jati hai.')}
          </p>
          {can.edit && (
            <Link to="/products/bulk-edit?nocost=1" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 font-semibold text-white hover:bg-amber-700 max-sm:w-full">
              <ListChecks className="h-4 w-4" /> {' '}{tr('Ek saath Cost bharein')}
            </Link>
          )}
        </div>
      )}

      {/* Toolbar: search and the most used filters in one row, the rest under "Aur filters". */}
      <FilterBar
        search={<SearchField ref={searchRef} value={c.search} onChange={c.setSearch} placeholder={tr('Naam, SKU ya barcode…')} label={tr('Maal search')} />}
        chips={filterChips.length > 0 ? <>{filterChips.map(([label, remove]) => <FilterChip key={label} onRemove={remove}>{label}</FilterChip>)}</> : undefined}
        onClear={c.clear}>
        {(d?.categories.length ?? 0) > 0 && (
          <FilterMenu icon={Layers} label={tr('Category')} value={c.f.categoryId ?? 'all'} active={!!c.f.categoryId} width="w-80"
            valueLabel={c.f.categoryId ? d!.categories.find((x) => x.id === c.f.categoryId)?.name : undefined}
            options={[{ value: 'all', label: tr('Sab') }, ...categoryOptions(d!.categories).map((x) => ({
              value: x.id, label: `${'\u2003'.repeat(x.depth)}${x.depth ? '↳ ' : ''}${x.id === 'none' ? tr('Baghair category') : x.name}`,
              hint: `${x.count} ${tr(noun)}`, color: x.color,
            }))]}
            onChange={(v) => c.set('categoryId', v === 'all' ? undefined : v)} />
        )}
        {(d?.suppliers?.length ?? 0) > 0 && (
          <FilterMenu icon={Truck} label={tr('Supplier')} value={c.f.supplierId ?? 'all'} active={!!c.f.supplierId} width="w-72"
            options={[{ value: 'all', label: tr('Sab') }, ...d!.suppliers!.map((x) => ({ value: x.id, label: x.id === 'none' ? tr('Supplier nahi') : x.name, hint: `${x.count} ${tr(noun)}` }))]}
            onChange={(v) => c.set('supplierId', v === 'all' ? undefined : v)} />
        )}
        {(d?.brands.length ?? 0) > 0 && (
          <FilterMenu icon={Sparkles} label={tr('Brand')} value={c.f.brandId ?? 'all'} active={!!c.f.brandId} width="w-72"
            options={[{ value: 'all', label: tr('Sab') }, ...d!.brands.map((x) => ({ value: x.id, label: x.name, hint: `${x.count} ${tr(noun)}` }))]}
            onChange={(v) => c.set('brandId', v === 'all' ? undefined : v)} />
        )}
        <MoreFilters groups={moreGroups} />
        <FilterMenu icon={ArrowDownWideNarrow} label={tr('Sort')} value={c.sort} align="right" width="w-64"
          options={[...SORTS, ...(costHidden ? [] : COST_SORTS), ...(config.sorts ?? [])]} onChange={c.setSort} />
        {c.view === 'table' && (
          <FilterMenu<OptionalColumn | 'none'> icon={Columns3} label={tr('Columns')} value="none" align="right" active={extraCols > 0}
            valueLabel={extraCols ? tr('+{{count}}', { count: extraCols }) : tr('Basic')}
            options={colOptions} onChange={(v) => { if (v !== 'none') c.toggleCol(v); }} />
        )}
        {c.view === 'table' && (
          <button type="button" onClick={() => c.setDensity(c.density === 'compact' ? 'comfortable' : 'compact')} aria-pressed={c.density === 'compact'}
            title={c.density === 'compact' ? tr('Khuli rows') : tr('Ghani rows — zyada cheezein ek nazar me')}
            className={cn('inline-flex h-11 items-center gap-1.5 rounded-2xl px-3 text-[0.8125rem] font-semibold ring-1 transition max-sm:hidden', c.density === 'compact' ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
            <Rows3 className="h-4 w-4" />{c.density === 'compact' ? tr('Ghani') : tr('Khuli')}
          </button>
        )}
        <Segmented<'grid' | 'table'> label={tr('Dikhane ka tareeqa')} value={c.view} onChange={c.setView} className="h-11 items-center rounded-2xl p-1 max-sm:hidden [&>button]:h-9 [&>button]:rounded-xl [&>button]:px-2.5"
          items={[
            { value: 'grid', label: <><LayoutGrid className="h-4 w-4" /><span className="sr-only">{tr('Cards (V)')}</span></> },
            { value: 'table', label: <><Table2 className="h-4 w-4" /><span className="sr-only">{tr('Table (V)')}</span></> },
          ]} />
      </FilterBar>
      </>}

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="inline-flex gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200/80">
          {[
            { id: 'products', icon: Boxes, label: tr('Maal'), n: c.count as number | null },
            { id: 'analytics', icon: BarChart3, label: tr('Analytics'), n: null },
            ...(config.extraTab ? [{ id: config.extraTab.id, icon: config.extraTab.icon, label: config.extraTab.label, n: null }] : []),
          ].map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={cn('inline-flex h-9 items-center gap-2 rounded-xl px-4 text-[0.875rem] font-semibold transition', tab === t.id ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100')}>
              <t.icon className="h-4 w-4" />{t.label}
              {t.n !== null && <span className={cn('rounded-full px-1.5 text-[0.6875rem] tabular-nums', tab === t.id ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>{t.n}</span>}
            </button>
          ))}
        </div>
        {tab === 'products' && c.items.length > 0 && (
          <button type="button" onClick={selectVisible} className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-600 hover:text-slate-900">
            <span className={cn('flex h-5 w-5 items-center justify-center rounded border-2', allVisibleSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300')}><Check className="h-3 w-3" strokeWidth={3} /></span>
            {allVisibleSelected ? tr('Chunna khatam') : tr('Nazar aane wale {{count}} chunein', { count: c.items.length })}
          </button>
        )}
      </div>

      {c.selected.size > 0 && tab === 'products' && (
        <BulkBar ids={[...c.selected]} onDone={() => { c.setSelected(new Set()); void c.refresh(); }} onClear={() => c.setSelected(new Set())}
          onExport={() => void exportCsv([...c.selected])} can={can} />
      )}

      {tab === 'analytics' ? (
        <CatalogAnalytics data={analytics.data} stats={st} loading={analytics.isLoading || c.loading} money={money} cost={cost} costHidden={costHidden} detail={config.paths.detail} />
      ) : ExtraTab && tab === config.extraTab?.id ? (
        <ExtraTab />
      ) : c.loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-[22rem] rounded-2xl" />)}</div>
      ) : c.error && !d ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">{tr('Maal nahi aa saka')}</p>
          <p className="mt-1 text-[0.875rem] text-slate-500">{(c.error as Error).message}</p>
          <div className="mt-4"><Button onClick={() => void c.refresh()}>{tr('Dobara koshish')}</Button></div>
        </div>
      ) : c.items.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg"><Package className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{c.hasFilters ? tr('Is filter mein kuch nahi') : tr('Abhi koi maal nahi')}</h3>
          <p className="mt-1 max-w-md text-[0.875rem] text-slate-500">{c.hasFilters ? tr('Filter badal kar dekhein ya hata dein.') : tr('Pehli cheez daalein — ek ek kar ke, ya Excel se sab ek saath.')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {c.hasFilters ? <Button variant="secondary" onClick={c.clear}>{tr('Filter hatayein')}</Button> : (
              <>
                {can.create && <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate(config.paths.create)}>{tr('Nayi cheez')}</Button>}
                {can.create && config.paths.bulkImport && <Button variant="secondary" leftIcon={<FileUp className="h-4 w-4" />} onClick={() => navigate(config.paths.bulkImport!)}>{tr('Excel se daalein')}</Button>}
                <Button variant="ghost" onClick={() => setGuide(true)}>{tr('Guide')}</Button>
              </>
            )}
          </div>
        </div>
      ) : c.view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {c.items.map((i) => <ProductCard key={i.id} {...cardProps(i)} />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <table className={cn('w-full', ['min-w-[60rem]', 'min-w-[66rem]', 'min-w-[72rem]', 'min-w-[78rem]', 'min-w-[84rem]'][Math.min(extraCols, 4)])}>
            <thead>
              <tr className="whitespace-nowrap border-b border-slate-100 bg-slate-50/70 text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                <th className="w-10 py-2.5 ps-4">
                  <button type="button" onClick={selectVisible} aria-label={tr('Sab chunein')} className={cn('flex h-6 w-6 items-center justify-center rounded-md border-2', allVisibleSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-transparent')}><Check className="h-3.5 w-3.5" strokeWidth={3} /></button>
                </th>
                <th className="min-w-[14rem] py-2.5 pe-3">{tr('Cheez')}</th>
                <th className="px-3 py-2.5">{tr('Category')}</th>
                {!costHidden && <th className="px-3 py-2.5 text-end">{tr('Cost')}</th>}
                <th className="px-3 py-2.5 text-end">{tr('Rate')}</th>
                {shownCols.wholesale && <th className="px-3 py-2.5 text-end">{tr('Wholesale')}</th>}
                {shownCols.credit && <th className="px-3 py-2.5 text-end">{tr('Credit')}</th>}
                {shownCols.supplier && <th className="px-3 py-2.5">{tr('Supplier')}</th>}
                {shownCols.online && <th className="px-3 py-2.5">{tr('Online')}</th>}
                <th className="px-3 py-2.5 text-end">{tr('Stock')}</th>
                <th className="px-3 py-2.5">{tr('{{value}} din', { value: st?.windowDays ?? 30 })}</th>
                {!costHidden && <th className="px-3 py-2.5 text-end">{tr('Qeemat')}</th>}
                {config.columns?.map((col) => <th key={col.id} className={cn('px-3 py-2.5', col.align === 'right' && 'text-end')}>{col.label}</th>)}
                <th className="px-3 py-2.5">{tr('Halat')}</th>
                <th className="py-2.5 pe-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{c.items.map((i) => <ProductRow key={i.id} {...cardProps(i)} />)}</tbody>
          </table>
        </div>
      )}

      {tab === 'products' && c.hasMore && (
        <div ref={sentinel}>
          <button type="button" onClick={() => void c.loadMore()} disabled={c.loadingMore}
            className="w-full rounded-2xl bg-white py-3 text-[0.875rem] font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50 disabled:opacity-60">
            {c.loadingMore ? tr('Aa rahi hain…') : tr('Aur dikhayein ({{count}} / {{count2}})', { count: c.items.length, count2: c.count })}
          </button>
        </div>
      )}
    </PageShell>
  );
}

function ProductsGuide({ extra, onClose }: { extra?: GuideStep[]; onClose: () => void }) {
  const steps: GuideStep[] = [
    { icon: Plus, color: '#2563eb', title: tr('Maal daalein'), text: tr('"Naya" se ek cheez, ya Excel se sab ek saath. Barcode scan karein — nahi mila to wahin se nayi ban jati hai.') },
    { icon: Search, color: '#7c3aed', title: tr('Search'), text: tr('Naam, SKU, barcode ya model likhein. Category, brand aur halat ke filter upar hain — ginti saath likhi hai.') },
    { icon: AlertTriangle, color: '#d97706', title: tr('Kam aur khatam'), text: tr('Upar ki pattiyan dabayein: Kam, Khatam, Nahi bik raha. Peela dabba batata hai kya mangwana hai.') },
    { icon: Package, color: '#16a34a', title: tr('Stock badlein'), text: tr('Card par stock ka number ya "+ Stock" dabayein. Daalein, nikaalein ya ginti — wajah ke saath record banta hai.') },
    { icon: MousePointerClick, color: '#db2777', title: tr('Ek saath kaam'), text: tr('Cards chunein, phir neeche kaali patti se chalu/band, khaas, labels, CSV ya mitana.') },
    { icon: Wallet, color: '#0891b2', title: tr('Analytics'), text: tr('Kitna paisa stock mein laga, kya zyada bikta, kya pada hai, kya jaldi khatam hoga.') },
    ...(extra ?? []),
  ];
  return (
    <Modal open onClose={onClose} size="lg" title={tr('Maal — aasaan tareeqa')} description={tr('{{count}} cheezein, bas itna yaad rakhein', { count: steps.length })}>
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}17`, color: s.color }}>
              <s.icon className="h-5 w-5" />
              <span className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[0.625rem] font-bold text-white">{i + 1}</span>
            </span>
            <div className="min-w-0">
              <p className="text-[0.875rem] font-semibold text-slate-900">{s.title}</p>
              <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-slate-600">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 text-[0.75rem] text-slate-600 ring-1 ring-slate-200">
        <span className="font-semibold text-slate-900">{tr('Jaldi ke liye:')}</span>
        {[['/', tr('dhoondein')], ['B', tr('scan')], ['V', tr('cards/table')], ['A', tr('analytics')], ['N', tr('naya')], ['R', tr('taaza')], ['G', tr('guide')]].map(([k, t]) => (
          <span key={k} className="inline-flex items-center gap-1"><Kbd>{k}</Kbd> {t}</span>
        ))}
      </div>
    </Modal>
  );
}
