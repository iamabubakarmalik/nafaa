/** One product as a card (grid view) or a row (table view), with quick actions. */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Check, Pencil, Plus, ShoppingCart, Star, TrendingUp } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { ProductDeleteButton } from '@core/components/ProductDeleteButton';
import { ProductThumb } from '@modules/inventory/products/lib/productEmoji';
import type { CatalogItem, CatalogPage } from '../api';
import type { ProductExtras, ProductsPageConfig } from '../types';

export const qty = (n: number) => String(Number(Number(n).toFixed(2)));

const RIBBON = { red: 'bg-rose-600 text-white', amber: 'bg-amber-400 text-amber-950', violet: 'bg-violet-600 text-white' } as const;

export function stockRibbon(item: CatalogItem, extras: ProductExtras): ProductExtras['ribbon'] {
  if (extras.ribbon !== undefined) return extras.ribbon;
  if (item.status === 'out') return { text: 'Stock khatam', tone: 'red' };
  if (item.status === 'low') return { text: `Sirf ${qty(item.stock)} ${item.unit} bacha`, tone: 'amber' };
  return null;
}

/** "30 din: 12 bika · 9 din ka stock" — how the product is moving. */
export function Movement({ item, days }: { item: CatalogItem; days: number }) {
  if (item.sold30 <= 0) {
    return item.stock > 0
      ? <span className="text-slate-400">{days} din se nahi bika</span>
      : <span className="text-slate-400">Abhi koi sale nahi</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-slate-600">
      <TrendingUp className="h-3 w-3 text-success-600" />{qty(item.sold30)} bika
      {item.daysLeft !== null && (
        <span className={cn('font-semibold', item.daysLeft <= 3 ? 'text-rose-600' : item.daysLeft <= 7 ? 'text-amber-700' : 'text-slate-500')}>
          · {item.daysLeft === 0 ? 'aaj khatam' : `${item.daysLeft} din ka`}
        </span>
      )}
    </span>
  );
}

function Expiry({ item }: { item: CatalogItem }) {
  if (!item.expiry) return null;
  const days = Math.ceil((new Date(item.expiry).getTime() - Date.now()) / 86_400_000);
  if (days > 30) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold',
      days <= 0 ? 'bg-rose-100 text-rose-700' : days <= 7 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')}>
      <CalendarClock className="h-3 w-3" />{days <= 0 ? 'Expire ho gaya' : `${days} din mein expire`}
    </span>
  );
}

export function CategoryChip({ item }: { item: CatalogItem }) {
  if (!item.category) return null;
  const c = item.category.color || '#64748b';
  return <span className="max-w-[9rem] truncate rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold" style={{ backgroundColor: `${c}18`, color: c }}>{item.category.name}</span>;
}

