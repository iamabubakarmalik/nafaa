import type { ProductQuery, SortKey } from '@/lib/api';

export const SORTS: SortKey[] = ['featured', 'best_selling', 'newest', 'price_asc', 'price_desc', 'title_asc'];
export const FILTER_KEYS = ['brand', 'category', 'size', 'color', 'minPrice', 'maxPrice', 'available'] as const;

/** URL search params → API product query (only known keys pass). */
export function toQuery(sp: Record<string, string | undefined>, limit: number): ProductQuery {
  const num = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
  const list = (v?: string) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20).join(',') : undefined);
  return {
    sort: SORTS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : undefined,
    page: Math.max(1, num(sp.page) ?? 1),
    limit,
    brand: list(sp.brand),
    category: list(sp.category),
    size: list(sp.size),
    color: list(sp.color),
    minPrice: num(sp.minPrice),
    maxPrice: num(sp.maxPrice),
    available: sp.available === '1' ? true : undefined,
    q: sp.q?.slice(0, 80) || undefined,
  };
}
