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

export function ProductGrid({ items, ctx, columns = 4, mobileColumns = 2, quickAdd, priorityCount = 0 }: { items: Card[]; ctx: SiteContext; columns?: number; mobileColumns?: number; quickAdd?: boolean; priorityCount?: number }) {
  const cols = COLS[Math.max(2, Math.min(6, columns))] ?? COLS[4];
  const sizes = columns >= 5 ? '(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw' : '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw';
  return (
    <div className={`grid ${mobileColumns === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-x-3 gap-y-7 md:gap-x-5 md:gap-y-10 ${cols}`}>
      {items.map((p, i) => (
        <ProductCard key={p.id} p={p} lang={ctx.lang} symbol={ctx.boot.settings.currencyDisplay.symbol} quickAdd={quickAdd ?? ctx.theme.layout.quickAdd} priority={i < priorityCount} sizes={sizes} />
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
