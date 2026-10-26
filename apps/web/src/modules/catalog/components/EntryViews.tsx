/** One catalog entry as a card (grid), a row (list), or a line on a menu board. */

import { Layers, Plus, Star } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { ProductThumb } from '@modules/inventory/products/lib/productEmoji';
import type { CatalogEntry, EntryBadge, Tone } from '../types';

const TONE: Record<Tone, string> = {
  green: 'bg-success-100 text-success-800', red: 'bg-rose-100 text-rose-700', amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-sky-100 text-sky-800', violet: 'bg-violet-100 text-violet-800', slate: 'bg-slate-100 text-slate-700', pink: 'bg-pink-100 text-pink-700',
};
/** Badges laid over a photo: a white pill with tinted text stays readable on any image. */
const SOLID: Record<Tone, string> = {
  green: 'bg-white/95 text-success-700', red: 'bg-white/95 text-rose-700', amber: 'bg-amber-400 text-amber-950',
  blue: 'bg-white/95 text-sky-700', violet: 'bg-white/95 text-violet-700', slate: 'bg-white/95 text-slate-800', pink: 'bg-white/95 text-pink-700',
};

export function Chip({ chip, className }: { chip: EntryBadge; className?: string }) {
  return <span className={cn('max-w-[10rem] truncate rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold', TONE[chip.tone], className)}>{chip.label}</span>;
}

export function Thumb({ entry, size = 'full', className }: { entry: CatalogEntry; size?: 'md' | 'lg' | 'full'; className?: string }) {
  if (!entry.image && entry.emoji) {
    const box = size === 'md' ? 'h-11 w-11 rounded-xl text-xl' : size === 'lg' ? 'h-16 w-16 rounded-2xl text-3xl' : 'h-full w-full text-5xl';
    return <div className={cn(box, 'flex shrink-0 select-none items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100', className)}>{entry.emoji}</div>;
  }
  return <ProductThumb name={entry.name} category={entry.category?.name} url={entry.image} size={size} className={className} />;
}

/** "Rs 1,200 / kg" with the old price struck through. */
export function PriceTag({ entry, big }: { entry: CatalogEntry; big?: boolean }) {
  if (entry.priceNote) return <span className={cn('font-bold text-brand-700', big ? 'text-2xl' : 'text-[0.9375rem]')}>{entry.priceNote}</span>;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      <span className={cn('font-bold tabular-nums text-slate-900', big ? 'text-3xl tracking-tight' : 'text-[1.0625rem]')}>{formatPKR(entry.price)}</span>
      {entry.per && <span className={cn('font-medium text-slate-500', big ? 'text-sm' : 'text-[0.75rem]')}>/ {entry.per}</span>}
      {entry.oldPrice && entry.oldPrice > entry.price && <span className={cn('tabular-nums text-slate-400 line-through', big ? 'text-base' : 'text-[0.75rem]')}>{formatPKR(entry.oldPrice)}</span>}
    </span>
  );
}

interface ViewProps {
  entry: CatalogEntry;
  showStock: boolean;
  picked: boolean;
  onOpen: () => void;
  onPick: () => void;
}

function PickButton({ picked, onPick, disabled }: { picked: boolean; onPick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onPick(); }} disabled={disabled} title={picked ? 'List me hai — ek aur' : 'List me daalein'}
      className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition disabled:opacity-40',
        picked ? 'bg-brand-600 text-brand-fg' : 'bg-brand-50 text-brand-700 hover:bg-brand-100')}>
      <Plus className="h-4 w-4" />
    </button>
  );
}