export function TagChips({ item, names, max = 2 }: { item: CatalogItem; names: CatalogPage['tagNames']; max?: number }) {
  const tags = item.tagIds.map((id) => names[id]).filter(Boolean);
  if (!tags.length) return null;
  return (
    <>
      {tags.slice(0, max).map((t) => <span key={t.name} className="max-w-[7rem] truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-600">#{t.name}</span>)}
      {tags.length > max && <span className="text-[0.6875rem] text-slate-400">+{tags.length - max}</span>}
    </>
  );
}

interface CardProps {
  item: CatalogItem;
  config: ProductsPageConfig;
  extras: ProductExtras;
  tagNames: CatalogPage['tagNames'];
  money: (n: number) => string;
  cost: (n: number) => string;
  costHidden: boolean;
  days: number;
  selected: boolean;
  selecting: boolean;
  onToggle: () => void;
  onStock: () => void;
  onDeleted: () => void;
  can: { edit: boolean; delete: boolean; stock: boolean };
  /** Optional table columns the owner turned on. */
  cols?: { wholesale: boolean; credit: boolean };
}

function Select({ selected, onToggle, className }: { selected: boolean; onToggle: () => void; className?: string }) {
  return (
    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }} aria-pressed={selected} aria-label="Chunein"
      className={cn('flex h-6 w-6 items-center justify-center rounded-md border-2 transition', selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white/90 text-transparent hover:border-brand-500', className)}>
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </button>
  );
}

function IconAction({ to, title, children, onClick, tone = 'slate' }: { to?: string; title: string; children: ReactNode; onClick?: () => void; tone?: 'slate' | 'brand' }) {
  const cls = cn('flex h-9 w-9 items-center justify-center rounded-xl transition', tone === 'brand' ? 'text-brand-700 hover:bg-brand-50' : 'text-slate-600 hover:bg-slate-100');
  return to ? <Link to={to} title={title} aria-label={title} className={cls}>{children}</Link>
    : <button type="button" onClick={onClick} title={title} aria-label={title} className={cls}>{children}</button>;
}

export function ProductCard({ item, config, extras, tagNames, money, cost, costHidden, days, selected, selecting, onToggle, onStock, onDeleted, can }: CardProps) {
  const ribbon = stockRibbon(item, extras);
  const marginPct = item.price > 0 && item.costPrice > 0 ? ((item.price - item.costPrice) / item.price) * 100 : null;
  return (
    <article data-nav-row className={cn('group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-lg',
      selected ? 'ring-2 ring-brand-500' : 'ring-slate-200/80', !item.isActive && 'opacity-70')}>
      <Link to={config.paths.detail(item.id)} className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
        <ProductThumb name={item.name} category={item.category?.name} url={item.image} size="full" className="transition duration-300 group-hover:scale-[1.03]" />
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
          <Select selected={selected} onToggle={onToggle} className={cn(!selecting && !selected && 'opacity-0 group-hover:opacity-100 focus:opacity-100')} />
          {item.isFeatured && <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-400 text-amber-950 shadow-sm" title="Khaas"><Star className="h-3.5 w-3.5 fill-current" /></span>}
        </div>
        <div className="absolute right-2.5 top-2.5 flex flex-col items-end gap-1">
          {!item.isActive && <span className="rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-white">Band</span>}
          {extras.badges}
        </div>
        {ribbon && <span className={cn('absolute inset-x-0 bottom-0 py-1 text-center text-[0.6875rem] font-bold uppercase tracking-wide', RIBBON[ribbon.tone])}>{ribbon.text}</span>}
      </Link>

      <div className="flex flex-1 flex-col p-3.5">
        <Link to={config.paths.detail(item.id)} className="line-clamp-2 text-[0.9375rem] font-semibold leading-snug text-slate-900 hover:text-brand-700">{item.name}</Link>
        {extras.line && <div className="mt-0.5 truncate text-[0.75rem] text-slate-500">{extras.line}</div>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {extras.chips}
          <CategoryChip item={item} />
          <TagChips item={item} names={tagNames} />
          <Expiry item={item} />
        </div>
        <div className="mt-auto pt-3">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[1.125rem] font-bold leading-tight tabular-nums text-slate-900">{money(item.price)}<span className="text-[0.75rem] font-medium text-slate-500"> /{item.unit}</span></p>
              {!costHidden && item.costPrice > 0 && (
                <p className="truncate text-[0.6875rem] text-slate-500">cost {cost(item.costPrice)}{marginPct !== null && <span className={cn('font-semibold', marginPct < 0 ? 'text-rose-600' : 'text-success-700')}> · {marginPct.toFixed(0)}%</span>}</p>
              )}
            </div>
            <button type="button" onClick={can.stock ? onStock : undefined} disabled={!can.stock} title={can.stock ? 'Stock badlein' : undefined}
              className={cn('shrink-0 rounded-xl px-2.5 py-1 text-right transition enabled:hover:ring-2 enabled:hover:ring-brand-200',
                item.status === 'out' ? 'bg-rose-50 text-rose-700' : item.status === 'low' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-800')}>
              <span className="block text-[0.9375rem] font-bold tabular-nums leading-tight">{qty(item.stock)}</span>
              <span className="block text-[0.625rem] font-medium uppercase tracking-wide opacity-70">{item.unit}</span>
            </button>
          </div>
          <p className="mt-2 truncate text-[0.6875rem]"><Movement item={item} days={days} /></p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-t border-slate-100 p-1.5">
        {can.stock ? (
          <button type="button" onClick={onStock} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-50 text-[0.8125rem] font-semibold text-brand-700 transition hover:bg-brand-100">
            <Plus className="h-4 w-4" />Stock
          </button>
        ) : <Link to={config.paths.detail(item.id)} className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-slate-100 text-[0.8125rem] font-semibold text-slate-700 hover:bg-slate-200">Dekhein</Link>}
        {can.edit && <IconAction to={config.paths.edit(item.id)} title="Badlein"><Pencil className="h-4 w-4" /></IconAction>}
        <IconAction to="/pos" title="POS par bechein"><ShoppingCart className="h-4 w-4" /></IconAction>
        {extras.actions}
        {can.delete && <ProductDeleteButton id={item.id} name={item.name} onDeleted={onDeleted} className="h-9 w-9 rounded-xl" />}
      </div>
    </article>
  );
}

export function ProductRow({ item, config, extras, tagNames, money, cost, costHidden, days, selected, onToggle, onStock, onDeleted, can, cols }: CardProps) {
  const value = Math.max(0, item.stock) * item.costPrice;
  const ribbon = stockRibbon(item, extras);
  return (
    <tr data-nav-row className={cn('group transition hover:bg-slate-50/80', selected && 'bg-brand-50/50', !item.isActive && 'opacity-70')}>
      <td className="w-10 py-2.5 pl-4"><Select selected={selected} onToggle={onToggle} /></td>
      <td className="max-w-[18rem] py-2.5 pr-3">
        <Link to={config.paths.detail(item.id)} className="flex min-w-0 items-center gap-3">
          <ProductThumb name={item.name} category={item.category?.name} url={item.image} size="md" />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[0.875rem] font-semibold text-slate-900 group-hover:text-brand-700">{item.name}</span>
              {item.isFeatured && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
            </span>
            <span className="block truncate text-[0.6875rem] text-slate-500">{extras.line ?? ([item.sku, item.barcode].filter(Boolean).join(' · ') || '—')}</span>
            <span className="mt-0.5 flex flex-wrap gap-1">{extras.chips}<TagChips item={item} names={tagNames} /></span>
          </span>
        </Link>
      </td>
      <td className="px-3 py-2.5"><CategoryChip item={item} /></td>
      {!costHidden && <td className="whitespace-nowrap px-3 py-2.5 text-right text-[0.8125rem] tabular-nums text-slate-500">{item.costPrice ? cost(item.costPrice) : '—'}</td>}
      <td className="whitespace-nowrap px-3 py-2.5 text-right text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(item.price)}</td>
      {cols?.wholesale && <td className="whitespace-nowrap px-3 py-2.5 text-right text-[0.8125rem] tabular-nums text-slate-700">{Number(item.wholesalePrice) > 0 ? money(Number(item.wholesalePrice)) : <span className="text-slate-400" title="Retail price lagegi">—</span>}</td>}
      {cols?.credit && <td className="whitespace-nowrap px-3 py-2.5 text-right text-[0.8125rem] tabular-nums text-slate-700">{Number(item.creditPrice) > 0 ? money(Number(item.creditPrice)) : <span className="text-slate-400" title="Retail price lagegi">—</span>}</td>}
      <td className="whitespace-nowrap px-3 py-2.5 text-right">
        <button type="button" onClick={can.stock ? onStock : undefined} disabled={!can.stock} title={can.stock ? 'Stock badlein' : undefined}
          className={cn('rounded-lg px-2 py-1 text-[0.8125rem] font-bold tabular-nums transition enabled:hover:ring-2 enabled:hover:ring-brand-200',
            item.status === 'out' ? 'bg-rose-50 text-rose-700' : item.status === 'low' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-800')}>
          {qty(item.stock)} <span className="text-[0.6875rem] font-medium opacity-70">{item.unit}</span>
        </button>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-[0.75rem]"><Movement item={item} days={days} /></td>
      {!costHidden && <td className="whitespace-nowrap px-3 py-2.5 text-right text-[0.8125rem] tabular-nums text-slate-600">{value ? cost(value) : '—'}</td>}
      {config.columns?.map((c) => <td key={c.id} className={cn('px-3 py-2.5 text-[0.8125rem]', c.align === 'right' && 'text-right')}>{c.cell(item)}</td>)}
      <td className="px-3 py-2.5">
        {!item.isActive ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-slate-600">Band</span>
          : ribbon ? <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', ribbon.tone === 'red' ? 'bg-rose-50 text-rose-700' : ribbon.tone === 'amber' ? 'bg-amber-50 text-amber-800' : 'bg-violet-50 text-violet-700')}>{ribbon.tone === 'amber' && item.status === 'low' ? 'Kam' : ribbon.text}</span>
            : <span className="rounded-full bg-success-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-success-700">Theek</span>}
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center justify-end gap-0.5">
          {can.stock && <IconAction onClick={onStock} title="Stock" tone="brand"><Plus className="h-4 w-4" /></IconAction>}
          {can.edit && <IconAction to={config.paths.edit(item.id)} title="Badlein"><Pencil className="h-4 w-4" /></IconAction>}
          {extras.actions}
          {can.delete && <ProductDeleteButton id={item.id} name={item.name} onDeleted={onDeleted} className="h-9 w-9 rounded-xl" />}
        </div>
      </td>
    </tr>
  );
}
