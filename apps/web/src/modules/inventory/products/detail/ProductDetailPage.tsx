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
  AlertTriangle, ArrowLeft, Boxes, CalendarClock, Coins, Eye, EyeOff, GraduationCap, Hourglass, Layers, LineChart, Package,
  Pencil, Plus, Receipt, ShoppingBag, Star, Tag, TrendingUp, Truck, Wallet,
} from 'lucide-react';
import { Button, Kbd, KpiCard, KpiRow, Modal, PageShell, Skeleton, ViewTabs } from '@/design-system/components';
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
import { StockModal } from '../list/components/StockModal';
import { CATALOG_KEY } from '../list/useCatalog';
import { productInsightsApi, type ProductInsights } from './api';
import { BatchesTab, MOVE, OverviewTab, PurchasesTab, SalesTab, StockTab, UnitsTab, fmt, when } from './tabs';

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
  { icon: TrendingUp, color: '#2563eb', title: 'Upar ke numbers', text: 'Stock is branch ka hai. Sale, profit aur stock ki value chart ke period (7, 30, 90 din) ke hisaab se badalte hain.' },
  { icon: Plus, color: '#16a34a', title: 'Stock badlein', text: '"Stock" button (S) se stock daalein ya nikalein. Har badlao Adjustment ban kar record mein rehta hai — product edit karne se stock nahi badalta.' },
  { icon: Truck, color: '#0891b2', title: 'Purchase', text: 'Purchase tab mein har bill, supplier aur aakhri cost. Cost badal gayi ho to product ki cost bhi theek kar lein.' },
  { icon: EyeOff, color: '#64748b', title: 'Band karein', text: 'Jo cheez ab nahi bechni use band kar dein — POS par nahi dikhegi, magar bill aur history waisi hi rahegi.' },
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
  };
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
      { id: 'overview', label: 'Overview', icon: LineChart },
      { id: 'stock', label: 'Stock', icon: Hourglass },
      { id: 'sales', label: 'Sale', icon: Receipt },
    ];
    if (can.purchases) list.push({ id: 'purchases', label: 'Purchase', icon: Truck });
    const batches = ctx.product.batches?.length ?? 0;
    if (batches || ctx.product.expiryTracked) list.push({ id: 'batches', label: 'Batches', icon: CalendarClock, count: batches || undefined });
    const nUnits = ctx.units.length;
    const nVariants = ctx.product.variants?.length ?? 0;
    if (nUnits || nVariants) {
      list.push({ id: 'units', label: nUnits && nVariants ? 'Packing / Variants' : nUnits ? 'Packing' : 'Variants', icon: nVariants ? Layers : Boxes, count: nUnits + nVariants });
    }
    for (const t of config.tabs ?? []) if (!t.when || t.when(ctx)) list.push({ id: t.id, label: t.label, icon: t.icon, render: () => t.render(ctx) });
    return list;
  }, [ctx, config.tabs, can.purchases]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <p className="font-semibold text-slate-900">Product nahi mila</p>
          <Link to={config.paths.list} className="mt-3 inline-block text-[0.875rem] font-semibold text-brand-700 hover:underline">Products ki list →</Link>
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
    } catch (e) { toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || (e as Error).message || 'Nahi hua'); }
    finally { setBusy(false); setConfirmOff(false); }
  };

  const printDoc = (): PrintDoc => ({
    title: p.name,
    subtitle: [p.sku, p.barcode].filter(Boolean).join(' · ') || undefined,
    meta: [['Category', p.category?.name ?? '—'], ['Unit', p.unit]],
    sections: [
      { kind: 'rows', title: 'Qeemat aur stock', rows: [
        { label: 'Bechne ki qeemat', value: formatPKR(p.price) },
        ...(costHidden ? [] : [{ label: 'Cost', value: formatPKR(p.costPrice) }]),
        ...(p.wholesalePrice ? [{ label: 'Wholesale', value: formatPKR(p.wholesalePrice) }] : []),
        { label: 'Stock', value: `${fmt(stock)} ${p.unit}`, strong: true },
        ...(ins ? [{ label: `${ins.window} din ki sale`, value: `${fmt(ins.totals.qty)} ${p.unit} · ${formatPKR(ins.totals.revenue)}` }] : []),
      ] },
      ...(ctx.units.length ? [{ kind: 'table' as const, title: 'Packing', columns: [{ label: 'Packing' }, { label: `Kitne ${p.unit}`, align: 'right' as const }, { label: 'Rate', align: 'right' as const }], rows: ctx.units.map((u) => [u.unitName, fmt(u.conversionRate), formatPKR(u.price)]) }] : []),
      ...(ins?.movements.length ? [{ kind: 'table' as const, title: 'Stock ki movements', columns: [{ label: 'Waqt' }, { label: 'Kya hua' }, { label: 'Quantity', align: 'right' as const }, { label: 'Baad mein', align: 'right' as const }], rows: ins.movements.slice(0, 25).map((m) => [when(m.createdAt), MOVE[m.type]?.label ?? m.type, fmt(m.quantity), fmt(m.balanceAfter)]) }] : []),
    ],
  });

  const active = tabs.find((t) => t.id === tab) ?? tabs[0];
  const btn = 'inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50';
  const iconBtn = 'flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50';

  return (
    <PageShell>
      {stockOpen && <StockModal item={{ id: p.id, name: p.name, unit: p.unit, stock, price: p.price }} chips={config.stockChips} money={money} onClose={() => setStockOpen(false)} onSaved={refresh} />}
      {confirmOff && (
        <Modal open onClose={() => setConfirmOff(false)} size="sm" title={`"${p.name}" band karein?`}
          description="POS, online store aur naye bill mein nahi dikhegi. Purane bill, stock aur history waise hi rahenge. Baad mein dobara chalu kar sakte hain."
          footer={<>
            <Button variant="secondary" onClick={() => setConfirmOff(false)}>Rehne dein</Button>
            <Button variant="danger" loading={busy} onClick={() => void setFlag({ isActive: false }, 'Band kar di')}>Band karein</Button>
          </>}>
          {stock > 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Abhi {fmt(stock)} {p.unit} stock pada hai — band karne se stock nahi hatega.</p>}
        </Modal>
      )}
      {guide.isOpen && (
        <PageGuide title="Product ka safha" onClose={guide.close} steps={[...GUIDE, ...(config.guide ?? [])]}
          tips={['Har branch ka stock alag hai — branch badlein to numbers us branch ke hon ge.', 'Cost chhupani ho to aankh wala button dabayein; profit aur cost chhup jayenge.']}
          shortcuts={[['E', 'badlein'], ['S', 'stock'], ['L', 'label'], ['1–9', 'tabs'], ['G', 'guide']]} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={config.paths.list} className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Products ki list</Link>
        <p className="hidden items-center gap-1.5 text-[0.75rem] text-slate-500 md:inline-flex"><Kbd>E</Kbd> badlein · <Kbd>S</Kbd> stock · <Kbd>G</Kbd> guide</p>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:flex-row sm:items-start sm:p-5">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:h-28 sm:w-28">
          <ProductThumb name={p.name} category={p.category?.name} url={images[0]?.url} size="full" />
          {images.length > 1 && <span className="absolute bottom-1 right-1 rounded-md bg-slate-900/70 px-1.5 text-[0.625rem] font-bold text-white">+{images.length - 1}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {!p.isActive && <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[0.75rem] font-semibold text-white">Band hai</span>}
            {p.category && <span className="rounded-md px-2 py-0.5 text-[0.75rem] font-semibold" style={{ backgroundColor: `${p.category.color}18`, color: p.category.color }}>{p.category.name}</span>}
            {p.isFeatured && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[0.75rem] font-semibold text-amber-700"><Star className="h-3 w-3 fill-current" />Khaas</span>}
            {config.badges?.(ctx)}
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{p.name}</h1>
          <p className="mt-0.5 text-[0.9375rem] text-slate-700"><strong className="tabular-nums">{money(p.price)}</strong> <span className="text-slate-500">/ {p.unit}</span>{p.wholesalePrice ? <span className="ml-2 text-[0.8125rem] text-slate-500">Wholesale {money(p.wholesalePrice)}</span> : null}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[0.75rem]">
            {p.sku && <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-700">SKU {p.sku}</span>}
            {p.barcode && <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-700">{p.barcode}</span>}
            {p.brand && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">{p.brand.name}</span>}
            {tags.map((t) => <span key={t.id} className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">#{t.name}</span>)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:max-w-[26rem] sm:justify-end">
          <PrivacyToggle compact />
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={iconBtn}><GraduationCap className="h-4 w-4" /></button>
          <PrintButton doc={printDoc} label="Print" size="sm" />
          <Link to="/retail/barcode-labels" state={{ productIds: [p.id] }} title="Label (L)" className={btn}><Tag className="h-4 w-4" />Label</Link>
          {can.edit && (
            <>
              <button type="button" disabled={busy} onClick={() => void setFlag({ isFeatured: !p.isFeatured }, p.isFeatured ? 'Aam kar di' : 'Khaas bana di')} title={p.isFeatured ? 'Aam karein' : 'Khaas banayein'} aria-label="Khaas"
                className={cn(iconBtn, p.isFeatured && 'bg-amber-50 text-amber-600')}><Star className={cn('h-4 w-4', p.isFeatured && 'fill-current')} /></button>
              {p.isActive
                ? <button type="button" onClick={() => setConfirmOff(true)} className={btn}><EyeOff className="h-4 w-4" />Band karein</button>
                : <button type="button" disabled={busy} onClick={() => void setFlag({ isActive: true }, 'Chalu kar di')} className={btn}><Eye className="h-4 w-4" />Chalu karein</button>}
            </>
          )}
          {can.stock && <button type="button" onClick={() => setStockOpen(true)} title="Stock (S)" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-50 px-3 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-100"><Plus className="h-4 w-4" />Stock</button>}
          {can.edit && <Link to={config.paths.edit(p.id)} title="Badlein (E)" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-white shadow-sm hover:bg-brand-700"><Pencil className="h-4 w-4" />Badlein</Link>}
        </div>
      </div>

      {/* KPIs */}
      <KpiRow>
        <KpiCard icon={Package} color={stock <= 0 ? '#e11d48' : low ? '#d97706' : '#16a34a'} label={branch ? `Stock · ${branch.name}` : 'Stock'} value={`${fmt(stock)} ${p.unit}`}
          hint={shops.length > 1 ? `Sab branches: ${fmt(allStock)} ${p.unit}` : stock <= 0 ? 'Khatam' : low ? `Kam — had ${fmt(p.lowStockAlert)}` : ins?.totals.daysLeft != null ? `~${ins.totals.daysLeft} din chalega` : `Had ${fmt(p.lowStockAlert)}`}
          onClick={() => setTab('stock')} active={active.id === 'stock'} />
        <KpiCard icon={ShoppingBag} color="#2563eb" label={`${days} din mein bika`} value={ins ? `${fmt(ins.totals.qty)} ${p.unit}` : '…'} hint={ins ? `${ins.totals.bills} bill · roz ~${fmt(ins.totals.perDay)}` : undefined}
          onClick={() => setTab('sales')} active={active.id === 'sales'} />
        <KpiCard icon={Wallet} color="#0891b2" label={`${days} din ki Sale`} value={ins ? money(ins.totals.revenue) : '…'} hint={ins?.allTime.lastSoldAt ? `aakhri ${when(ins.allTime.lastSoldAt)}` : 'abhi nahi bika'} />
        <KpiCard icon={TrendingUp} color="#16a34a" label={`${days} din ka Profit`} value={ins ? cost(ins.totals.profit) : '…'} hint={costHidden ? 'Cost lock' : margin !== null ? `${margin.toFixed(1)}% margin` : p.costPrice ? undefined : 'Cost nahi likhi'} />
        {tile
          ? <KpiCard icon={Coins} color="#7c3aed" label={tile.label} value={tile.value} hint={tile.hint} />
          : <KpiCard icon={Coins} color="#7c3aed" label="Stock ki value" value={cost(Math.max(0, stock) * p.costPrice)} hint={`Bechne par ${money(Math.max(0, stock) * p.price)}`} />}
      </KpiRow>

      {/* Alerts */}
      {(stock <= 0 || low || expiring.length > 0 || config.alerts) && (
        <div className="space-y-2">
          {(stock <= 0 || low) && p.isActive && (
            <div className={cn('flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 ring-1', stock <= 0 ? 'bg-rose-50 text-rose-900 ring-rose-200' : 'bg-amber-50 text-amber-900 ring-amber-200')}>
              <AlertTriangle className="h-4 w-4" />
              <span className="text-[0.875rem] font-medium">{stock <= 0 ? 'Stock khatam hai — grahak wapas ja raha hoga' : `Sirf ${fmt(stock)} ${p.unit} bacha hai`}
                {ins && ins.totals.perDay > 0 && ` · roz ~${fmt(ins.totals.perDay)} bikta hai, ${Math.ceil(ins.totals.perDay * 14)} mangwa lein (2 hafte ka)`}</span>
              {can.buy && <Link to="/purchases/new" className="ml-auto text-[0.8125rem] font-semibold hover:underline">Purchase karein →</Link>}
            </div>
          )}
          {expiring.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
              <CalendarClock className="h-4 w-4" />
              <span className="text-[0.875rem] font-medium">{expiring.length} batch {expiring.some((b) => expiryOf(b)! < today) ? 'expire ho chuke / qareeb hain' : '30 din mein expire honge'}</span>
              <button type="button" onClick={() => setTab('batches')} className="ml-auto text-[0.8125rem] font-semibold hover:underline">Dekhein →</button>
            </div>
          )}
          {config.alerts?.(ctx)}
        </div>
      )}

      <ViewTabs value={active.id} onChange={setTab} hint={<><Kbd>1</Kbd>–<Kbd>{Math.min(9, tabs.length)}</Kbd> se badlein</>}
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
      {active.render?.()}
    </PageShell>
  );
}