export function EntryCard({ entry, showStock, picked, onOpen, onPick }: ViewProps) {
  const out = showStock && entry.inStock === false;
  return (
    <article className={cn('group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-lg', out && 'opacity-75')}
      onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}>
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <Thumb entry={entry} className={cn('transition duration-300 group-hover:scale-[1.03]', out && 'grayscale')} />
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1">
          {entry.featured && <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-400 text-amber-950 shadow-sm" title="Khaas"><Star className="h-3.5 w-3.5 fill-current" /></span>}
          {(entry.variantCount ?? 0) > 0 && <span className="inline-flex h-6 items-center gap-1 rounded-md bg-white/90 px-1.5 text-[0.6875rem] font-semibold text-slate-700 shadow-sm"><Layers className="h-3 w-3" />{entry.variantCount}</span>}
        </div>
        <div className="absolute right-2.5 top-2.5 flex flex-col items-end gap-1">
          {entry.badges?.map((b) => <span key={b.label} className={cn('rounded-md px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide shadow-sm', SOLID[b.tone])}>{b.label}</span>)}
        </div>
        {out && <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-[0.6875rem] font-bold uppercase tracking-wide text-white backdrop-blur-sm">Abhi khatam</span>}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 text-[0.9375rem] font-semibold leading-snug text-slate-900">{entry.name}</h3>
        {(entry.brand || entry.category) && <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">{[entry.brand, entry.category?.name].filter(Boolean).join(' · ')}</p>}
        {!!entry.chips?.length && <div className="mt-1.5 flex flex-wrap gap-1">{entry.chips.slice(0, 4).map((c) => <Chip key={c.label} chip={c} />)}</div>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <PriceTag entry={entry} />
            {showStock && entry.stockNote && !out && <p className="text-[0.6875rem] font-medium text-success-700">{entry.stockNote}</p>}
          </div>
          <PickButton picked={picked} onPick={onPick} disabled={out} />
        </div>
      </div>
    </article>
  );
}

export function EntryRow({ entry, showStock, picked, onOpen, onPick }: ViewProps) {
  const out = showStock && entry.inStock === false;
  return (
    <li className={cn('flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-slate-50 sm:px-4', out && 'opacity-70')} onClick={onOpen}>
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100"><Thumb entry={entry} /></div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[0.9375rem] font-semibold text-slate-900">
          {entry.featured && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}{entry.name}
        </p>
        <p className="truncate text-[0.75rem] text-slate-500">{[entry.brand, entry.category?.name, entry.description].filter(Boolean).join(' · ')}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {[...(entry.badges ?? []), ...(entry.chips ?? [])].slice(0, 5).map((c) => <Chip key={c.label} chip={c} />)}
          {out && <Chip chip={{ label: 'Abhi khatam', tone: 'red' }} />}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <PriceTag entry={entry} />
        {showStock && entry.stockNote && !out && <p className="text-[0.6875rem] font-medium text-success-700">{entry.stockNote}</p>}
      </div>
      <PickButton picked={picked} onPick={onPick} disabled={out} />
    </li>
  );
}

/** Menu board: entries grouped by category, name and price on one line. */
export function MenuBoard({ entries, picked, onOpen, onPick, showStock }: {
  entries: CatalogEntry[]; picked: (id: string) => boolean; onOpen: (e: CatalogEntry) => void; onPick: (e: CatalogEntry) => void; showStock: boolean;
}) {
  const groups = new Map<string, { name: string; color?: string; items: CatalogEntry[] }>();
  for (const e of entries) {
    const key = e.category?.id ?? '_';
    const g = groups.get(key) ?? { name: e.category?.name ?? 'Baqi', color: e.category?.color, items: [] };
    g.items.push(e);
    groups.set(key, g);
  }
  return (
    <div className="columns-1 gap-4 lg:columns-2">
      {[...groups.entries()].map(([key, g]) => (
        <section key={key} className="mb-4 break-inside-avoid overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <header className="flex items-center justify-between border-b border-t-4 border-b-slate-100 border-t-brand-600 px-4 py-3" style={g.color ? { borderTopColor: g.color } : undefined}>
            <h2 className="text-[1.0625rem] font-bold tracking-tight text-slate-900">{g.name}</h2>
            <span className="text-[0.75rem] text-slate-500">{g.items.length}</span>
          </header>
          <ul className="divide-y divide-slate-100">
            {g.items.map((e) => {
              const out = showStock && e.inStock === false;
              return (
                <li key={e.id} className={cn('flex cursor-pointer gap-3 px-4 py-3 hover:bg-slate-50', out && 'opacity-60')} onClick={() => onOpen(e)}>
                  {e.image && <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100"><Thumb entry={e} /></div>}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-[0.9375rem] font-semibold text-slate-900">{e.name}</span>
                      <span className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-slate-300" aria-hidden />
                      <span className="shrink-0 text-[0.9375rem] font-bold tabular-nums text-slate-900">{e.priceNote ?? formatPKR(e.price)}</span>
                    </div>
                    {e.description && <p className="line-clamp-1 text-[0.75rem] text-slate-500">{e.description}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {[...(e.badges ?? []), ...(e.chips ?? [])].slice(0, 4).map((c) => <Chip key={c.label} chip={c} />)}
                      {e.per && <span className="text-[0.6875rem] text-slate-400">/ {e.per}</span>}
                      {e.priceTiers?.map((t) => <span key={t.label} className="text-[0.6875rem] text-slate-500">· {t.label} {formatPKR(t.price)}</span>)}
                    </div>
                  </div>
                  <PickButton picked={picked(e.id)} onPick={() => onPick(e)} disabled={out} />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
