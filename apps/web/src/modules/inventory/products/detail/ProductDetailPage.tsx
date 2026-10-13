/**
 * Shared product detail page: gallery, prices, stock for the active branch,
 * how it is selling (server-side, by business day), packs, variants, batches,
 * recent bills, its own stock log, and industry tabs from config.
 *
 * Keys: E edit · S stock · P print · 1–9 tabs.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle, ArrowLeft, Boxes, CalendarClock, Eye, EyeOff, Hourglass, Layers, LineChart, Package, Pencil, Plus,
  Receipt, ShoppingCart, Star, Store, Tag, Users,
} from 'lucide-react';
import { Card, Segmented, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PrintButton, type PrintDoc } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { ProductDeleteButton } from '@core/components/ProductDeleteButton';
import { usePermission, useAnyPermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useShopParam } from '@core/stores/auth.store';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { productUnitsApi, type ProductUnit } from '@modules/inventory/products/api/product-units.api';
import { ProductThumb } from '@modules/inventory/products/lib/productEmoji';
import { StockModal } from '../list/components/StockModal';
import { CATALOG_KEY } from '../list/useCatalog';
import { productInsightsApi, type ProductInsights } from './api';

const fmt = (n: number) => String(Number(Number(n).toFixed(3)));
const when = (v: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(v));
const MOVE: Record<string, { label: string; tone: string }> = {
  PURCHASE_IN: { label: 'Khareed', tone: 'text-success-700' }, SALE_OUT: { label: 'Sale', tone: 'text-slate-700' },
  ADJUSTMENT_IN: { label: 'Stock daala', tone: 'text-success-700' }, ADJUSTMENT_OUT: { label: 'Stock nikala', tone: 'text-rose-700' },
  RETURN_IN: { label: 'Wapas aaya', tone: 'text-sky-700' }, OPENING_BALANCE: { label: 'Shuru ka stock', tone: 'text-slate-700' },
  DAMAGE: { label: 'Kharab', tone: 'text-rose-700' }, LOSS: { label: 'Gum', tone: 'text-rose-700' },
  TRANSFER_IN: { label: 'Branch se aaya', tone: 'text-sky-700' }, TRANSFER_OUT: { label: 'Branch ko gaya', tone: 'text-amber-700' },
};

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
  /** Extra facts under the prices, as label/value pairs. */
  facts?: (ctx: DetailContext<X>) => Array<[string, ReactNode]>;
  /** Extra stock tile (e.g. serials on shelf). */
  tile?: (ctx: DetailContext<X>) => { label: string; value: ReactNode; hint?: ReactNode } | null;
  alerts?: (ctx: DetailContext<X>) => ReactNode;
  tabs?: Array<{ id: string; label: string; icon: typeof Package; when?: (ctx: DetailContext<X>) => boolean; render: (ctx: DetailContext<X>) => ReactNode }>;
  /** Quick quantities in the stock dialog. */
  stockChips?: number[];
}

