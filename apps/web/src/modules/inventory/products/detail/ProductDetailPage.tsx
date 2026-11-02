/**
 * Shared product detail page. Every industry uses it through a config that
 * adds badges, facts, alerts, a KPI and its own tabs. The page shows the
 * product, KPIs for the active branch (stock, sold, profit, stock value),
 * and tabs: Overview · Stock · Sales · Purchases · Batches · Packing/Variants.
 *
 * Keys: E edit · S stock · L label · G guide · 1–9 tabs.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, Boxes, CalendarClock, Coins, Eye, EyeOff, Factory, GraduationCap, Hourglass, Layers, LineChart, Package,
  Pencil, Plus, Receipt, ShoppingBag, Star, Tag, TrendingUp, Truck, Wallet,
} from 'lucide-react';
import { Badge, Button, Kbd, KpiCard, KpiRow, Modal, PageShell, Skeleton, ViewTabs } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PrintButton, type PrintDoc } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { PageGuide, usePageGuide, type GuideStep } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useShopParam } from '@core/stores/auth.store';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { productUnitsApi, type ProductUnit } from '@modules/inventory/products/api/product-units.api';
import { ProductThumb } from '@modules/inventory/products/lib/productEmoji';
import { ProductRecipePanel } from '@modules/manufacturing/components/ProductRecipePanel';
import { useManufacturingEnabled } from '@modules/manufacturing/hooks';
import { StockModal } from '../list/components/StockModal';
import { CATALOG_KEY } from '../list/useCatalog';
import { productInsightsApi, type ProductInsights } from './api';
import { BatchesTab, MOVE, OverviewTab, PurchasesTab, SalesTab, StockTab, UnitsTab, fmt, when } from './tabs';
import { t as tr } from '@core/i18n';

export interface DetailContext<X> {
  product: Product;
  units: ProductUnit[];
  insights?: ProductInsights;
  extra?: X;
  stock: number;
  money: (n: number) => string;
  cost: (n: number) => string;
  costHidden: boolean;
  refresh: () => void;
}

export interface DetailConfig<X> {
  label: string;
  paths: { list: string; edit: (id: string) => string };
  /** Industry data for this product (profile, serials…). */
  extra?: { key: string; load: (id: string) => Promise<X> };
  /** Badges next to the name. */
  badges?: (ctx: DetailContext<X>) => ReactNode;
  /** Extra facts in the overview's details card, as label/value pairs. */
  facts?: (ctx: DetailContext<X>) => Array<[string, ReactNode]>;
  /** Replaces the last KPI card (e.g. serials on shelf, freshness). */
  tile?: (ctx: DetailContext<X>) => { label: string; value: ReactNode; hint?: ReactNode } | null;
  alerts?: (ctx: DetailContext<X>) => ReactNode;
  tabs?: Array<{ id: string; label: string; icon: typeof Package; when?: (ctx: DetailContext<X>) => boolean; render: (ctx: DetailContext<X>) => ReactNode }>;
  /** Quick quantities in the stock dialog. */
  stockChips?: number[];
  /** Industry lines added to the page guide. */
  guide?: GuideStep[];
}

const GUIDE: GuideStep[] = [
  { icon: TrendingUp, color: '#2563eb', title: tr('Upar ke numbers'), text: tr('Stock is branch ka hai. Sale, profit aur stock ki value chart ke period (7, 30, 90 din) ke hisaab se badalte hain.') },
  { icon: Plus, color: '#16a34a', title: tr('Stock badlein'), text: tr('"Stock" button (S) se stock daalein ya nikalein. Har badlao Adjustment ban kar record mein rehta hai — product edit karne se stock nahi badalta.') },
  { icon: Truck, color: '#0891b2', title: tr('Purchase'), text: tr('Purchase tab mein har bill, supplier aur aakhri cost. Cost badal gayi ho to product ki cost bhi theek kar lein.') },
  { icon: EyeOff, color: '#64748b', title: tr('Band karein'), text: tr('Jo cheez ab nahi bechni use band kar dein — POS par nahi dikhegi, magar bill aur history waisi hi rahegi.') },
];

