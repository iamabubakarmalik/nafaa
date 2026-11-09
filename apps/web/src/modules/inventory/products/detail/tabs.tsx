/**
 * Tab bodies of the shared product detail page: overview, stock and
 * movements, sales, purchases, batches, and packing/variants.
 */

import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownLeft, ArrowUpRight, ClipboardList, Package, Plus, Store, Truck, Users } from 'lucide-react';
import { Card, Segmented, Skeleton, Table, THead, TBody, Tr, Th, Td } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { COST_PRICE_LABEL, PRICE_TIER_FIELD, marginPct } from '@core/lib/priceTiers';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { Product } from '@modules/inventory/products/api/products.api';
import type { ProductUnit } from '@modules/inventory/products/api/product-units.api';
import { productInsightsApi, type ProductInsights } from './api';
import { productSuppliersApi } from '@modules/inventory/products/api/product-suppliers.api';
import { t as tr } from '@core/i18n';

export const fmt = (n: number) => String(Number(Number(n).toFixed(3)));
export const when = (v: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(v));
const day = (v: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(v));
const todayKey = () => new Date().toISOString().slice(0, 10);
const soonKey = () => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

export const MOVE: Record<string, { label: string; tone: string }> = {
  PURCHASE_IN: { label: tr('Purchase'), tone: 'text-success-700' }, SALE_OUT: { label: tr('Sale'), tone: 'text-slate-700' },
  ADJUSTMENT_IN: { label: tr('Stock daala'), tone: 'text-success-700' }, ADJUSTMENT_OUT: { label: tr('Stock nikala'), tone: 'text-rose-700' },
  RETURN_IN: { label: tr('Return aaya'), tone: 'text-sky-700' }, OPENING_BALANCE: { label: tr('Shuru ka stock'), tone: 'text-slate-700' },
  DAMAGE: { label: tr('Kharab'), tone: 'text-rose-700' }, LOSS: { label: tr('Gum'), tone: 'text-rose-700' },
  TRANSFER_IN: { label: tr('Branch se aaya'), tone: 'text-sky-700' }, TRANSFER_OUT: { label: tr('Branch ko gaya'), tone: 'text-amber-700' },
  PRODUCTION_IN: { label: tr('Banaya (Production)'), tone: 'text-success-700' }, PRODUCTION_OUT: { label: tr('Production me laga'), tone: 'text-orange-700' },
};
const isInward = (type: string) => type.endsWith('_IN') || type === 'OPENING_BALANCE';

type Money = (n: number) => string;

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-[0.8125rem] text-slate-500">{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3.5">
      <p className="text-[0.75rem] font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-[1.125rem] font-bold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="truncate text-[0.6875rem] text-slate-500">{hint}</p>}
    </div>
  );
}

const th = 'px-3 py-2.5';
const head = 'bg-slate-50 text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500';
const linkCls = 'text-[0.8125rem] font-semibold text-brand-700 hover:underline';

/* ─────────────────────────── Overview ─────────────────────────── */