function Tile({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: string }) {
  return (
    <div className={cn('rounded-2xl p-3.5', tone ?? 'bg-slate-50')}>
      <p className="text-[0.75rem] font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-[1.25rem] font-bold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="truncate text-[0.6875rem] text-slate-500">{hint}</p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-5 py-10 text-center text-[0.8125rem] text-slate-500">{text}</p>;
}

export function ProductDetailPage<X>({ config }: { config: DetailConfig<X> }) {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopId = useShopParam();
  const theme = useChartTheme();
  const { sales: money, cost, costHidden } = useMasked();
  const can = {
    edit: usePermission(PERMISSIONS.PRODUCTS_EDIT),
    delete: usePermission(PERMISSIONS.PRODUCTS_DELETE),
    stock: useAnyPermission(useMemo(() => [PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE, PERMISSIONS.PRODUCTS_EDIT], [])),
  };
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<'revenue' | 'qty' | 'profit'>('revenue');
  const [tab, setTab] = useState('overview');
  const [stockOpen, setStockOpen] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  const product = useQuery({ queryKey: ['product', id], queryFn: () => productsApi.getOne(id), enabled: !!id });
  const units = useQuery({ queryKey: ['product-units', id], queryFn: () => productUnitsApi.byProduct(id).catch(() => []), enabled: !!id });
  const insights = useQuery({ queryKey: ['product-insights', id, days, shopId], queryFn: () => productInsightsApi.get(id, days), enabled: !!id, placeholderData: (p) => p });
  const extra = useQuery({ queryKey: [config.extra?.key ?? 'none', id], queryFn: () => config.extra!.load(id), enabled: !!id && !!config.extra });

  const refresh = () => ['product', 'product-insights', 'product-units', CATALOG_KEY, 'products', config.extra?.key ?? ''].filter(Boolean).forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const p = product.data;
  const branch = insights.data?.shops.find((s) => s.shopId === shopId);
  const stock = branch ? branch.stock : Number(p?.stock ?? 0);
  const ctx: DetailContext<X> | null = p ? { product: p, units: units.data ?? [], insights: insights.data, extra: extra.data, stock, money, cost, costHidden, refresh } : null;
  const tabs = useMemo(() => {
    if (!ctx) return [];
    const list: Array<{ id: string; label: string; icon: typeof Package; render: () => ReactNode }> = [
      { id: 'overview', label: 'Khulasa', icon: LineChart, render: () => null },
    ];
    if (ctx.units.length) list.push({ id: 'units', label: 'Packing', icon: Boxes, render: () => null });
    if (ctx.product.variants?.length) list.push({ id: 'variants', label: 'Variants', icon: Layers, render: () => null });
    if (ctx.product.batches?.length) list.push({ id: 'batches', label: 'Batches', icon: CalendarClock, render: () => null });
    for (const t of config.tabs ?? []) if (!t.when || t.when(ctx)) list.push({ id: t.id, label: t.label, icon: t.icon, render: () => t.render(ctx) });
    list.push({ id: 'sales', label: 'Sale', icon: Receipt, render: () => null }, { id: 'log', label: 'Stock log', icon: Hourglass, render: () => null });
    return list;
  }, [ctx, config.tabs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (k === 'e' && can.edit) navigate(config.paths.edit(id));
      else if (k === 's' && can.stock) setStockOpen(true);
      else if (/^[1-9]$/.test(e.key) && tabs[Number(e.key) - 1]) setTab(tabs[Number(e.key) - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [can.edit, can.stock, config.paths, id, navigate, tabs]);

  if (product.isLoading) return <div className="mx-auto max-w-[var(--page-max,96rem)] space-y-4"><Skeleton className="h-72 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>;
  if (!p || !ctx) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center ring-1 ring-slate-200">
        <p className="font-semibold text-slate-900">Product nahi mila</p>
        <Link to={config.paths.list} className="mt-3 inline-block text-[0.875rem] font-semibold text-brand-700 hover:underline">Maal ki list →</Link>
      </div>
    );
  }

  const images = [...(p.images ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);
  const margin = p.price > 0 && p.costPrice > 0 ? ((p.price - p.costPrice) / p.price) * 100 : null;
  const ins = insights.data;
  const low = stock > 0 && stock <= p.lowStockAlert;
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const expiring = (p.batches ?? []).filter((b) => b.isActive && b.quantity > 0 && (b as { expiryDate?: string }).expiryDate && (b as { expiryDate?: string }).expiryDate!.slice(0, 10) <= soon);
  const tags = (p.tags ?? []).map((t) => t.tag).filter(Boolean);
  const series = (ins?.series ?? []).map((s) => ({
    ...s,
    label: new Intl.DateTimeFormat('en-PK', days > 30 ? { day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric' }).format(new Date(`${s.key}T12:00:00`)),
  }));

  const toggle = async (kind: 'active' | 'featured') => {
    try {
      await (kind === 'active' ? productsApi.toggleActive(id) : productsApi.toggleFeatured(id));
      toast.success(kind === 'active' ? (p.isActive ? 'Band kar di' : 'Chalu kar di') : (p.isFeatured ? 'Aam kar di' : 'Khaas bana di'));
      refresh();
    } catch (e) { toast.error((e as Error).message || 'Nahi hua'); }
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
      ...(ins?.movements.length ? [{ kind: 'table' as const, title: 'Stock log', columns: [{ label: 'Waqt' }, { label: 'Kya hua' }, { label: 'Quantity', align: 'right' as const }, { label: 'Baad mein', align: 'right' as const }], rows: ins.movements.slice(0, 25).map((m) => [when(m.createdAt), MOVE[m.type]?.label ?? m.type, fmt(m.quantity), fmt(m.balanceAfter)]) }] : []),
    ],
  });

  const active = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <div className="mx-auto w-full max-w-[var(--page-max,96rem)] space-y-4 pb-12">
      {stockOpen && <StockModal item={{ id: p.id, name: p.name, unit: p.unit, stock, price: p.price }} chips={config.stockChips} money={money} onClose={() => setStockOpen(false)} onSaved={refresh} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={config.paths.list} className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Maal ki list</Link>
        <div className="flex flex-wrap items-center gap-1.5">
          <PrivacyToggle compact />
          <PrintButton doc={printDoc} label="Print" />
          <Link to="/retail/barcode-labels" state={{ productIds: [p.id] }} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Tag className="h-4 w-4" />Label</Link>
          <Link to="/pos" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><ShoppingCart className="h-4 w-4" />POS</Link>
          {can.edit && (
            <>
              <button type="button" onClick={() => void toggle('featured')} title={p.isFeatured ? 'Aam karein' : 'Khaas banayein'} className={cn('flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-slate-200 hover:bg-slate-50', p.isFeatured ? 'bg-amber-50 text-amber-600' : 'bg-white text-slate-500')}><Star className={cn('h-4 w-4', p.isFeatured && 'fill-current')} /></button>
              <button type="button" onClick={() => void toggle('active')} title={p.isActive ? 'Band karein' : 'Chalu karein'} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">{p.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </>
          )}
          {can.delete && <ProductDeleteButton id={p.id} name={p.name} onDeleted={() => navigate(config.paths.list)} className="h-9 w-9 rounded-xl ring-1 ring-slate-200" />}
          {can.stock && <button type="button" onClick={() => setStockOpen(true)} title="Stock (S)" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-50 px-3 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-100"><Plus className="h-4 w-4" />Stock</button>}
          {can.edit && <Link to={config.paths.edit(p.id)} title="Badlein (E)" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-white shadow-sm hover:bg-brand-700"><Pencil className="h-4 w-4" />Badlein</Link>}
        </div>
      </div>

      {/* Hero */}
      <div className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5 lg:grid-cols-[20rem_minmax(0,1fr)_18rem]">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
            <ProductThumb name={p.name} category={p.category?.name} url={images[imgIndex]?.url} size="full" />
            {!p.isActive && <span className="absolute inset-x-0 top-0 bg-slate-900/80 py-1 text-center text-[0.75rem] font-bold uppercase tracking-wide text-white">Band hai — POS par nahi dikhti</span>}
          </div>
          {images.length > 1 && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto">
              {images.map((img, i) => (
                <button key={img.id} type="button" onClick={() => setImgIndex(i)} className={cn('h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2', i === imgIndex ? 'ring-brand-500' : 'ring-transparent')}>
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {p.category && <span className="rounded-md px-2 py-0.5 text-[0.75rem] font-semibold" style={{ backgroundColor: `${p.category.color}18`, color: p.category.color }}>{p.category.name}</span>}
            {p.isFeatured && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[0.75rem] font-semibold text-amber-700"><Star className="h-3 w-3 fill-current" />Khaas</span>}
            {config.badges?.(ctx)}
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{p.name}</h1>
          {p.description && <p className="mt-1 line-clamp-3 text-[0.875rem] text-slate-600">{p.description}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5 text-[0.75rem]">
            {p.sku && <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-700">SKU {p.sku}</span>}
            {p.barcode && <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-700">{p.barcode}</span>}
            {p.brand && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">{p.brand.name}</span>}
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">Fi {p.unit}</span>
            {tags.map((t) => <span key={t.id} className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">#{t.name}</span>)}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="Bechne ki qeemat" value={money(p.price)} hint={`fi ${p.unit}`} tone="bg-brand-50" />
            <Tile label="Cost" value={cost(p.costPrice)} hint={costHidden ? 'Cost lock' : margin === null ? 'Cost nahi likhi' : `${margin.toFixed(1)}% margin`} />
            <Tile label="Profit fi unit" value={p.costPrice ? cost(p.price - p.costPrice) : '—'} />
            <Tile label="Wholesale" value={p.wholesalePrice ? money(p.wholesalePrice) : '—'} />
          </div>
          {config.facts && (
            <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-[0.8125rem] sm:grid-cols-2">
              {config.facts(ctx).map(([l, v]) => <div key={l} className="flex justify-between gap-3 border-b border-slate-100 py-1"><dt className="text-slate-500">{l}</dt><dd className="text-right font-medium text-slate-800">{v}</dd></div>)}
            </dl>
          )}
        </div>

        <div className="space-y-2">
          <div className={cn('rounded-2xl p-4', stock <= 0 ? 'bg-rose-50' : low ? 'bg-amber-50' : 'bg-success-50')}>
            <p className="text-[0.75rem] font-medium text-slate-600">{branch ? `Stock · ${branch.name}` : 'Stock'}</p>
            <p className={cn('text-[2rem] font-bold leading-tight tabular-nums', stock <= 0 ? 'text-rose-700' : low ? 'text-amber-800' : 'text-success-800')}>{fmt(stock)} <span className="text-[0.875rem] font-medium">{p.unit}</span></p>
            <p className="text-[0.75rem] text-slate-600">{stock <= 0 ? 'Khatam' : low ? `Kam — had ${fmt(p.lowStockAlert)}` : `Had ${fmt(p.lowStockAlert)}`}{ins?.totals.daysLeft != null && stock > 0 ? ` · ~${ins.totals.daysLeft} din chalega` : ''}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Tile label="Stock ki cost" value={cost(Math.max(0, stock) * p.costPrice)} />
            <Tile label="Bechne par" value={money(Math.max(0, stock) * p.price)} />
            <Tile label={`${days} din bika`} value={ins ? fmt(ins.totals.qty) : '…'} hint={ins ? `${ins.totals.bills} bill` : undefined} />
            {(() => { const t = config.tile?.(ctx); return t ? <Tile label={t.label} value={t.value} hint={t.hint} /> : <Tile label={`${days} din kamaya`} value={ins ? money(ins.totals.revenue) : '…'} />; })()}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(stock <= 0 || low || expiring.length > 0 || config.alerts) && (
        <div className="space-y-2">
          {(stock <= 0 || low) && (
            <div className={cn('flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 ring-1', stock <= 0 ? 'bg-rose-50 ring-rose-200 text-rose-900' : 'bg-amber-50 ring-amber-200 text-amber-900')}>
              <AlertTriangle className="h-4 w-4" />
              <span className="text-[0.875rem] font-medium">{stock <= 0 ? 'Stock khatam hai — grahak wapas ja raha hoga' : `Sirf ${fmt(stock)} ${p.unit} bacha hai`}
                {ins && ins.totals.perDay > 0 && ` · roz ~${fmt(ins.totals.perDay)} bikta hai, ${Math.ceil(ins.totals.perDay * 14)} mangwa lein (2 hafte ka)`}</span>
              <Link to="/purchases" className="ml-auto text-[0.8125rem] font-semibold hover:underline">Khareed karein →</Link>
            </div>
          )}
          {expiring.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
              <CalendarClock className="h-4 w-4" />
              <span className="text-[0.875rem] font-medium">{expiring.length} batch {expiring.some((b) => (b as { expiryDate?: string }).expiryDate!.slice(0, 10) < today) ? 'expire ho chuke / qareeb hain' : '30 din mein expire honge'}</span>
              <button type="button" onClick={() => setTab('batches')} className="ml-auto text-[0.8125rem] font-semibold hover:underline">Dekhein →</button>
            </div>
          )}
          {config.alerts?.(ctx)}
        </div>
      )}

      {/* Tabs */}
      <div role="tablist" className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
        {tabs.map((t, i) => (
          <button key={t.id} type="button" role="tab" aria-selected={active.id === t.id} onClick={() => setTab(t.id)} title={`${t.label} (${i + 1})`}
            className={cn('inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl px-4 text-[0.875rem] font-semibold transition', active.id === t.id ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200/80 hover:bg-slate-50')}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {active.id === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl lg:col-span-2" title="Kaise bik raha hai" description="Karobari din ke hisaab se"
            actions={<div className="flex flex-wrap gap-2">
              <Segmented<'revenue' | 'qty' | 'profit'> label="Kya dikhayein" value={metric} onChange={setMetric}
                items={[{ value: 'revenue', label: 'Amount' }, { value: 'qty', label: 'Quantity' }, ...(costHidden ? [] : [{ value: 'profit' as const, label: 'Profit' }])]} />
              <Segmented<string> label="Period" value={String(days)} onChange={(v) => setDays(Number(v))}
                items={[{ value: '7', label: '7d' }, { value: '30', label: '30d' }, { value: '90', label: '90d' }, { value: '365', label: '1 saal' }]} />
            </div>}>
            {!ins ? <Skeleton className="h-64 rounded-xl" /> : ins.totals.bills === 0 ? <Empty text={`Pichhle ${days} din mein nahi bika`} /> : (
              <>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                      <defs><linearGradient id="pd-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={theme.primary} stopOpacity={0.28} /><stop offset="100%" stopColor={theme.primary} stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid stroke={theme.grid} vertical={false} />
                      <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                      <YAxis tick={theme.axis} axisLine={false} tickLine={false} width={44} tickFormatter={metric === 'qty' ? undefined : axisMoney} allowDecimals={metric !== 'qty'} />
                      <Tooltip formatter={(v) => [metric === 'qty' ? `${fmt(Number(v))} ${p.unit}` : formatPKR(Number(v)), metric === 'qty' ? 'Quantity' : metric === 'profit' ? 'Profit' : 'Amount']} contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} />
                      <Area type="monotone" dataKey={metric} stroke={theme.primary} strokeWidth={2.25} fill="url(#pd-fill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Tile label="Bika" value={`${fmt(ins.totals.qty)} ${p.unit}`} hint={`roz ~${fmt(ins.totals.perDay)}`} />
                  <Tile label="Amount" value={money(ins.totals.revenue)} hint={`${ins.totals.bills} bill`} />
                  <Tile label="Profit" value={cost(ins.totals.profit)} />
                  <Tile label="Shuru se" value={`${fmt(ins.allTime.qty)} ${p.unit}`} hint={ins.allTime.lastSoldAt ? `aakhri ${when(ins.allTime.lastSoldAt)}` : 'kabhi nahi bika'} />
                </div>
              </>
            )}
          </Card>
          <div className="space-y-4">
            {(ins?.shops.length ?? 0) > 1 && (
              <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Store className="h-4 w-4 text-brand-600" />Har branch ka stock</span>}>
                <ul className="space-y-2 text-[0.8125rem]">
                  {ins!.shops.map((s) => (
                    <li key={s.shopId} className={cn('flex justify-between rounded-lg px-2 py-1', s.shopId === shopId && 'bg-brand-50')}>
                      <span className="text-slate-700">{s.name}</span>
                      <span className={cn('font-semibold tabular-nums', s.stock <= 0 ? 'text-rose-600' : s.stock <= s.lowStockAlert ? 'text-amber-700' : 'text-slate-900')}>{fmt(s.stock)} {p.unit}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-brand-600" />Kaun zyada leta hai</span>} flush>
              {!ins?.customers.length ? <Empty text="Naam wale customer ne nahi liya" /> : (
                <ul className="divide-y divide-slate-100 pb-1">
                  {ins.customers.map((c) => (
                    <li key={c.id}><Link to={`/customers/${c.id}`} className="flex justify-between px-4 py-2.5 text-[0.8125rem] hover:bg-slate-50 sm:px-5"><span className="truncate text-slate-800">{c.name}</span><span className="text-slate-500">{c.bills} bill</span></Link></li>
                  ))}
                </ul>
              )}
            </Card>
            {ctx.units.length > 0 && <PackCalculator units={ctx.units} unit={p.unit} stock={stock} money={money} />}
          </div>
        </div>
      )}

      {active.id === 'units' && (
        <Card className="rounded-2xl" flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-[0.8125rem]">
              <thead><tr className="bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5">Packing</th><th className="px-3 py-2.5 text-right">Kitne {p.unit}</th><th className="px-3 py-2.5 text-right">Rate</th>{!costHidden && <th className="px-3 py-2.5 text-right">Cost</th>}<th className="px-3 py-2.5 text-right">Fi {p.unit}</th><th className="px-3 py-2.5">Barcode</th><th className="px-5 py-2.5 text-right">Stock mein</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {ctx.units.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-2.5 font-medium text-slate-900">{u.unitName}{u.isBase && <span className="ml-1.5 rounded bg-brand-50 px-1.5 text-[0.6875rem] text-brand-700">asal</span>}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(u.conversionRate)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{money(u.price)}</td>
                    {!costHidden && <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{cost(u.costPrice)}</td>}
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{money(u.conversionRate ? u.price / u.conversionRate : 0)}</td>
                    <td className="px-3 py-2.5 font-mono text-[0.75rem] text-slate-600">{u.barcode ?? '—'}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{u.conversionRate ? Math.floor(stock / u.conversionRate) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {active.id === 'variants' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(p.variants ?? []).map((v) => {
            const hex = (v as { colorHex?: string }).colorHex;
            return (
              <div key={v.id} className={cn('rounded-2xl bg-white p-4 shadow-sm ring-1', v.stock <= 0 ? 'ring-rose-200' : v.stock <= v.lowStockAlert ? 'ring-amber-200' : 'ring-slate-200/80')}>
                <div className="flex items-center gap-2">{hex && <span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ backgroundColor: hex }} />}<p className="font-semibold text-slate-900">{v.name}</p>{!v.isActive && <span className="text-[0.6875rem] text-slate-400">band</span>}</div>
                <p className="mt-1 text-[1.125rem] font-bold tabular-nums">{money(v.price)}</p>
                <p className={cn('text-[0.8125rem] font-medium', v.stock <= 0 ? 'text-rose-600' : v.stock <= v.lowStockAlert ? 'text-amber-700' : 'text-slate-600')}>{fmt(v.stock)} {p.unit} stock</p>
                {(v as { barcode?: string }).barcode && <p className="mt-1 font-mono text-[0.6875rem] text-slate-500">{(v as { barcode?: string }).barcode}</p>}
              </div>
            );
          })}
        </div>
      )}

      {active.id === 'batches' && (
        <Card className="rounded-2xl" flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-[0.8125rem]">
              <thead><tr className="bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5">Batch</th><th className="px-3 py-2.5">Bani</th><th className="px-3 py-2.5">Expiry</th><th className="px-3 py-2.5 text-right">Baqi</th><th className="px-5 py-2.5">Halat</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {[...(p.batches ?? [])].sort((a, b) => String((a as { expiryDate?: string }).expiryDate ?? '9').localeCompare(String((b as { expiryDate?: string }).expiryDate ?? '9'))).map((b) => {
                  const r = b as unknown as { batchNumber: string; manufactureDate?: string; expiryDate?: string };
                  const exp = r.expiryDate?.slice(0, 10);
                  const tone = !exp ? 'text-slate-500' : exp < today ? 'text-rose-700' : exp <= soon ? 'text-amber-700' : 'text-success-700';
                  return (
                    <tr key={b.id}>
                      <td className="px-5 py-2.5 font-mono">{r.batchNumber}</td>
                      <td className="px-3 py-2.5 text-slate-600">{r.manufactureDate ? new Date(r.manufactureDate).toLocaleDateString('en-PK') : '—'}</td>
                      <td className={cn('px-3 py-2.5 font-medium', tone)}>{exp ? new Date(exp).toLocaleDateString('en-PK') : '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmt(b.quantity)}</td>
                      <td className={cn('px-5 py-2.5 font-medium', tone)}>{!exp ? 'Expiry nahi' : exp < today ? 'Expire ho gaya' : exp <= soon ? 'Qareeb' : 'Theek'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {active.id === 'sales' && (
        <Card className="rounded-2xl" title="Aakhri bill" description="Is cheez ke saath bane aakhri 30 bill" flush>
          {!ins?.recent.length ? <Empty text="Abhi tak nahi bika" /> : (
            <ul className="divide-y divide-slate-100">
              {ins.recent.map((r) => (
                <li key={r.id}>
                  <Link to={`/sales/${r.saleId}/receipt`} className="flex items-center gap-3 px-4 py-2.5 text-[0.8125rem] hover:bg-slate-50 sm:px-5">
                    <span className="w-28 shrink-0 font-mono font-semibold text-slate-900">{r.saleNumber}</span>
                    <span className="w-32 shrink-0 text-slate-500">{when(r.soldAt)}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-700">{r.customer?.name ?? 'Walk-in'}{r.status === 'VOIDED' && <span className="ml-2 text-rose-600">void</span>}{r.returnedQty > 0 && <span className="ml-2 text-amber-700">{fmt(r.returnedQty)} wapas</span>}</span>
                    <span className="tabular-nums text-slate-600">{fmt(r.qty)} × {money(r.price)}</span>
                    <span className="w-24 text-right font-semibold tabular-nums text-slate-900">{money(r.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {active.id === 'log' && (
        <Card className="rounded-2xl" title="Stock log" description="Sirf is cheez ki aakhri 60 tabdeeliyan" flush>
          {!ins?.movements.length ? <Empty text="Abhi koi tabdeeli nahi" /> : (
            <ul className="divide-y divide-slate-100">
              {ins.movements.map((m) => {
                const t = MOVE[m.type] ?? { label: m.type, tone: 'text-slate-700' };
                const inward = m.type.endsWith('_IN') || m.type === 'OPENING_BALANCE';
                return (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-[0.8125rem] sm:px-5">
                    <span className="w-32 shrink-0 text-slate-500">{when(m.createdAt)}</span>
                    <span className={cn('w-28 shrink-0 font-medium', t.tone)}>{t.label}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-500">{[m.note, m.reference, m.shop?.name].filter(Boolean).join(' · ')}</span>
                    <span className={cn('w-20 text-right font-semibold tabular-nums', inward ? 'text-success-700' : 'text-rose-700')}>{inward ? '+' : '−'}{fmt(Math.abs(m.quantity))}</span>
                    <span className="w-20 text-right tabular-nums text-slate-600">= {fmt(m.balanceAfter)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {!['overview', 'units', 'variants', 'batches', 'sales', 'log'].includes(active.id) && active.render()}
    </div>
  );
}

function PackCalculator({ units, unit, stock, money }: { units: ProductUnit[]; unit: string; stock: number; money: (n: number) => string }) {
  const [unitId, setUnitId] = useState(units[0].id);
  const [qty, setQty] = useState(1);
  const u = units.find((x) => x.id === unitId) ?? units[0];
  const base = qty * u.conversionRate;
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-brand-600" />Hisaab lagayein</span>}>
      <div className="flex gap-2">
        <input inputMode="decimal" value={qty || ''} onChange={(e) => setQty(Number(e.target.value.replace(/[^\d.]/g, '')))} className="h-10 w-20 rounded-xl border border-slate-200 bg-white px-3 tabular-nums" />
        <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-[0.875rem]">{units.map((x) => <option key={x.id} value={x.id}>{x.unitName}</option>)}</select>
      </div>
      <dl className="mt-3 space-y-1 text-[0.8125rem]">
        <div className="flex justify-between"><dt className="text-slate-500">Yani</dt><dd className="tabular-nums">{fmt(base)} {unit}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Qeemat</dt><dd className="font-semibold tabular-nums">{money(qty * u.price)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Is ke baad stock</dt><dd className={cn('tabular-nums', stock - base < 0 && 'text-rose-600')}>{fmt(stock - base)} {unit}</dd></div>
      </dl>
    </Card>
  );
}