export function ProductDetailPage<X>({ config }: { config: DetailConfig<X> }) {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopId = useShopParam();
  const guide = usePageGuide();
  const { sales: money, cost, costHidden } = useMasked();
  const can = {
    edit: usePermission(PERMISSIONS.PRODUCTS_EDIT),
    stock: usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE),
    purchases: usePermission(PERMISSIONS.PURCHASES_VIEW),
    buy: usePermission(PERMISSIONS.PURCHASES_CREATE),
    suppliers: usePermission(PERMISSIONS.SUPPLIERS_VIEW),
    recipe: usePermission(PERMISSIONS.MANUFACTURING_VIEW),
  };
  const manufacturing = useManufacturingEnabled();
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('overview');
  const [stockOpen, setStockOpen] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [busy, setBusy] = useState(false);

  const product = useQuery({ queryKey: ['product', id], queryFn: () => productsApi.getOne(id), enabled: !!id });
  const units = useQuery({ queryKey: ['product-units', id], queryFn: () => productUnitsApi.byProduct(id).catch(() => []), enabled: !!id });
  const insights = useQuery({ queryKey: ['product-insights', id, days, shopId], queryFn: () => productInsightsApi.get(id, days), enabled: !!id, placeholderData: (p) => p });
  const extra = useQuery({ queryKey: [config.extra?.key ?? 'none', id], queryFn: () => config.extra!.load(id), enabled: !!id && !!config.extra });

  const refresh = () => ['product', 'product-insights', 'product-units', 'product-purchases', CATALOG_KEY, 'products', config.extra?.key ?? '']
    .filter(Boolean).forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const p = product.data;
  const branch = insights.data?.shops.find((s) => s.shopId === shopId);
  const stock = branch ? branch.stock : Number(p?.shopStock ?? p?.stock ?? 0);
  const ctx: DetailContext<X> | null = p ? { product: p, units: units.data ?? [], insights: insights.data, extra: extra.data, stock, money, cost, costHidden, refresh } : null;

  const tabs = useMemo(() => {
    if (!ctx) return [];
    const list: Array<{ id: string; label: string; icon: typeof Package; count?: number; render?: () => ReactNode }> = [
      { id: 'overview', label: tr('Overview'), icon: LineChart },
      { id: 'stock', label: tr('Stock'), icon: Hourglass },
      { id: 'sales', label: tr('Sale'), icon: Receipt },
    ];
    if (can.purchases) list.push({ id: 'purchases', label: tr('Purchase'), icon: Truck });
    const batches = ctx.product.batches?.length ?? 0;
    if (batches || ctx.product.expiryTracked) list.push({ id: 'batches', label: tr('Batches'), icon: CalendarClock, count: batches || undefined });
    const nUnits = ctx.units.length;
    const nVariants = ctx.product.variants?.length ?? 0;
    if (nUnits || nVariants) {
      list.push({ id: 'units', label: nUnits && nVariants ? tr('Packing / Variants') : nUnits ? tr('Packing') : tr('Variants'), icon: nVariants ? Layers : Boxes, count: nUnits + nVariants });
    }
    if (manufacturing && can.recipe && !ctx.product.hasVariants) list.push({ id: 'recipe', label: tr('Recipe'), icon: Factory });
    for (const t of config.tabs ?? []) if (!t.when || t.when(ctx)) list.push({ id: t.id, label: t.label, icon: t.icon, render: () => t.render(ctx) });
    return list;
  }, [ctx, config.tabs, can.purchases, can.recipe, manufacturing]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (k === 'e' && can.edit) navigate(config.paths.edit(id));
      else if (k === 's' && can.stock) setStockOpen(true);
      else if (k === 'l') navigate('/retail/barcode-labels', { state: { productIds: [id] } });
      else if (/^[1-9]$/.test(e.key) && tabs[Number(e.key) - 1]) setTab(tabs[Number(e.key) - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [can.edit, can.stock, config.paths, id, navigate, tabs]);

  if (product.isLoading) {
    return <PageShell><Skeleton className="h-40 rounded-3xl" /><div className="grid grid-cols-2 gap-3 xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></PageShell>;
  }
  if (!p || !ctx) {
    return (
      <PageShell>
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center ring-1 ring-slate-200">
          <p className="font-semibold text-slate-900">{tr('Product nahi mila')}</p>
          <Link to={config.paths.list} className="mt-3 inline-block text-[0.875rem] font-semibold text-brand-700 hover:underline">{tr('Products ki list →')}</Link>
        </div>
      </PageShell>
    );
  }

  const images = [...(p.images ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);
  const ins = insights.data;
  const shops = ins?.shops ?? [];
  const allStock = shops.reduce((s, x) => s + x.stock, 0);
  const low = stock > 0 && stock <= p.lowStockAlert;
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const expiryOf = (b: unknown) => (b as { expiryDate?: string }).expiryDate?.slice(0, 10);
  const expiring = (p.batches ?? []).filter((b) => b.isActive && b.quantity > 0 && expiryOf(b) && expiryOf(b)! <= soon);
  const tags = (p.tags ?? []).map((t) => t.tag).filter(Boolean);
  const margin = ins && ins.totals.revenue > 0 ? (ins.totals.profit / ins.totals.revenue) * 100 : null;
  const tile = config.tile?.(ctx);

  const setFlag = async (patch: { isActive?: boolean; isFeatured?: boolean }, done: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await productsApi.update(id, patch);
      toast.success(done);
      refresh();
      void forceRefreshProducts().catch(() => undefined);
    } catch (e) { toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || (e as Error).message || tr('Nahi hua')); }
    finally { setBusy(false); setConfirmOff(false); }
  };

  const printDoc = (): PrintDoc => ({
    title: p.name,
    subtitle: [p.sku, p.barcode].filter(Boolean).join(' · ') || undefined,
    meta: [[tr('Category'), p.category?.name ?? '—'], [tr('Unit'), p.unit]],
    sections: [
      { kind: 'rows', title: tr('Qeemat aur stock'), rows: [
        { label: tr('Retail price'), value: formatPKR(p.price) },
        ...(p.wholesalePrice ? [{ label: tr('Wholesale price'), value: formatPKR(p.wholesalePrice) }] : []),
        ...(p.creditPrice ? [{ label: tr('Credit (udhaar) price'), value: formatPKR(p.creditPrice) }] : []),
        ...(costHidden ? [] : [{ label: tr('Cost price'), value: formatPKR(p.costPrice) }]),
        { label: tr('Stock'), value: `${fmt(stock)} ${p.unit}`, strong: true },
        ...(ins ? [{ label: tr('{{window}} din ki sale', { window: ins.window }), value: `${fmt(ins.totals.qty)} ${p.unit} · ${formatPKR(ins.totals.revenue)}` }] : []),
      ] },
      ...(ctx.units.length ? [{ kind: 'table' as const, title: tr('Packing'), columns: [{ label: tr('Packing') }, { label: tr('Kitne {{unit}}', { unit: p.unit }), align: 'right' as const }, { label: tr('Rate'), align: 'right' as const }], rows: ctx.units.map((u) => [u.unitName, fmt(u.conversionRate), formatPKR(u.price)]) }] : []),
      ...(ins?.movements.length ? [{ kind: 'table' as const, title: tr('Stock ki movements'), columns: [{ label: tr('Waqt') }, { label: tr('Kya hua') }, { label: tr('Quantity'), align: 'right' as const }, { label: tr('Baad mein'), align: 'right' as const }], rows: ins.movements.slice(0, 25).map((m) => [when(m.createdAt), MOVE[m.type]?.label ?? m.type, fmt(m.quantity), fmt(m.balanceAfter)]) }] : []),
    ],
  });

  const active = tabs.find((t) => t.id === tab) ?? tabs[0];
  const btn = 'inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50';
  const iconBtn = 'flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50';

  return (
    <PageShell>
      {stockOpen && <StockModal item={{ id: p.id, name: p.name, unit: p.unit, stock, price: p.price }} chips={config.stockChips} money={money} onClose={() => setStockOpen(false)} onSaved={refresh} />}
      {confirmOff && (
        <Modal open onClose={() => setConfirmOff(false)} size="sm" title={tr('"{{name}}" band karein?', { name: p.name })}
          description={tr('POS, online store aur naye bill mein nahi dikhegi. Purane bill, stock aur history waise hi rahenge. Baad mein dobara chalu kar sakte hain.')}
          footer={<>
            <Button variant="secondary" onClick={() => setConfirmOff(false)}>{tr('Rehne dein')}</Button>
            <Button variant="danger" loading={busy} onClick={() => void setFlag({ isActive: false }, tr('Band kar di'))}>{tr('Band karein')}</Button>
          </>}>
          {stock > 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">{tr('Abhi {{stock}} {{unit}} stock pada hai — band karne se stock nahi hatega.', { stock: fmt(stock), unit: p.unit })}</p>}
        </Modal>
      )}
      {guide.isOpen && (
        <PageGuide title={tr('Product ka safha')} onClose={guide.close} steps={[...GUIDE, ...(config.guide ?? [])]}
          tips={[tr('Har branch ka stock alag hai — branch badlein to numbers us branch ke hon ge.'), tr('Cost chhupani ho to aankh wala button dabayein; profit aur cost chhup jayenge.')]}
          shortcuts={[['E', tr('badlein')], ['S', tr('stock')], ['L', tr('label')], ['1–9', tr('tabs')], ['G', tr('guide')]]} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={config.paths.list} className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4 rtl-flip" />{tr('Products ki list')}</Link>
        <p className="hidden items-center gap-1.5 text-[0.75rem] text-slate-500 md:inline-flex"><Kbd>E</Kbd> {' '}{tr('badlein ·')}{' '} <Kbd>S</Kbd> {' '}{tr('stock ·')}{' '} <Kbd>G</Kbd> {' '}{tr('guide')}</p>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:flex-row sm:items-start sm:p-5">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:h-28 sm:w-28">
          <ProductThumb name={p.name} category={p.category?.name} url={images[0]?.url} size="full" />
          {images.length > 1 && <span className="absolute bottom-1 end-1 rounded-md bg-black/60 px-1.5 text-[0.625rem] font-bold text-white">+{images.length - 1}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {!p.isActive && <Badge variant="default">{tr('Band hai')}</Badge>}
            {p.category && <span className="rounded-md px-2 py-0.5 text-[0.75rem] font-semibold" style={{ backgroundColor: `${p.category.color}18`, color: p.category.color }}>{p.category.name}</span>}
            {p.isFeatured && <Badge variant="accent"><Star className="h-3 w-3 fill-current" />{tr('Khaas')}</Badge>}
            {config.badges?.(ctx)}
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{p.name}</h1>
          <p className="mt-0.5 text-[0.9375rem] text-slate-700"><strong className="tabular-nums">{money(p.price)}</strong> <span className="text-slate-500">/ {p.unit}</span>{p.wholesalePrice ? <span className="ms-2 text-[0.8125rem] text-slate-500">{tr('Wholesale {{wholesalePrice}}', { wholesalePrice: money(p.wholesalePrice) })}</span> : null}{p.creditPrice ? <span className="ms-2 text-[0.8125rem] text-slate-500">{tr('Credit {{creditPrice}}', { creditPrice: money(p.creditPrice) })}</span> : null}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[0.75rem]">
            {p.sku && <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-700">{tr('SKU {{sku}}', { sku: p.sku })}</span>}
            {p.barcode && <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-700">{p.barcode}</span>}
            {p.brand && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">{p.brand.name}</span>}
            {tags.map((t) => <span key={t.id} className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">#{t.name}</span>)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:max-w-[26rem] sm:justify-end">
          <PrivacyToggle compact />
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} aria-label={tr('Guide')} className={iconBtn}><GraduationCap className="h-4 w-4" /></button>
          <PrintButton doc={printDoc} label={tr('Print')} size="sm" />
          <Link to="/retail/barcode-labels" state={{ productIds: [p.id] }} title={tr('Label (L)')} className={btn}><Tag className="h-4 w-4" />{tr('Label')}</Link>
          {can.edit && (
            <>
              <button type="button" disabled={busy} onClick={() => void setFlag({ isFeatured: !p.isFeatured }, p.isFeatured ? tr('Aam kar di') : tr('Khaas bana di'))} title={p.isFeatured ? tr('Aam karein') : tr('Khaas banayein')} aria-label={tr('Khaas')}
                className={cn(iconBtn, p.isFeatured && 'bg-amber-50 text-amber-600')}><Star className={cn('h-4 w-4', p.isFeatured && 'fill-current')} /></button>
              {p.isActive
                ? <button type="button" onClick={() => setConfirmOff(true)} className={btn}><EyeOff className="h-4 w-4" />{tr('Band karein')}</button>
                : <button type="button" disabled={busy} onClick={() => void setFlag({ isActive: true }, tr('Chalu kar di'))} className={btn}><Eye className="h-4 w-4" />{tr('Chalu karein')}</button>}
            </>
          )}
          {can.stock && <button type="button" onClick={() => setStockOpen(true)} title={tr('Stock (S)')} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-50 px-3 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-100"><Plus className="h-4 w-4" />{tr('Stock')}</button>}
          {can.edit && <Link to={config.paths.edit(p.id)} title={tr('Badlein (E)')} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-brand-fg shadow-sm hover:bg-brand-700"><Pencil className="h-4 w-4" />{tr('Badlein')}</Link>}
        </div>
      </div>

      {/* KPIs */}
      <KpiRow>
        <KpiCard icon={Package} color={stock <= 0 ? '#e11d48' : low ? '#d97706' : '#16a34a'} label={branch ? tr('Stock · {{name}}', { name: branch.name }) : tr('Stock')} value={`${fmt(stock)} ${p.unit}`}
          hint={shops.length > 1 ? tr('Sab branches: {{allStock}} {{unit}}', { allStock: fmt(allStock), unit: p.unit }) : stock <= 0 ? tr('Khatam') : low ? tr('Kam — had {{lowStockAlert}}', { lowStockAlert: fmt(p.lowStockAlert) }) : ins?.totals.daysLeft != null ? tr('~{{daysLeft}} din chalega', { daysLeft: ins.totals.daysLeft }) : tr('Had {{lowStockAlert}}', { lowStockAlert: fmt(p.lowStockAlert) })}
          onClick={() => setTab('stock')} active={active.id === 'stock'} />
        <KpiCard icon={ShoppingBag} color="#2563eb" label={tr('{{days}} din mein bika', { days })} value={ins ? `${fmt(ins.totals.qty)} ${p.unit}` : '…'} hint={ins ? tr('{{bills}} bill · roz ~{{perDay}}', { bills: ins.totals.bills, perDay: fmt(ins.totals.perDay) }) : undefined}
          onClick={() => setTab('sales')} active={active.id === 'sales'} />
        <KpiCard icon={Wallet} color="#0891b2" label={tr('{{days}} din ki Sale', { days })} value={ins ? money(ins.totals.revenue) : '…'} hint={ins?.allTime.lastSoldAt ? tr('aakhri {{lastSoldAt}}', { lastSoldAt: when(ins.allTime.lastSoldAt) }) : tr('abhi nahi bika')} />
        <KpiCard icon={TrendingUp} color="#16a34a" label={tr('{{days}} din ka Profit', { days })} value={ins ? cost(ins.totals.profit) : '…'} hint={costHidden ? tr('Cost lock') : margin !== null ? tr('{{value}}% margin', { value: margin.toFixed(1) }) : p.costPrice ? undefined : tr('Cost nahi likhi')} />
        {tile
          ? <KpiCard icon={Coins} color="#7c3aed" label={tile.label} value={tile.value} hint={tile.hint} />
          : <KpiCard icon={Coins} color="#7c3aed" label={tr('Stock ki value')} value={cost(Math.max(0, stock) * p.costPrice)} hint={tr('Bechne par {{value}}', { value: money(Math.max(0, stock) * p.price) })} />}
      </KpiRow>

      {/* Alerts */}
      {(stock <= 0 || low || expiring.length > 0 || config.alerts) && (
        <div className="space-y-2">
          {(stock <= 0 || low) && p.isActive && (
            <div className={cn('flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 ring-1', stock <= 0 ? 'bg-rose-50 text-rose-900 ring-rose-200' : 'bg-amber-50 text-amber-900 ring-amber-200')}>
              <AlertTriangle className="h-4 w-4" />
              <span className="text-[0.875rem] font-medium">{stock <= 0 ? tr('Stock khatam hai — grahak wapas ja raha hoga') : tr('Sirf {{stock}} {{unit}} bacha hai', { stock: fmt(stock), unit: p.unit })}
                {ins && ins.totals.perDay > 0 && tr(' · roz ~{{perDay}} bikta hai, {{value}} mangwa lein (2 hafte ka)', { perDay: fmt(ins.totals.perDay), value: Math.ceil(ins.totals.perDay * 14) })}</span>
              {can.buy && <Link to="/purchases/new" className="ms-auto text-[0.8125rem] font-semibold hover:underline">{tr('Purchase karein →')}</Link>}
            </div>
          )}
          {expiring.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
              <CalendarClock className="h-4 w-4" />
              <span className="text-[0.875rem] font-medium">{tr('{{count}} batch {{value}}', { count: expiring.length, value: expiring.some((b) => expiryOf(b)! < today) ? tr('expire ho chuke / qareeb hain') : tr('30 din mein expire honge') })}</span>
              <button type="button" onClick={() => setTab('batches')} className="ms-auto text-[0.8125rem] font-semibold hover:underline">{tr('Dekhein →')}</button>
            </div>
          )}
          {config.alerts?.(ctx)}
        </div>
      )}

      <ViewTabs value={active.id} onChange={setTab} hint={<><Kbd>1</Kbd>–<Kbd>{Math.min(9, tabs.length)}</Kbd> {' '}{tr('se badlein')}</>}
        tabs={tabs.map((t) => ({ id: t.id, label: t.label, icon: t.icon, count: t.count }))} />

      {active.id === 'overview' && (
        <OverviewTab product={p} insights={ins} days={days} setDays={setDays} money={money} cost={cost} costHidden={costHidden}
          facts={config.facts?.(ctx) ?? []} units={ctx.units} stock={stock} shopId={shopId} />
      )}
      {active.id === 'stock' && <StockTab product={p} insights={ins} stock={stock} shopId={shopId} canAdjust={can.stock} canBuy={can.buy} onAdjust={() => setStockOpen(true)} />}
      {active.id === 'sales' && <SalesTab insights={ins} money={money} />}
      {active.id === 'purchases' && <PurchasesTab product={p} cost={cost} canBuy={can.buy} canSuppliers={can.suppliers} />}
      {active.id === 'batches' && <BatchesTab product={p} />}
      {active.id === 'units' && <UnitsTab product={p} units={ctx.units} stock={stock} money={money} cost={cost} costHidden={costHidden} />}
      {active.id === 'recipe' && <ProductRecipePanel product={p} />}
      {active.render?.()}
    </PageShell>
  );
}
