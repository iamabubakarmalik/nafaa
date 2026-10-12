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
  Table2, Tag, ToggleRight, Wallet, X, type LucideIcon,
  Wheat,
} from 'lucide-react';
import { Button, FilterMenu, Kbd, Modal, PageHero, Skeleton, heroButton, heroIconButton, heroPrimaryButton, type FilterOption } from '@/design-system/components';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { useAnyPermission, usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { catalogApi, type CatalogFilters, type CatalogItem, type CatalogSort, type CatalogStock } from './api';
import { useCatalog, useCatalogAnalytics } from './useCatalog';
import { fetchAllProducts, productsCsv, productsDoc } from './exportProducts';
import { BulkBar } from './components/BulkBar';
import { CatalogAnalytics } from './components/CatalogAnalytics';
import { ProductCard, ProductRow, qty } from './components/ProductCard';
import { StockModal } from './components/StockModal';
import type { GuideStep, ProductsPageConfig } from './types';

const SORTS: Array<FilterOption<CatalogSort>> = [
  { value: 'name', label: 'Naam (A–Z)' },
  { value: 'new', label: 'Naye pehle' },
  { value: 'old', label: 'Purane pehle' },
  { value: 'bestSelling', label: 'Zyada bikne wale', hint: 'Pichhle 30 din' },
  { value: 'slow', label: 'Kam bikne wale', hint: 'Pada hua maal pehle' },
  { value: 'stockLow', label: 'Kam stock pehle' },
  { value: 'stockHigh', label: 'Zyada stock pehle' },
  { value: 'priceHigh', label: 'Mehngay pehle' },
  { value: 'priceLow', label: 'Sastay pehle' },
];
const COST_SORTS: Array<FilterOption<CatalogSort>> = [
  { value: 'value', label: 'Stock ki qeemat', hint: 'Sab se zyada paisa laga' },
  { value: 'margin', label: 'Zyada munafa wale' },
];
const STATUS: Array<FilterOption<CatalogFilters['active']>> = [
  { value: 'active', label: 'Chalu', hint: 'POS par bikti hain' },
  { value: 'inactive', label: 'Band', hint: 'Chhupi hui' },
  { value: 'all', label: 'Sab' },
];
const KIND_DEFAULT: Record<string, string> = { made: 'Khud banaya', bought: 'Khareed kar' };


function FilterChip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-full bg-brand-50 pl-2.5 pr-1 text-[0.75rem] font-semibold text-brand-800 ring-1 ring-brand-100">
      {children}
      <button type="button" onClick={onRemove} aria-label="Hatayein" className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-brand-100"><X className="h-3 w-3" /></button>
    </span>
  );
}

