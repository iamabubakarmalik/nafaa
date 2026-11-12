import type { ProductCard as Card } from '@/lib/api';
import type { SiteContext } from '@/lib/store';
import { ProductCard } from '../product/ProductCard';

const COLS: Record<number, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-3 lg:grid-cols-4',
  5: 'md:grid-cols-4 lg:grid-cols-5',
  6: 'md:grid-cols-4 lg:grid-cols-6',
};

/** Columns at md and lg for each setting (matches COLS). */
const PER_ROW: Record<number, { md: number; lg: number }> = { 2: { md: 2, lg: 2 }, 3: { md: 3, lg: 3 }, 4: { md: 3, lg: 4 }, 5: { md: 4, lg: 5 }, 6: { md: 4, lg: 6 } };

/** How many cards to show so a short last row (half a row or less) is left out; all of them when they fit one row. */
export function balancedCount(n: number, perRow: number): number {
  if (n <= perRow) return n;
  const extra = n % perRow;
  return extra > 0 && extra <= perRow / 2 ? n - extra : n;
}

/**
 * Product cards in a grid. `balance` (home page sections) leaves out a short
 * last row on tablet and desktop, so no single card hangs alone; collection
 * pages keep every card because they page through the list.
 */
export function ProductGrid({ items, ctx, columns = 4, mobileColumns = 2, quickAdd, priorityCount = 0, balance = false }: { items: Card[]; ctx: SiteContext; columns?: number; mobileColumns?: number; quickAdd?: boolean; priorityCount?: number; balance?: boolean }) {
  const c = Math.max(2, Math.min(6, Math.round(columns) || 4));
  const cols = COLS[c] ?? COLS[4];
  const sizes = columns >= 5 ? '(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw' : '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw';
  const md = balance ? balancedCount(items.length, PER_ROW[c].md) : items.length;
  const lg = balance ? balancedCount(items.length, PER_ROW[c].lg) : items.length;
  // Wrapper is display: contents, so the card stays the grid item; hidden past the balanced count per width.
  const show = (i: number) => `${i >= md ? 'md:hidden' : ''} ${i >= lg ? 'lg:hidden' : i >= md ? 'lg:contents' : ''}`;
  return (
    <div className={`grid ${mobileColumns === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-x-3 gap-y-7 md:gap-x-5 md:gap-y-10 ${cols}`}>
      {items.map((p, i) => (
        <div key={p.id} className={`contents ${show(i)}`}>
          <ProductCard p={p} lang={ctx.lang} symbol={ctx.boot.settings.currencyDisplay.symbol} quickAdd={quickAdd ?? ctx.theme.layout.quickAdd} priority={i < priorityCount} sizes={sizes} />
        </div>
      ))}
    </div>
  );
}

export function ProductRow({ items, ctx }: { items: Card[]; ctx: SiteContext }) {
  return (
    <div className="snap-row -mx-4 gap-3 px-4 md:-mx-7 md:gap-5 md:px-7">
      {items.map((p) => (
        <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[34%] md:w-[28%] lg:w-[23%]">
          <ProductCard p={p} lang={ctx.lang} symbol={ctx.boot.settings.currencyDisplay.symbol} quickAdd={ctx.theme.layout.quickAdd} sizes="(min-width: 1024px) 23vw, 46vw" />
        </div>
      ))}
    </div>
  );
}