export function OverviewTab({ product: p, insights: ins, days, setDays, money, cost, costHidden, facts, units, stock, shopId }: {
  product: Product; insights?: ProductInsights; days: number; setDays: (d: number) => void; money: Money; cost: Money; costHidden: boolean;
  facts: Array<[string, ReactNode]>; units: ProductUnit[]; stock: number; shopId?: string;
}) {
  const theme = useChartTheme();
  const [metric, setMetric] = useState<'revenue' | 'qty' | 'profit'>('revenue');
  const series = (ins?.series ?? []).map((s) => ({
    ...s,
    label: new Intl.DateTimeFormat('en-PK', days > 30 ? { day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric' }).format(new Date(`${s.key}T12:00:00`)),
  }));
  const margin = p.price > 0 && p.costPrice > 0 ? ((p.price - p.costPrice) / p.price) * 100 : null;
  // Margin per selling price; hidden with the cost.
  const tierMargin = (price: number) => {
    const m = costHidden ? null : marginPct(price, p.costPrice);
    return m === null ? null : <span className={cn('ms-1.5 text-[0.75rem] font-normal', m < 0 ? 'text-rose-600' : 'text-slate-500')}>{m.toFixed(1)}%</span>;
  };
  const tierRow = (label: string, value: number | null | undefined): [string, ReactNode] => [label, Number(value) > 0
    ? <span key={label} className="tabular-nums">{money(Number(value))}{tierMargin(Number(value))}</span>
    : <span key={label} className="font-normal text-slate-400">{tr('Retail price lagegi')}</span>];
  const prices: Array<[string, ReactNode]> = [
    [PRICE_TIER_FIELD.RETAIL, <strong key="p" className="tabular-nums">{money(p.price)} <span className="font-normal text-slate-500">/ {p.unit}</span>{tierMargin(p.price)}</strong>],
    tierRow(PRICE_TIER_FIELD.WHOLESALE, p.wholesalePrice),
    tierRow(PRICE_TIER_FIELD.CREDIT, p.creditPrice),
    [COST_PRICE_LABEL, <span key="c" className="tabular-nums">{cost(p.costPrice)}</span>],
    [tr('Profit fi unit'), <span key="m" className={cn('tabular-nums', !costHidden && margin !== null && margin < 0 && 'text-rose-600')}>{p.costPrice ? `${cost(p.price - p.costPrice)}${margin !== null && !costHidden ? ` · ${margin.toFixed(1)}%` : ''}` : '—'}</span>],
    [tr('Tax'), p.taxRate ? `${p.taxRate}%` : '—'],
    [tr('Kam stock ki had'), `${fmt(p.lowStockAlert)} ${p.unit}`],
    ...facts,
  ];
  const images = [...(p.images ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card className="rounded-2xl" title={tr('Kaise bik raha hai')} description={tr('Karobari din ke hisaab se, is branch ki sale')}
          actions={<div className="flex flex-wrap gap-2">
            <Segmented<'revenue' | 'qty' | 'profit'> label={tr('Kya dikhayein')} value={metric} onChange={setMetric}
              items={[{ value: 'revenue', label: tr('Amount') }, { value: 'qty', label: tr('Quantity') }, ...(costHidden ? [] : [{ value: 'profit' as const, label: tr('Profit') }])]} />
            <Segmented<string> label={tr('Period')} value={String(days)} onChange={(v) => setDays(Number(v))}
              items={[{ value: '7', label: '7d' }, { value: '30', label: '30d' }, { value: '90', label: '90d' }, { value: '365', label: tr('1 saal') }]} />
          </div>}>
          {!ins ? <Skeleton className="h-64 rounded-xl" /> : ins.totals.bills === 0 ? <Empty text={tr('Pichhle {{days}} din mein nahi bika', { days })} /> : (
            <>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                    <defs><linearGradient id="pd-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={theme.primary} stopOpacity={0.28} /><stop offset="100%" stopColor={theme.primary} stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid stroke={theme.grid} vertical={false} />
                    <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                    <YAxis tick={theme.axis} axisLine={false} tickLine={false} width={44} tickFormatter={metric === 'qty' ? undefined : axisMoney} allowDecimals={metric !== 'qty'} />
                    <Tooltip formatter={(v) => [metric === 'qty' ? `${fmt(Number(v))} ${p.unit}` : formatPKR(Number(v)), metric === 'qty' ? tr('Quantity') : metric === 'profit' ? tr('Profit') : tr('Amount')]} contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} />
                    <Area type="monotone" dataKey={metric} stroke={theme.primary} strokeWidth={2.25} fill="url(#pd-fill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Tile label={tr('Bika')} value={`${fmt(ins.totals.qty)} ${p.unit}`} hint={tr('roz ~{{perDay}}', { perDay: fmt(ins.totals.perDay) })} />
                <Tile label={tr('Amount')} value={money(ins.totals.revenue)} hint={tr('{{bills}} bill', { bills: ins.totals.bills })} />
                <Tile label={tr('Profit')} value={cost(ins.totals.profit)} />
                <Tile label={tr('Shuru se')} value={`${fmt(ins.allTime.qty)} ${p.unit}`} hint={ins.allTime.lastSoldAt ? tr('aakhri {{lastSoldAt}}', { lastSoldAt: when(ins.allTime.lastSoldAt) }) : tr('kabhi nahi bika')} />
              </div>
            </>
          )}
        </Card>
        {images.length > 1 && (
          <Card className="rounded-2xl" title={tr('Tasveerein')} description={tr('Pehli tasveer POS aur store par dikhti hai')}>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {images.map((img) => <img key={img.id} src={img.url} alt="" className="aspect-square w-full rounded-xl object-cover ring-1 ring-slate-200" />)}
            </div>
          </Card>
        )}
      </div>
      <div className="space-y-4">
        <Card className="rounded-2xl" title={tr('Qeemat aur details')}>
          <dl className="space-y-0.5 text-[0.8125rem]">
            {prices.map(([l, v]) => <div key={l} className="flex justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0"><dt className="text-slate-500">{l}</dt><dd className="text-end font-medium text-slate-800">{v}</dd></div>)}
          </dl>
          {p.description && <p className="mt-3 whitespace-pre-line text-[0.8125rem] text-slate-600">{p.description}</p>}
        </Card>
        {(ins?.shops.length ?? 0) > 1 && <BranchStock shops={ins!.shops} shopId={shopId} unit={p.unit} />}
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-brand-600" />{tr('Kaun zyada leta hai')}</span>} flush>
          {!ins?.customers.length ? <Empty text={tr('Naam wale customer ne nahi liya')} /> : (
            <ul className="divide-y divide-slate-100 pb-1">
              {ins.customers.map((c) => (
                <li key={c.id}><Link to={`/customers/${c.id}`} className="flex justify-between px-4 py-2.5 text-[0.8125rem] hover:bg-slate-50 sm:px-5"><span className="truncate text-slate-800">{c.name}</span><span className="text-slate-500">{tr('{{bills}} bill', { bills: c.bills })}</span></Link></li>
              ))}
            </ul>
          )}
        </Card>
        {units.some((u) => u.isActive) && <PackCalculator units={units.filter((u) => u.isActive)} unit={p.unit} stock={stock} money={money} />}
      </div>
    </div>
  );
}

function BranchStock({ shops, shopId, unit }: { shops: ProductInsights['shops']; shopId?: string; unit: string }) {
  const total = shops.reduce((s, x) => s + x.stock, 0);
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Store className="h-4 w-4 text-brand-600" />{tr('Har branch ka stock')}</span>} description={tr('Kul {{total}} {{unit}}', { total: fmt(total), unit })}>
      <ul className="space-y-1 text-[0.8125rem]">
        {shops.map((s) => (
          <li key={s.shopId} className={cn('flex justify-between rounded-lg px-2 py-1.5', s.shopId === shopId && 'bg-brand-50')}>
            <span className="text-slate-700">{s.name}{s.shopId === shopId && <span className="ms-1.5 text-[0.6875rem] font-semibold text-brand-700">{tr('yeh branch')}</span>}</span>
            <span className={cn('font-semibold tabular-nums', s.stock <= 0 ? 'text-rose-600' : s.stock <= s.lowStockAlert ? 'text-amber-700' : 'text-slate-900')}>{fmt(s.stock)} {unit}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function PackCalculator({ units, unit, stock, money }: { units: ProductUnit[]; unit: string; stock: number; money: Money }) {
  const [unitId, setUnitId] = useState(units[0].id);
  const [qty, setQty] = useState(1);
  const u = units.find((x) => x.id === unitId) ?? units[0];
  const base = qty * u.conversionRate;
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-brand-600" />{tr('Hisaab lagayein')}</span>} description={tr('Packing mein kitna bana aur kitne ka')}>
      <div className="flex gap-2">
        <input inputMode="decimal" aria-label={tr('Kitne')} value={qty || ''} onChange={(e) => setQty(Number(e.target.value.replace(/[^\d.]/g, '')))} className="h-10 w-20 rounded-xl border border-slate-200 bg-white px-3 tabular-nums" />
        <select aria-label={tr('Packing')} value={unitId} onChange={(e) => setUnitId(e.target.value)} className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-[0.875rem]">{units.map((x) => <option key={x.id} value={x.id}>{x.unitName}</option>)}</select>
      </div>
      <dl className="mt-3 space-y-1 text-[0.8125rem]">
        <div className="flex justify-between"><dt className="text-slate-500">{tr('Yani')}</dt><dd className="tabular-nums">{fmt(base)} {unit}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">{tr('Qeemat')}</dt><dd className="font-semibold tabular-nums">{money(qty * u.price)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">{tr('Is ke baad stock')}</dt><dd className={cn('tabular-nums', stock - base < 0 && 'text-rose-600')}>{fmt(stock - base)} {unit}</dd></div>
      </dl>
    </Card>
  );
}

/* ─────────────────────────── Stock & movements ─────────────────────────── */

export function StockTab({ product: p, insights: ins, stock, shopId, canAdjust, canBuy, onAdjust }: {
  product: Product; insights?: ProductInsights; stock: number; shopId?: string; canAdjust: boolean; canBuy: boolean; onAdjust: () => void;
}) {
  const [dir, setDir] = useState<'all' | 'in' | 'out'>('all');
  const moves = (ins?.movements ?? []).filter((m) => dir === 'all' || (dir === 'in') === isInward(m.type));
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4">
        <Card className="rounded-2xl" title={tr('Abhi ka stock')} description={tr('Stock sirf Adjustment, Purchase aur Sale se badalta hai — har badlao ka record rehta hai')}>
          <p className={cn('text-[2rem] font-bold leading-tight tabular-nums', stock <= 0 ? 'text-rose-700' : stock <= p.lowStockAlert ? 'text-amber-700' : 'text-slate-900')}>
            {fmt(stock)} <span className="text-[0.875rem] font-medium text-slate-500">{p.unit}</span>
          </p>
          <p className="text-[0.75rem] text-slate-500">{tr('Kam stock ki had {{lowStockAlert}} {{unit}}{{value}}', { lowStockAlert: fmt(p.lowStockAlert), unit: p.unit, value: ins?.totals.daysLeft != null && stock > 0 ? tr(' · ~{{daysLeft}} din chalega', { daysLeft: ins.totals.daysLeft }) : '' })}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {canAdjust && <button type="button" onClick={onAdjust} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-brand-fg hover:bg-brand-700"><Plus className="h-4 w-4" />{tr('Stock badlein')}</button>}
            {canAdjust && <Link to="/stock-adjustments" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><ClipboardList className="h-4 w-4" />{tr('Adjustments')}</Link>}
            {canBuy && <Link to="/purchases/new" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Truck className="h-4 w-4" />{tr('Purchase')}</Link>}
          </div>
        </Card>
        {(ins?.shops.length ?? 0) > 0 && <BranchStock shops={ins!.shops} shopId={shopId} unit={p.unit} />}
      </div>
      <Card className="rounded-2xl lg:col-span-2" flush title={tr('Stock ki movements')} description={tr('Is cheez ki aakhri 60 tabdeeliyan, is branch mein')}
        actions={<Segmented<'all' | 'in' | 'out'> label={tr('Kaunsi')} value={dir} onChange={setDir} items={[{ value: 'all', label: tr('Sab') }, { value: 'in', label: tr('Andar') }, { value: 'out', label: tr('Bahar') }]} />}>
        {!ins ? <div className="p-5"><Skeleton className="h-40 rounded-xl" /></div> : !moves.length ? <Empty text={tr('Abhi koi tabdeeli nahi')} /> : (
          <ul className="divide-y divide-slate-100">
            {moves.map((m) => {
              const t = MOVE[m.type] ?? { label: m.type, tone: 'text-slate-700' };
              const inward = isInward(m.type);
              return (
                <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-[0.8125rem] sm:px-5">
                  <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', inward ? 'bg-success-50 text-success-700' : 'bg-rose-50 text-rose-700')}>
                    {inward ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block font-medium', t.tone)}>{t.label}</span>
                    <span className="block truncate text-[0.75rem] text-slate-500">{[when(m.createdAt), m.note, m.reference, m.shop?.name].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className={cn('w-20 text-end font-semibold tabular-nums', inward ? 'text-success-700' : 'text-rose-700')}>{inward ? '+' : '−'}{fmt(Math.abs(m.quantity))}</span>
                  <span className="hidden w-20 text-end tabular-nums text-slate-600 sm:block">= {fmt(m.balanceAfter)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ─────────────────────────── Sales ─────────────────────────── */

export function SalesTab({ insights: ins, money }: { insights?: ProductInsights; money: Money }) {
  return (
    <Card className="rounded-2xl" title={tr('Aakhri bill')} description={tr('Is cheez ke saath bane aakhri 30 bill — dabayein to bill khulega')} flush>
      {!ins ? <div className="p-5"><Skeleton className="h-40 rounded-xl" /></div> : !ins.recent.length ? <Empty text={tr('Abhi tak nahi bika')} /> : (
        <ul className="divide-y divide-slate-100">
          {ins.recent.map((r) => (
            <li key={r.id}>
              <Link to={`/sales/${r.saleId}/receipt`} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2.5 text-[0.8125rem] hover:bg-slate-50 sm:px-5">
                <span className="w-28 shrink-0 font-mono font-semibold text-slate-900">{r.saleNumber}</span>
                <span className="w-32 shrink-0 text-slate-500">{when(r.soldAt)}</span>
                <span className="min-w-0 flex-1 truncate text-slate-700">{r.customer?.name ?? tr('Walk-in')}{r.status === 'VOIDED' && <span className="ms-2 text-rose-600">{tr('void')}</span>}{r.returnedQty > 0 && <span className="ms-2 text-amber-700">{tr('{{returnedQty}} return', { returnedQty: fmt(r.returnedQty) })}</span>}</span>
                <span className="tabular-nums text-slate-600">{fmt(r.qty)} × {money(r.price)}</span>
                <span className="w-24 text-end font-semibold tabular-nums text-slate-900">{money(r.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ─────────────────────────── Purchases ─────────────────────────── */

const PO_STATUS: Record<string, { label: string; tone: string }> = {
  RECEIVED: { label: tr('Aa gaya'), tone: 'bg-success-50 text-success-700' }, PARTIAL: { label: tr('Kuch aaya'), tone: 'bg-amber-50 text-amber-800' },
  PENDING: { label: tr('Order'), tone: 'bg-sky-50 text-sky-700' }, CANCELLED: { label: tr('Cancel'), tone: 'bg-slate-100 text-slate-500' },
};

export function PurchasesTab({ product: p, cost, canBuy, canSuppliers }: { product: Product; cost: Money; canBuy: boolean; canSuppliers: boolean }) {
  const q = useQuery({ queryKey: ['product-purchases', p.id], queryFn: () => productInsightsApi.purchases(p.id) });
  const d = q.data;
  if (q.isLoading) return <Skeleton className="h-72 rounded-2xl" />;
  if (q.isError || !d) return <Card className="rounded-2xl"><Empty text={tr('Purchase ka record nahi khul saka')} /></Card>;
  const variantName = new Map((p.variants ?? []).map((v) => [v.id, v.name]));
  const costDrift = d.totals.lastCost !== null && p.costPrice > 0 && Math.abs(d.totals.lastCost - p.costPrice) / p.costPrice > 0.02;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={tr('Kul purchase')} value={`${fmt(d.totals.qty)} ${p.unit}`} hint={tr('{{bills}} bill{{value}}', { bills: d.totals.bills, value: d.totals.returned ? tr(' · {{returned}} return', { returned: fmt(d.totals.returned) }) : '' })} />
        <Tile label={tr('Amount')} value={cost(d.totals.amount)} />
        <Tile label={tr('Aakhri cost')} value={d.totals.lastCost === null ? '—' : cost(d.totals.lastCost)} hint={d.totals.lastAt ? tr('fi {{unit}} · {{lastAt}}', { unit: p.unit, lastAt: day(d.totals.lastAt) }) : undefined} />
        <Tile label={tr('Ausat cost')} value={d.totals.avgCost === null ? '—' : cost(d.totals.avgCost)} hint={tr('fi {{unit}}', { unit: p.unit })} />
      </div>
      {costDrift && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] font-medium text-amber-900 ring-1 ring-amber-200">
          {tr('Aakhri purchase {{cost}} fi {{unit}} par hui, product par cost {{costPrice}} likhi hai — profit ka hisaab isi cost se banta hai.', { cost: cost(d.totals.lastCost!), unit: p.unit, costPrice: cost(p.costPrice) })}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2" flush title={tr('Purchase bill')} description={tr('Aakhri 50 lines — dabayein to bill khulega')}
          actions={canBuy ? <Link to="/purchases/new" className={linkCls}>{tr('Nayi purchase →')}</Link> : undefined}>
          {!d.recent.length ? <Empty text={tr('Yeh cheez abhi tak purchase nahi hui')} /> : (
            <div className="overflow-x-auto">
              <Table minWidth="44rem" className="[&>table]:text-[0.8125rem]">
                <THead><Tr className={head}><Th className="px-5 py-2.5">{tr('Bill')}</Th><Th className={cn('p-0', th)}>{tr('Supplier')}</Th><Th className={cn('p-0', `${th} text-end`)}>{tr('Quantity')}</Th><Th className={cn('p-0', `${th} text-end`)}>{tr('Cost')}</Th><Th className={cn('p-0', `${th} text-end`)}>{tr('Amount')}</Th><Th className="px-5 py-2.5">{tr('Halat')}</Th></Tr></THead>
                <TBody className="divide-y divide-slate-100">
                  {d.recent.map((l) => {
                    const st = PO_STATUS[l.status] ?? { label: l.status, tone: 'bg-slate-100 text-slate-600' };
                    return (
                      <Tr key={l.id} className={cn(l.status === 'CANCELLED' && 'opacity-60')}>
                        <Td className="text-inherit px-5 py-2"><Link to={`/purchases/${l.purchaseId}`} className="font-mono font-semibold text-brand-700 hover:underline">{l.purchaseNumber}</Link><span className="block text-[0.6875rem] text-slate-500">{day(l.purchasedAt)}{l.shop ? ` · ${l.shop}` : ''}</span></Td>
                        <Td className={cn('p-0 text-inherit', th)}>{l.supplier?.name ?? '—'}{l.variantId && variantName.get(l.variantId) && <span className="block text-[0.6875rem] text-slate-500">{variantName.get(l.variantId)}</span>}</Td>
                        <Td className={cn('p-0 text-inherit', `${th} text-end tabular-nums`)}>{fmt(l.quantity)} {l.unitName}{l.conversionRate !== 1 && <span className="block text-[0.6875rem] text-slate-500">= {fmt(l.baseQuantity)} {p.unit}</span>}</Td>
                        <Td className={cn('p-0 text-inherit', `${th} text-end tabular-nums`)}>{cost(l.costPrice)}</Td>
                        <Td className={cn('p-0 text-inherit', `${th} text-end font-semibold tabular-nums`)}>{cost(l.total)}</Td>
                        <Td className="text-inherit px-5 py-2"><span className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold', st.tone)}>{st.label}</span>{l.returnedQty > 0 && <span className="ms-1 text-[0.6875rem] text-amber-700">{tr('{{returnedQty}} return', { returnedQty: fmt(l.returnedQty) })}</span>}{l.batchNo && <span className="block font-mono text-[0.6875rem] text-slate-500">{l.batchNo}</span>}</Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          )}
        </Card>
        <Card className="rounded-2xl" flush title={<span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-brand-600" />{tr('Kis se aata hai')}</span>}>
          {!d.suppliers.length ? <Empty text={tr('Abhi koi supplier nahi')} /> : (
            <ul className="divide-y divide-slate-100 pb-1">
              {d.suppliers.map((s) => (
                <li key={s.id}>
                  {(() => {
                    const body = <><span className="truncate text-slate-800">{s.name}</span><span className="shrink-0 text-slate-500">{tr('{{bills}} bill{{value}}', { bills: s.bills, value: s.lastAt ? ` · ${day(s.lastAt)}` : '' })}</span></>;
                    const cls = 'flex justify-between gap-3 px-4 py-2.5 text-[0.8125rem] sm:px-5';
                    return canSuppliers ? <Link to={`/suppliers/${s.id}`} className={cn(cls, 'hover:bg-slate-50')}>{body}</Link> : <div className={cls}>{body}</div>;
                  })()}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────────────── Batches ─────────────────────────── */

/** Where the product is bought: each supplier with code, usual and last cost, minimum order, delivery days and the last real purchases. */
export function SuppliersTab({ product: p, cost, costHidden, canEdit, editPath, canBuy }: {
  product: Product; cost: Money; costHidden: boolean; canEdit: boolean; editPath: string; canBuy: boolean;
}) {
  const q = useQuery({ queryKey: ['product-suppliers', p.id], queryFn: () => productSuppliersApi.list(p.id) });
  if (q.isLoading) return <Skeleton className="h-60 rounded-2xl" />;
  const items = q.data?.items ?? [];
  const linkCls = 'text-[0.8125rem] font-semibold text-brand-700 hover:underline';
  return (
    <Card className="rounded-2xl" flush title={tr('Suppliers')} description={tr('Kis se aur kitne me aata hai — cost fi {{unit}}', { unit: p.unit })}
      actions={canEdit ? <Link to={editPath} className={linkCls}>{tr('Badlein →')}</Link> : undefined}>
      {!items.length ? <Empty text={tr('Abhi koi supplier nahi — product badlein ya purchase karein, supplier khud jur jayega')} /> : (
        <ul className="divide-y divide-slate-100">
          {items.map((l) => (
            <li key={l.id} className="px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/suppliers/${l.supplierId}`} className="font-semibold text-slate-900 hover:text-brand-700">{l.supplier.name}</Link>
                {l.isPreferred && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-brand-700 ring-1 ring-brand-200">{tr('Preferred')}</span>}
                {l.supplierSku && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.6875rem] text-slate-600">{l.supplierSku}</span>}
                {l.supplier.phone && <span className="text-[0.75rem] text-slate-500">{l.supplier.phone}</span>}
                {canBuy && <Link to={`/purchases/new?supplier=${l.supplierId}`} className={cn(linkCls, 'ms-auto')}>{tr('Order banayein →')}</Link>}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-slate-600">
                {!costHidden && <span>{tr('Aam cost:')} <b className="tabular-nums">{l.costPrice ? cost(l.costPrice) : '—'}</b></span>}
                {!costHidden && <span>{tr('Pichhli:')} <b className="tabular-nums">{l.lastPurchasePrice ? cost(l.lastPurchasePrice) : '—'}</b>{l.lastPurchasedAt ? ` · ${day(l.lastPurchasedAt)}` : ''}</span>}
                {l.minOrderQty ? <span>{tr('Kam se kam: {{qty}} {{unit}}', { qty: fmt(l.minOrderQty), unit: p.unit })}</span> : null}
                {l.leadDays != null ? <span>{tr('{{days}} din me aata hai', { days: l.leadDays })}</span> : null}
                {l.unit && <span>{tr('Aksar {{unit}} me', { unit: l.unit.unitName })}</span>}
              </div>
              {l.purchases.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {l.purchases.map((b) => (
                    <Link key={b.purchaseId + b.unitName + b.quantity} to={`/purchases/${b.purchaseId}`} className="rounded-lg bg-slate-50 px-2 py-1 text-[0.6875rem] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100">
                      <span className="font-mono font-semibold text-slate-800">{b.purchaseNumber}</span> · {day(b.purchasedAt)} · {fmt(b.quantity)} {b.unitName}{!costHidden && b.costPrice != null ? ` @ ${cost(b.costPrice)}` : ''}
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function BatchesTab({ product: p }: { product: Product }) {
  const today = todayKey();
  const soon = soonKey();
  const rows = [...(p.batches ?? [])].sort((a, b) => String((a as { expiryDate?: string }).expiryDate ?? '9').localeCompare(String((b as { expiryDate?: string }).expiryDate ?? '9')));
  return (
    <Card className="rounded-2xl" flush title={tr('Batch aur expiry')} description={tr('Jo pehle expire ho woh pehle bechein — batch purchase ke waqt bante hain')}>
      {!rows.length ? <Empty text={tr('Abhi koi batch nahi. Purchase karte waqt batch number aur expiry likhein.')} /> : (
        <div className="overflow-x-auto">
          <Table minWidth="36rem" className="[&>table]:text-[0.8125rem]">
            <THead><Tr className={head}><Th className="px-5 py-2.5">{tr('Batch')}</Th><Th className={cn('p-0', th)}>{tr('Bani')}</Th><Th className={cn('p-0', th)}>{tr('Expiry')}</Th><Th className={cn('p-0', `${th} text-end`)}>{tr('Baqi')}</Th><Th className="px-5 py-2.5">{tr('Halat')}</Th></Tr></THead>
            <TBody className="divide-y divide-slate-100">
              {rows.map((b) => {
                const r = b as unknown as { batchNumber: string; manufactureDate?: string; expiryDate?: string; isActive?: boolean };
                const exp = r.expiryDate?.slice(0, 10);
                const tone = !exp ? 'text-slate-500' : exp < today ? 'text-rose-700' : exp <= soon ? 'text-amber-700' : 'text-success-700';
                return (
                  <Tr key={b.id} className={cn((b.quantity <= 0 || r.isActive === false) && 'opacity-60')}>
                    <Td className="text-inherit px-5 py-2.5 font-mono">{r.batchNumber}</Td>
                    <Td className={cn('p-0', `${th} text-slate-600`)}>{r.manufactureDate ? new Date(r.manufactureDate).toLocaleDateString('en-PK') : '—'}</Td>
                    <Td className={cn('p-0 text-inherit', th, 'font-medium', tone)}>{exp ? new Date(exp).toLocaleDateString('en-PK') : '—'}</Td>
                    <Td className={cn('p-0 text-inherit', `${th} text-end tabular-nums`)}>{fmt(b.quantity)} {p.unit}</Td>
                    <Td className={cn('text-inherit', 'px-5 py-2.5 font-medium', tone)}>{b.quantity <= 0 ? tr('Khatam') : !exp ? tr('Expiry nahi') : exp < today ? tr('Expire ho gaya') : exp <= soon ? tr('Qareeb') : tr('Theek')}</Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

/* ─────────────────────────── Packing & variants ─────────────────────────── */

export function UnitsTab({ product: p, units, stock, money, cost, costHidden }: {
  product: Product; units: ProductUnit[]; stock: number; money: Money; cost: Money; costHidden: boolean;
}) {
  const variants = p.variants ?? [];
  // Tier columns appear only when some pack has its own tier price.
  const tiers = { wholesale: units.some((u) => Number(u.wholesalePrice) > 0), credit: units.some((u) => Number(u.creditPrice) > 0) };
  return (
    <div className="space-y-4">
      {units.length > 0 && (
        <Card className="rounded-2xl" flush title={tr('Packing')} description={tr('Har packing ka apna rate aur barcode — stock asal unit mein ginta hai')}>
          <div className="overflow-x-auto">
            <Table minWidth="40rem" className="[&>table]:text-[0.8125rem]">
              <THead><Tr className={head}><Th className="px-5 py-2.5">{tr('Packing')}</Th><Th className={cn('p-0', `${th} text-end`)}>{tr('Kitne {{unit}}', { unit: p.unit })}</Th><Th className={cn('p-0', `${th} text-end`)}>{tr('Rate')}</Th>{tiers.wholesale && <Th className={cn('p-0', `${th} text-end`)}>{tr('Wholesale')}</Th>}{tiers.credit && <Th className={cn('p-0', `${th} text-end`)}>{tr('Credit')}</Th>}{!costHidden && <Th className={cn('p-0', `${th} text-end`)}>{tr('Cost')}</Th>}<Th className={cn('p-0', `${th} text-end`)}>{tr('Fi {{unit}}', { unit: p.unit })}</Th><Th className={cn('p-0', th)}>{tr('Barcode')}</Th><Th className="px-5 py-2.5 text-end">{tr('Stock mein')}</Th></Tr></THead>
              <TBody className="divide-y divide-slate-100">
                {units.map((u) => (
                  <Tr key={u.id} className={cn(!u.isActive && 'opacity-60')}>
                    <Td className="px-5 py-2.5 font-medium text-slate-900">{u.unitName}{u.isBase && <span className="ms-1.5 rounded bg-brand-50 px-1.5 text-[0.6875rem] text-brand-700">{tr('asal')}</span>}{!u.isActive && <span className="ms-1.5 rounded bg-slate-100 px-1.5 text-[0.6875rem] text-slate-500">{tr('band')}</span>}</Td>
                    <Td className={cn('p-0 text-inherit', `${th} text-end tabular-nums`)}>{fmt(u.conversionRate)}</Td>
                    <Td className={cn('p-0 text-inherit', `${th} text-end font-semibold tabular-nums`)}>{money(u.price)}</Td>
                    {tiers.wholesale && <Td className={cn('p-0', `${th} text-end tabular-nums text-slate-600`)}>{Number(u.wholesalePrice) > 0 ? money(Number(u.wholesalePrice)) : '—'}</Td>}
                    {tiers.credit && <Td className={cn('p-0', `${th} text-end tabular-nums text-slate-600`)}>{Number(u.creditPrice) > 0 ? money(Number(u.creditPrice)) : '—'}</Td>}
                    {!costHidden && <Td className={cn('p-0', `${th} text-end tabular-nums text-slate-600`)}>{cost(u.costPrice)}</Td>}
                    <Td className={cn('p-0', `${th} text-end tabular-nums text-slate-600`)}>{money(u.conversionRate ? u.price / u.conversionRate : 0)}</Td>
                    <Td className={cn('p-0', `${th} font-mono text-[0.75rem] text-slate-600`)}>{u.barcode ?? '—'}</Td>
                    <Td className="text-inherit px-5 py-2.5 text-end tabular-nums">{u.conversionRate ? Math.floor(stock / u.conversionRate) : '—'}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        </Card>
      )}
      {variants.length > 0 && (
        <div>
          <p className="mb-2 text-[0.8125rem] font-semibold text-slate-700">{tr('Variants')}{' '} <span className="font-normal text-slate-500">{tr('· har ek ka apna stock aur rate')}</span></p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {variants.map((v) => {
              const hex = (v as { colorHex?: string }).colorHex;
              const code = (v as { barcode?: string }).barcode;
              return (
                <div key={v.id} className={cn('rounded-2xl bg-white p-4 shadow-sm ring-1', v.stock <= 0 ? 'ring-rose-200' : v.stock <= v.lowStockAlert ? 'ring-amber-200' : 'ring-slate-200/80')}>
                  <div className="flex items-center gap-2">{hex && <span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ backgroundColor: hex }} />}<p className="font-semibold text-slate-900">{v.name}</p>{!v.isActive && <span className="text-[0.6875rem] text-slate-400">{tr('band')}</span>}</div>
                  <p className="mt-1 text-[1.125rem] font-bold tabular-nums">{money(v.price)}</p>
                  <p className={cn('text-[0.8125rem] font-medium', v.stock <= 0 ? 'text-rose-600' : v.stock <= v.lowStockAlert ? 'text-amber-700' : 'text-slate-600')}>{tr('{{stock}} {{unit}} stock', { stock: fmt(v.stock), unit: p.unit })}</p>
                  {code && <p className="mt-1 font-mono text-[0.6875rem] text-slate-500">{code}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