export function ProductsPage({ config }: { config: ProductsPageConfig }) {
  const [params] = useSearchParams();
  const c = useCatalog({
    categoryId: params.get('categoryId') ?? undefined,
    brandId: params.get('brandId') ?? undefined,
    tagId: params.get('tagId') ?? undefined,
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
  const [tab, setTab] = useState<string>('products');
  const [stockItem, setStockItem] = useState<CatalogItem | null>(null);
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
      if (!rows.length) { toast.error('Koi cheez nahi'); return; }
      productsCsv(rows, [`Maal ki list — ${tenantName ?? ''}${shopName ? ` · ${shopName}` : ''}`,
        `Cheezein: ${rows.length} · Kam: ${stats?.low ?? 0} · Khatam: ${stats?.out ?? 0}`], !costHidden);
      toast.success(`${rows.length} cheezein CSV mein`);
    } catch { toast.error('Export nahi hua'); } finally { setExporting(false); }
  };
  const printDoc = async () => {
    const { items, stats } = await fetchAllProducts(c.filters, 3000);
    return productsDoc(items, stats, `${config.label} — maal ki list`, money, !costHidden);
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
        toast.success(hit.name, can.stock ? { action: { label: '+ Stock', onClick: () => setStockItem(hit) } } : undefined);
        return;
      }
      if (await config.onScanMiss?.(term, navigate)) return;
      toast.error(`"${term}" kisi cheez par nahi mila`, can.create ? { action: { label: 'Nayi banayein', onClick: () => navigate(`${config.paths.create}?barcode=${encodeURIComponent(term)}`) } } : undefined);
    } catch { toast.error('Dhoonda nahi ja saka'); }
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
    { id: 'all', label: 'Sab', icon: Boxes },
    { id: 'in', label: 'Stock mein', icon: Package },
    { id: 'low', label: 'Kam', icon: AlertTriangle, tone: 'text-amber-600' },
    { id: 'out', label: 'Khatam', icon: X, tone: 'text-rose-600' },
    { id: 'dead', label: 'Nahi bik raha', icon: Snowflake, tone: 'text-slate-500' },
    ...((d?.tabs.expiring ?? 0) > 0 ? [{ id: 'expiring' as const, label: 'Expiry qareeb', icon: CalendarClock, tone: 'text-amber-600' }] : []),
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

  const cardProps = (i: CatalogItem) => ({
    item: i, config, extras: extrasFor(i), tagNames: d?.tagNames ?? {}, money, cost, costHidden, days: st?.windowDays ?? 30,
    selected: c.selected.has(i.id), selecting: c.selected.size > 0, onToggle: () => c.toggle(i.id),
    onStock: () => setStockItem(i), onDeleted: () => void c.refresh(), can,
  });

  const filterChips: Array<[string, () => void]> = [];
  if (c.f.categoryId) filterChips.push([d?.categories.find((x) => x.id === c.f.categoryId)?.name ?? 'Category', () => c.set('categoryId', undefined)]);
  if (c.f.brandId) filterChips.push([d?.brands.find((x) => x.id === c.f.brandId)?.name ?? 'Brand', () => c.set('brandId', undefined)]);
  if (c.f.tagId) filterChips.push([`#${d?.tagNames[c.f.tagId]?.name ?? 'Tag'}`, () => c.set('tagId', undefined)]);
  if (c.f.kind) filterChips.push([labelOf('kind', c.f.kind), () => c.set('kind', undefined)]);
  if (c.f.condition) filterChips.push([labelOf('condition', c.f.condition), () => c.set('condition', undefined)]);
  if (c.f.etype) filterChips.push([labelOf('etype', c.f.etype), () => c.set('etype', undefined)]);
  if (c.f.serial) filterChips.push([c.f.serial === 'mismatch' ? 'Serial ginti ghalat' : 'Serial wale', () => c.set('serial', undefined)]);
  if (c.f.featured) filterChips.push(['Sirf khaas', () => c.set('featured', undefined)]);
  if (c.f.kindOf) filterChips.push([c.f.kindOf === 'raw' ? 'Raw material' : 'Bechne wale', () => c.set('kindOf', undefined)]);
  if (c.f.active !== 'active') filterChips.push([c.f.active === 'inactive' ? 'Band wale' : 'Chalu + band', () => c.set('active', 'active')]);
  if (c.search.trim()) filterChips.push([`"${c.search.trim()}"`, () => c.setSearch('')]);

  const ExtraTab = config.extraTab?.Component;
  const Banners = config.Banners;
  const HeroExtra = config.HeroExtra;

  return (
    <div className="mx-auto w-full max-w-[var(--page-max,96rem)] space-y-4 pb-12">
      {scanner && <BarcodeScanner onDetected={(code: string) => void onScan(code)} onClose={() => setScanner(false)} />}
      {stockItem && <StockModal item={stockItem} chips={config.stockChips?.(stockItem)} money={money} onClose={() => setStockItem(null)} onSaved={() => void c.refresh()} />}
      {guide && <ProductsGuide extra={config.guide} onClose={() => setGuide(false)} />}

      <PageHero
        title="Maal"
        chip={<><Package />{st ? `${st.products} ${noun}` : '…'}</>}
        busy={c.fetching && !c.loading}
        meta={`${config.label} · ${shopName ?? tenantName ?? ''}`}
        loading={c.loading || !st}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={() => setScanner(true)} title="Barcode scan (B)" className={heroButton}><ScanLine className="h-4 w-4" /><span className="hidden sm:inline">Scan</span></button>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting} className={heroButton}><Download className="h-4 w-4" />{exporting ? 'Ban raha…' : 'CSV'}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
          {HeroExtra && <HeroExtra />}
          {can.create && config.paths.bulkImport && <Link to={config.paths.bulkImport} title="Excel se daalein" className={heroIconButton}><FileUp className="h-4 w-4" /></Link>}
          <button type="button" onClick={() => void c.refresh()} title="Taaza karein (R)" className={heroIconButton}><RefreshCw className={cn('h-4 w-4', c.fetching && 'animate-spin')} /></button>
          <button type="button" onClick={() => setGuide(true)} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.create && <Link to={config.paths.create} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya</Link>}
        </>}
        stats={[
          { label: 'Stock ki cost', value: st ? cost(st.costValue) : '', hint: st ? `${qty(st.units)} units` : '' },
          { label: 'Bechne par milega', value: st ? money(st.saleValue) : '', hint: costHidden || !st ? undefined : `munafa ${cost(st.saleValue - st.costValue)}` },
          { label: `${st?.windowDays ?? 30} din ki bikri`, value: st ? money(st.revenue30) : '', hint: st ? `${qty(st.sold30)} units biki` : '' },
          { label: 'Pada hua maal', value: st ? cost(st.deadValue) : '', hint: st ? `${st.dead} nahi bik rahi` : '' },
        ]}
      />

      {c.offline && (
        <p className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-[0.8125rem] font-medium text-sky-800 ring-1 ring-sky-100">
          <CloudOff className="h-4 w-4" /> Internet nahi — computer par save maal dikh raha hai. Bikri aur expiry ka hisaab internet aane par.
        </p>
      )}

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
          <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-amber-900"><AlertTriangle className="h-4 w-4 text-amber-600" />{st?.low} cheezein kam hain:</span>
          {d.alerts.low.slice(0, 6).map((a) => (
            <button key={a.id} type="button" disabled={!can.stock}
              onClick={() => { const it = c.items.find((i) => i.id === a.id); if (it) setStockItem(it); else c.setSearch(a.name); }}
              className="rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-medium text-amber-900 ring-1 ring-amber-200 enabled:hover:bg-amber-100">
              {a.name} · <span className="font-bold tabular-nums">{qty(a.stock)}</span>
            </button>
          ))}
          <button type="button" onClick={() => c.setStock('low')} className="ml-auto text-[0.75rem] font-semibold text-amber-800 hover:underline">Sab dekhein →</button>
        </div>
      )}
      {d && Banners && <Banners data={d} setFilter={(k, v) => c.set(k as never, v as never)} />}

      {/* Toolbar */}
      <div className="relative z-10 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:p-4">
        <div className="flex flex-col gap-2 xl:flex-row">
          <label className="group relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600" />
            <input ref={searchRef} value={c.search} onChange={(e) => c.setSearch(e.target.value)} placeholder="Naam, SKU, barcode ya model…" aria-label="Maal dhoondein"
              className="h-11 w-full rounded-2xl border-0 bg-slate-100/80 pl-12 pr-16 text-[0.9375rem] outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-2 focus:ring-brand-500" />
            {c.search
              ? <button type="button" onClick={() => c.setSearch('')} aria-label="Saaf" className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button>
              : <Kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>}
          </label>
          <div className="flex flex-wrap gap-2">
            {(d?.categories.length ?? 0) > 0 && (
              <FilterMenu icon={Layers} label="Category" value={c.f.categoryId ?? 'all'} active={!!c.f.categoryId} width="w-72"
                options={[{ value: 'all', label: 'Sab category' }, ...d!.categories.map((x) => ({ value: x.id, label: x.name, hint: `${x.count} ${noun}`, color: x.color }))]}
                onChange={(v) => c.set('categoryId', v === 'all' ? undefined : v)} />
            )}
            {(d?.brands.length ?? 0) > 0 && (
              <FilterMenu icon={Sparkles} label="Brand" value={c.f.brandId ?? 'all'} active={!!c.f.brandId}
                options={[{ value: 'all', label: 'Sab brand' }, ...d!.brands.map((x) => ({ value: x.id, label: x.name, hint: `${x.count}` }))]}
                onChange={(v) => c.set('brandId', v === 'all' ? undefined : v)} />
            )}
            {config.filters?.map((key) => {
              if (key === 'tags' && d?.tags.length) {
                return <FilterMenu key={key} icon={Tag} label="Tag" value={c.f.tagId ?? 'all'} active={!!c.f.tagId}
                  options={[{ value: 'all', label: 'Sab tags' }, ...d.tags.map((t) => ({ value: t.id, label: `#${t.name}`, hint: `${t.count}`, color: t.color })), { value: 'none', label: 'Baghair tag' }]}
                  onChange={(v) => c.set('tagId', v === 'all' ? undefined : v)} />;
              }
              const facet = key === 'kind' ? d?.facets.kinds : key === 'condition' ? d?.facets.conditions : key === 'etype' ? d?.facets.etypes : null;
              if (facet && facet.length > 0 && key !== 'tags' && key !== 'serial') {
                const label = key === 'kind' ? 'Qisam' : key === 'condition' ? 'Halat' : 'Type';
                return <FilterMenu key={key} icon={Filter} label={label} value={c.f[key] ?? 'all'} active={!!c.f[key]} width="w-64"
                  options={[{ value: 'all', label: `Sab` }, ...facet.map((x) => ({ value: x.id, label: labelOf(key, x.id), hint: `${x.count} ${noun}` }))]}
                  onChange={(v) => c.set(key, v === 'all' ? undefined : v)} />;
              }
              if (key === 'serial' && (d?.facets.serial.tracked ?? 0) > 0) {
                return <FilterMenu key={key} icon={ListChecks} label="Serial" value={c.f.serial ?? 'all'} active={!!c.f.serial}
                  options={[{ value: 'all', label: 'Sab' }, { value: 'tracked', label: 'Serial wale', hint: `${d!.facets.serial.tracked}` }, { value: 'mismatch', label: 'Ginti ghalat', hint: `${d!.facets.serial.mismatch} — stock aur serial barabar nahi` }]}
                  onChange={(v) => c.set('serial', v === 'all' ? undefined : (v as 'tracked' | 'mismatch'))} />;
              }
              return null;
            })}
            <FilterMenu icon={Wheat} label="Qism" value={c.f.kindOf ?? 'all'} active={!!c.f.kindOf}
              options={[{ value: 'all', label: 'Sab' }, { value: 'sale', label: 'Bechne wale' }, { value: 'raw', label: 'Raw material (kacha maal)' }]}
              onChange={(v) => c.set('kindOf', v === 'all' ? undefined : (v as 'raw' | 'sale'))} />
            <FilterMenu icon={ToggleRight} label="Halat" value={c.f.active} active={c.f.active !== 'active'} options={STATUS} onChange={(v) => c.set('active', v)} />
            <FilterMenu icon={ArrowDownWideNarrow} label="Tarteeb" value={c.sort} align="right" width="w-64"
              options={[...SORTS, ...(costHidden ? [] : COST_SORTS), ...(config.sorts ?? [])]} onChange={c.setSort} />
            <button type="button" onClick={() => c.set('featured', c.f.featured ? undefined : true)} title="Sirf khaas"
              className={cn('flex h-11 w-11 items-center justify-center rounded-2xl transition', c.f.featured ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' : 'bg-slate-100/80 text-slate-500 hover:bg-slate-200/70')}>
              <Star className={cn('h-4 w-4', c.f.featured && 'fill-current')} />
            </button>
            <div className="inline-flex rounded-2xl bg-slate-100/80 p-1" role="radiogroup" aria-label="Dikhane ka tareeqa">
              {([['grid', LayoutGrid, 'Cards'], ['table', Table2, 'Table']] as const).map(([v, Icon, label]) => (
                <button key={v} type="button" role="radio" aria-checked={c.view === v} onClick={() => c.setView(v)} title={`${label} (V)`}
                  className={cn('flex h-9 w-9 items-center justify-center rounded-xl transition', c.view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
        {filterChips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
            <span className="mr-1 text-[0.75rem] font-medium text-slate-500">Lage filter:</span>
            {filterChips.map(([label, remove]) => <FilterChip key={label} onRemove={remove}>{label}</FilterChip>)}
            <button type="button" onClick={c.clear} className="ml-auto inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[0.75rem] font-semibold text-rose-700 hover:bg-rose-50"><X className="h-3.5 w-3.5" />Sab hatayein</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="inline-flex gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200/80">
          {[
            { id: 'products', icon: Boxes, label: 'Maal', n: c.count as number | null },
            { id: 'analytics', icon: BarChart3, label: 'Analytics', n: null },
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
            {allVisibleSelected ? 'Chunna khatam' : `Nazar aane wale ${c.items.length} chunein`}
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
          <p className="font-semibold text-slate-900">Maal nahi aa saka</p>
          <p className="mt-1 text-[0.875rem] text-slate-500">{(c.error as Error).message}</p>
          <div className="mt-4"><Button onClick={() => void c.refresh()}>Dobara koshish</Button></div>
        </div>
      ) : c.items.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg"><Package className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{c.hasFilters ? 'Is filter mein kuch nahi' : 'Abhi koi maal nahi'}</h3>
          <p className="mt-1 max-w-md text-[0.875rem] text-slate-500">{c.hasFilters ? 'Filter badal kar dekhein ya hata dein.' : 'Pehli cheez daalein — ek ek kar ke, ya Excel se sab ek saath.'}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {c.hasFilters ? <Button variant="secondary" onClick={c.clear}>Filter hatayein</Button> : (
              <>
                {can.create && <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate(config.paths.create)}>Nayi cheez</Button>}
                {can.create && config.paths.bulkImport && <Button variant="secondary" leftIcon={<FileUp className="h-4 w-4" />} onClick={() => navigate(config.paths.bulkImport!)}>Excel se daalein</Button>}
                <Button variant="ghost" onClick={() => setGuide(true)}>Guide</Button>
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
          <table className="w-full min-w-[60rem]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                <th className="w-10 py-2.5 pl-4">
                  <button type="button" onClick={selectVisible} aria-label="Sab chunein" className={cn('flex h-6 w-6 items-center justify-center rounded-md border-2', allVisibleSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-transparent')}><Check className="h-3.5 w-3.5" strokeWidth={3} /></button>
                </th>
                <th className="py-2.5 pr-3">Cheez</th>
                <th className="px-3 py-2.5">Category</th>
                {!costHidden && <th className="px-3 py-2.5 text-right">Cost</th>}
                <th className="px-3 py-2.5 text-right">Rate</th>
                <th className="px-3 py-2.5 text-right">Stock</th>
                <th className="px-3 py-2.5">{st?.windowDays ?? 30} din</th>
                {!costHidden && <th className="px-3 py-2.5 text-right">Qeemat</th>}
                {config.columns?.map((col) => <th key={col.id} className={cn('px-3 py-2.5', col.align === 'right' && 'text-right')}>{col.label}</th>)}
                <th className="px-3 py-2.5">Halat</th>
                <th className="py-2.5 pr-3" />
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
            {c.loadingMore ? 'Aa rahi hain…' : `Aur dikhayein (${c.items.length} / ${c.count})`}
          </button>
        </div>
      )}
    </div>
  );
}

function ProductsGuide({ extra, onClose }: { extra?: GuideStep[]; onClose: () => void }) {
  const steps: GuideStep[] = [
    { icon: Plus, color: '#2563eb', title: 'Maal daalein', text: '"Naya" se ek cheez, ya Excel se sab ek saath. Barcode scan karein — nahi mila to wahin se nayi ban jati hai.' },
    { icon: Search, color: '#7c3aed', title: 'Dhoondein', text: 'Naam, SKU, barcode ya model likhein. Category, brand aur halat ke filter upar hain — ginti saath likhi hai.' },
    { icon: AlertTriangle, color: '#d97706', title: 'Kam aur khatam', text: 'Upar ki pattiyan dabayein: Kam, Khatam, Nahi bik raha. Peela dabba batata hai kya mangwana hai.' },
    { icon: Package, color: '#16a34a', title: 'Stock badlein', text: 'Card par stock ka number ya "+ Stock" dabayein. Daalein, nikaalein ya ginti — wajah ke saath record banta hai.' },
    { icon: MousePointerClick, color: '#db2777', title: 'Ek saath kaam', text: 'Cards chunein, phir neeche kaali patti se chalu/band, khaas, labels, CSV ya mitana.' },
    { icon: Wallet, color: '#0891b2', title: 'Analytics', text: 'Kitna paisa stock mein laga, kya zyada bikta, kya pada hai, kya jaldi khatam hoga.' },
    ...(extra ?? []),
  ];
  return (
    <Modal open onClose={onClose} size="lg" title="Maal — aasaan tareeqa" description={`${steps.length} cheezein, bas itna yaad rakhein`}>
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}17`, color: s.color }}>
              <s.icon className="h-5 w-5" />
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[0.625rem] font-bold text-white">{i + 1}</span>
            </span>
            <div className="min-w-0">
              <p className="text-[0.875rem] font-semibold text-slate-900">{s.title}</p>
              <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-slate-600">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 text-[0.75rem] text-slate-600 ring-1 ring-slate-200">
        <span className="font-semibold text-slate-900">Jaldi ke liye:</span>
        {[['/', 'dhoondein'], ['B', 'scan'], ['V', 'cards/table'], ['A', 'analytics'], ['N', 'naya'], ['R', 'taaza'], ['G', 'guide']].map(([k, t]) => (
          <span key={k} className="inline-flex items-center gap-1"><Kbd>{k}</Kbd> {t}</span>
        ))}
      </div>
    </Modal>
  );
}
