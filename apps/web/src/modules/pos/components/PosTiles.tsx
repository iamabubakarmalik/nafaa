/**
 * Catalog tiles for the POS grid: products, combos, quick keys, plus the
 * view tabs and empty state. Cards show what the counter needs at a glance:
 * price, stock left, how many are already in the bill, and industry badges.
 */

import type { ComponentType, ReactNode } from 'react';
import { Minus, Package, Plus, Sparkles, Star, type LucideIcon } from 'lucide-react';
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

interface PosItemProps {
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
  /** Remove one from the bill (shows a stepper on items already in the bill). */
  onDecrement?: () => void;
  /** Shown when there is no image. */
  fallback?: ReactNode;
  /** Tile background when there is no image (Tailwind gradient classes). */
  tint?: string;
  category?: string;
}

const qtyText = (n: number) => String(Number(n.toFixed(2)));

function StockPill({ stock, low, unit, className }: { stock: number; low: boolean; unit: string; className?: string }) {
  const out = stock <= 0;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold tabular-nums backdrop-blur',
      out ? 'bg-slate-900/80 text-white' : low ? 'bg-amber-500/95 text-white' : 'bg-white/85 text-slate-700 ring-1 ring-black/5', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', out ? 'bg-rose-400' : low ? 'bg-white' : 'bg-success-500')} />
      {out ? 'Khatam' : `${qtyText(stock)} ${isWeightUnit(unit) ? unit : 'baqi'}`}
    </span>
  );
}

function Stepper({ qty, onAdd, onRemove, size = 'md' }: { qty: number; onAdd: () => void; onRemove: () => void; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 'h-8' : 'h-9';
  return (
    <span className={cn('inline-flex items-center overflow-hidden rounded-full bg-brand-600 text-brand-fg shadow-md shadow-brand-600/25', h)} onClick={(e) => e.stopPropagation()}>
      <span role="button" tabIndex={0} aria-label="Ek kam" onClick={onRemove} onKeyDown={(e) => e.key === 'Enter' && onRemove()}
        className={cn('flex items-center justify-center transition hover:bg-black/10', size === 'sm' ? 'w-8' : 'w-9')}><Minus className="h-4 w-4" /></span>
      <span className="min-w-6 text-center text-[0.875rem] font-bold tabular-nums">{qtyText(qty)}</span>
      <span role="button" tabIndex={0} aria-label="Ek aur" onClick={onAdd} onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        className={cn('flex items-center justify-center transition hover:bg-black/10', size === 'sm' ? 'w-8' : 'w-9')}><Plus className="h-4 w-4" /></span>
    </span>
  );
}

/** Product card for the POS grid. */
export function PosItemCard({ name, image, price, unit, stock, lowStock, inCart, featured, badges, subline, hidePrices, dim, onClick, onDecrement, fallback, tint }: PosItemProps) {
  const out = stock !== undefined && stock <= 0;
  const low = !out && stock !== undefined && lowStock !== undefined && stock <= lowStock;
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      aria-label={`${name}, ${hidePrices ? '' : formatPKR(price)}`}
      className={cn(
        'group relative flex cursor-pointer select-none flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition duration-200',
        'hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:translate-y-0 active:scale-[0.99]',
        inCart > 0 ? 'ring-2 ring-brand-500 shadow-brand-500/10' : 'ring-slate-200/80 hover:ring-slate-300',
        (dim || out) && 'opacity-60 saturate-50',
      )}>
      <div className={cn('relative aspect-[5/4] w-full overflow-hidden', !image && 'bg-gradient-to-br', !image && (tint ?? 'from-slate-100 to-slate-200'))}>
        {image ? (
          <img src={image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/40 blur-2xl" aria-hidden />
            <span className="relative text-5xl drop-shadow-md transition duration-300 group-hover:scale-110 sm:text-[3.25rem]">{fallback ?? <Package className="h-10 w-10 text-slate-400" />}</span>
          </div>
        )}
        <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-1">
          <div className="flex flex-col items-start gap-1">
            {featured && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-white shadow"><Star className="h-3.5 w-3.5 fill-current" /></span>}
            {badges?.map((b) => (
              <span key={b.label} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide shadow-sm', BADGE[b.tone])}>
                {b.icon && <b.icon className="h-3 w-3" />}{b.label}
              </span>
            ))}
          </div>
          {stock !== undefined && <StockPill stock={stock} low={low} unit={unit} />}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="line-clamp-2 min-h-[2.4rem] text-[0.875rem] font-semibold leading-tight text-slate-900">{name}</p>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[1.0625rem] font-bold tabular-nums leading-none tracking-tight text-brand-700">{hidePrices ? '••••' : formatPKR(price)}</div>
            <div className="mt-1 truncate text-[0.6875rem] text-slate-500">{subline ?? `per ${unit}`}</div>
          </div>
          {inCart > 0 && onDecrement ? (
            <Stepper qty={inCart} onAdd={onClick} onRemove={onDecrement} size="sm" />
          ) : (
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition',
              inCart > 0 ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-600 group-hover:bg-brand-600 group-hover:text-brand-fg')}>
              {inCart > 0 ? <span className="text-[0.75rem] font-bold tabular-nums">{qtyText(inCart)}</span> : <Plus className="h-4 w-4" />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Dense row for the POS list view: many products on screen, fastest to scan by eye. */
export function PosItemRow({ name, image, price, unit, stock, lowStock, inCart, badges, subline, hidePrices, dim, onClick, onDecrement, fallback, tint }: PosItemProps) {
  const out = stock !== undefined && stock <= 0;
  const low = !out && stock !== undefined && lowStock !== undefined && stock <= lowStock;
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      className={cn('group flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 transition hover:shadow-md',
        inCart > 0 ? 'ring-2 ring-brand-500' : 'ring-slate-200/80 hover:ring-slate-300', (dim || out) && 'opacity-60')}>
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-2xl', !image && 'bg-gradient-to-br', !image && (tint ?? 'from-slate-100 to-slate-200'))}>
        {image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" /> : fallback ?? <Package className="h-5 w-5 text-slate-400" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[0.875rem] font-semibold text-slate-900">{name}</span>
          {badges?.slice(0, 2).map((b) => (
            <span key={b.label} className={cn('hidden shrink-0 rounded-full px-1.5 py-0.5 text-[0.5625rem] font-semibold uppercase sm:inline', BADGE[b.tone])}>{b.label}</span>
          ))}
        </span>
        <span className="block truncate text-[0.75rem] text-slate-500">{subline ?? `per ${unit}`}</span>
      </span>
      {stock !== undefined && (
        <span className={cn('hidden w-20 shrink-0 text-right text-[0.8125rem] font-medium tabular-nums sm:block', out ? 'text-rose-600' : low ? 'text-amber-600' : 'text-slate-500')}>
          {out ? 'Khatam' : `${qtyText(stock)} ${isWeightUnit(unit) ? unit : ''}`}
        </span>
      )}
      <span className="w-24 shrink-0 text-right text-[0.9375rem] font-bold tabular-nums text-slate-900">{hidePrices ? '••••' : formatPKR(price)}</span>
      {inCart > 0 && onDecrement
        ? <Stepper qty={inCart} onAdd={onClick} onRemove={onDecrement} size="sm" />
        : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition group-hover:bg-brand-600 group-hover:text-brand-fg"><Plus className="h-4 w-4" /></span>}
    </div>
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
      fallback={<span>🎁</span>}
      tint="from-violet-100 to-fuchsia-200 dark:from-violet-500/20 dark:to-fuchsia-500/10"
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
      className={cn('inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold transition',
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
