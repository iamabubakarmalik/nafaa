/**
 * Catalog tiles for the POS grid: products, combos, quick keys, plus the
 * view tabs and empty state. Cards show what the counter needs at a glance:
 * price, stock left, how many are already in the bill, and industry badges.
 */

import type { ComponentType, ReactNode } from 'react';
import { Package, Sparkles, Star, type LucideIcon } from 'lucide-react';
import { Button } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { isWeightUnit } from '../lib/posUnits';
import type { PosCartLine } from '../lib/posCart';

export type PosBadgeTone = 'danger' | 'warning' | 'info' | 'success' | 'neutral' | 'brand';

export interface PosBadge {
  label: string;
  tone: PosBadgeTone;
  icon?: LucideIcon;
}

const BADGE: Record<PosBadgeTone, string> = {
  danger: 'bg-rose-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-sky-600 text-white',
  success: 'bg-success-600 text-white',
  neutral: 'bg-slate-700 text-white',
  brand: 'bg-brand-600 text-brand-fg',
};

const fmtStock = (n: number) => String(Number(n.toFixed(2)));

/** Generic product card used by the POS engine. */
export function PosItemCard({ name, image, price, unit, stock, lowStock, inCart, featured, badges, subline, hidePrices, dim, onClick, fallback }: {
  name: string;
  image?: string;
  price: number;
  unit: string;
  /** Sellable stock; undefined hides the counter (services). */
  stock?: number;
  lowStock?: number;
  inCart: number;
  featured?: boolean;
  badges?: PosBadge[];
  subline?: ReactNode;
  hidePrices?: boolean;
  /** Greyed out but still clickable (expired, out of stock where overselling is allowed). */
  dim?: boolean;
  onClick: () => void;
  /** Shown when there is no image. */
  fallback?: ReactNode;
}) {
  const out = stock !== undefined && stock <= 0;
  const low = !out && stock !== undefined && lowStock !== undefined && stock <= lowStock;
  return (
    <button type="button" onClick={onClick}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:translate-y-0',
        inCart > 0 ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300',
        (dim || out) && 'opacity-60',
      )}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {image
          ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          : <div className="flex h-full w-full items-center justify-center">{fallback ?? <Package className="h-8 w-8 text-slate-300" />}</div>}
        <div className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
          {featured && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm"><Star className="h-3 w-3 fill-current" /></span>}
          {badges?.map((b) => (
            <span key={b.label} className={cn('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide shadow-sm', BADGE[b.tone])}>
              {b.icon && <b.icon className="h-2.5 w-2.5" />}{b.label}
            </span>
          ))}
        </div>
        {inCart > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[0.75rem] font-bold tabular-nums text-brand-fg shadow">
            {fmtStock(inCart)}
          </span>
        )}
        {(out || low) && (
          <span className={cn('absolute inset-x-0 bottom-0 py-0.5 text-center text-[0.625rem] font-semibold uppercase tracking-wide text-white', out ? 'bg-slate-800/85' : 'bg-amber-500/90')}>
            {out ? 'Stock khatam' : `Sirf ${fmtStock(stock!)} baqi`}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-2.5">
        <p className="line-clamp-2 min-h-[2.25rem] text-[0.8125rem] font-medium leading-snug text-slate-900">{name}</p>
        <div className="mt-1.5 flex items-end justify-between gap-1">
          <div className="min-w-0">
            <div className="text-[0.9375rem] font-bold tabular-nums leading-none text-slate-900">{hidePrices ? '••••' : formatPKR(price)}</div>
            <div className="mt-0.5 truncate text-[0.6875rem] text-slate-500">{subline ?? `per ${unit}`}</div>
          </div>
          {stock !== undefined && (
            <div className="shrink-0 text-right leading-none">
              <div className={cn('text-[0.8125rem] font-semibold tabular-nums', out ? 'text-rose-600' : low ? 'text-amber-600' : 'text-slate-600')}>{fmtStock(stock)}</div>
              <div className="mt-0.5 text-[0.625rem] text-slate-400">{isWeightUnit(unit) ? unit : 'baqi'}</div>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/** Product tile for pages still on their own product shape. */
export function PosProductTile({ product: p, cart, hidePrices, onClick }: { product: any; cart: PosCartLine[]; hidePrices?: boolean; onClick: () => void }) {
  const inCart = cart.filter((l) => l.productId === p.id).reduce((s, l) => s + l.baseQuantity, 0);
  return (
    <PosItemCard name={p.name} image={p.images?.[0]?.url} price={p.price} unit={p.unit} stock={p.stock}
      lowStock={p.lowStockAlert} inCart={inCart} featured={p.isFeatured} hidePrices={hidePrices} onClick={onClick} />
  );
}

export function PosComboTile({ combo, cart, hidePrices, onClick }: { combo: any; cart: PosCartLine[]; hidePrices?: boolean; onClick: () => void }) {
  const inCart = cart.filter((l) => l.comboId === combo.id).reduce((s, l) => s + l.quantity, 0);
  const savings = Number(combo.savingsAmount || 0);
  return (
    <PosItemCard
      name={combo.name}
      image={combo.imageUrl}
      price={Number(combo.comboPrice)}
      unit="combo"
      inCart={inCart}
      featured={combo.isFeatured}
      hidePrices={hidePrices}
      badges={[{ label: 'Combo', tone: 'brand', icon: Sparkles }, ...(savings > 0 ? [{ label: `Bachat ${Math.round(Number(combo.savingsPercentage || 0))}%`, tone: 'success' as const }] : [])]}
      subline={`${combo.items?.length ?? 0} cheezein${savings > 0 && !hidePrices ? ` · ${formatPKR(savings)} bachat` : ''}`}
      fallback={<Sparkles className="h-8 w-8 text-violet-300" />}
      onClick={onClick}
    />
  );
}

export function PosQuickKeyTile({ qk, products, combos, hidePrices, onClick }: { qk: any; products: any[]; combos: any[]; hidePrices?: boolean; onClick: () => void }) {
  const product = qk.productId ? products.find((p) => p.id === qk.productId) : null;
  const combo = qk.comboId ? combos.find((c) => c.id === qk.comboId) : null;
  const price = Number(product?.price ?? combo?.comboPrice ?? 0);
  const out = product ? Number(product.stock) <= 0 : false;
  return (
    <button type="button" onClick={onClick} disabled={out}
      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white p-2 text-center transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
      style={qk.color ? { borderColor: qk.color } : undefined}>
      <span className="text-2xl">{qk.emoji || qk.icon || '⚡'}</span>
      <span className="line-clamp-2 text-[0.75rem] font-medium leading-tight text-slate-900">{qk.label}</span>
      {price > 0 && <span className="text-[0.6875rem] font-semibold tabular-nums text-slate-500">{hidePrices ? '••••' : formatPKR(price)}</span>}
    </button>
  );
}

export function PosViewTab({ active, onClick, icon: Icon, label, count, shortcut }: {
  active: boolean; onClick: () => void; icon: ComponentType<{ className?: string }>; label: string; count?: number;
  shortcut?: string; color?: string; highlight?: boolean;
}) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick}
      className={cn('inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-[0.8125rem] font-semibold transition',
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
      <Icon className="h-4 w-4" />
      {label}
      {count !== undefined && <span className="tabular-nums text-slate-400">{count}</span>}
      {shortcut && <kbd className="ml-0.5 hidden rounded border border-slate-200 px-1 font-mono text-[0.625rem] text-slate-400 xl:inline">{shortcut}</kbd>}
    </button>
  );
}

export function PosEmptyState({ icon: Icon, title, hint, onClear }: { icon: ComponentType<{ className?: string }>; title: string; hint?: string; onClear?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon className="h-6 w-6" /></span>
      <p className="mt-3 text-[0.9375rem] font-semibold text-slate-800">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-[0.8125rem] text-slate-500">{hint}</p>}
      {onClear && <Button className="mt-4" variant="secondary" size="sm" onClick={onClear}>Search saaf karein</Button>}
    </div>
  );
}
