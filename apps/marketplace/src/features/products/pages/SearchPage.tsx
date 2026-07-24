import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useRef } from 'react';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { SearchHeader } from '@/features/search/components/SearchHeader';
import { useRecentSearchesStore } from '@/stores/recentSearches.store';
import {
  Search, SlidersHorizontal, X, Tag, TrendingUp, Star,
  ShoppingBag, Filter, ChevronDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { productsApi } from '../api/products.api';
import { homeApi } from '@/features/home/api/home.api';
import { useLocationStore } from '@/stores/location.store';
import { ProductCard, ProductCardSkeleton } from '@/features/home/components/ProductCard';
import { Button, Card, Input, Badge, EmptyState } from '@/ui';
import { useToggleWishlist } from '@/features/wishlist/hooks/useWishlist';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { cn } from '@/lib/cn';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance', icon: Filter },
  { value: 'bestsellers', label: 'Best sellers', icon: TrendingUp },
  { value: 'rating', label: 'Top rated', icon: Star },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export default function SearchPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lat, lng, city } = useLocationStore();
  const toggleWishlist = useToggleWishlist();
  const addToCart = useAddToCart();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [localSearch, setLocalSearch] = useState(searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // Auto-focus on mount
    if (!searchParams.get('q')) searchInputRef.current?.focus();
  }, []);

  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const sortBy = (searchParams.get('sortBy') as any) ?? 'relevance';
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const minRating = searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined;
  const inStockOnly = searchParams.get('inStockOnly') === 'true';
  const onDiscount = searchParams.get('onDiscount') === 'true';
  const bargainEnabled = searchParams.get('bargainEnabled') === 'true';
  const groupBuyEnabled = searchParams.get('groupBuyEnabled') === 'true';
  const freeDelivery = searchParams.get('freeDelivery') === 'true';

  const updateParams = (updates: Record<string, string | boolean | number | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '' || v === false) next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next);
  };

  const recent = useRecentSearchesStore();
  const debouncedSetQ = useDebouncedCallback((val: string) => {
    updateParams({ q: val });
    if (val.trim()) recent.add(val.trim());
  }, 400);

  // Search suggestions
  const { data: suggestions } = useQuery({
    queryKey: ['search-suggestions', localSearch],
    queryFn: () => homeApi.searchSuggestions(localSearch),
    enabled: localSearch.length >= 2 && showSuggestions,
    staleTime: 60_000,
  });

  // Main search
  const { data, isLoading } = useQuery({
    queryKey: ['search', { q, category, sortBy, minPrice, maxPrice, minRating, inStockOnly, onDiscount, bargainEnabled, groupBuyEnabled, freeDelivery, lat, lng, city }],
    queryFn: () => productsApi.search({
      q: q || undefined,
      category: category || undefined,
      sortBy,
      minPrice, maxPrice, minRating,
      inStockOnly: inStockOnly || undefined,
      onDiscount: onDiscount || undefined,
      bargainEnabled: bargainEnabled || undefined,
      groupBuyEnabled: groupBuyEnabled || undefined,
      freeDelivery: freeDelivery || undefined,
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      city: city ?? undefined,
      limit: 48,
    }),
    staleTime: 30_000,
  });

  const activeFilters = [
    category, minPrice, maxPrice, minRating, inStockOnly, onDiscount, bargainEnabled, groupBuyEnabled, freeDelivery,
  ].filter((v) => v !== undefined && v !== '' && v !== false).length;

  const currentSort = SORT_OPTIONS.find((s) => s.value === sortBy) || SORT_OPTIONS[0];

  return (
    <>
      <Helmet>
        <title>{q ? `${q} — Search Results` : 'Search'} | Nafaa Bazaar</title>
        <meta name="description" content={`Search results for ${q || 'products'} — best prices, fast delivery.`} />
      </Helmet>

      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                ref={searchInputRef}
                leftIcon={<Search className="h-4 w-4" />}
                inputSize="lg"
                placeholder={t('home.searchPlaceholder')}
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setShowSuggestions(true);
                  debouncedSetQ(e.target.value);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                rightIcon={
                  localSearch && (
                    <button
                      onClick={() => { setLocalSearch(''); updateParams({ q: null }); }}
                      className="hover:text-danger"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )
                }
              />

              {/* Suggestions dropdown */}
              {showSuggestions && localSearch.length >= 2 && suggestions?.suggestions && (
                <div className="absolute top-full mt-2 inset-x-0 bg-surface rounded-2xl border border-border shadow-soft-lg z-30 max-h-96 overflow-y-auto animate-slide-down">
                  {suggestions.suggestions.shops?.length > 0 && (
                    <div className="p-2">
                      <div className="px-3 py-1.5 text-2xs font-black text-content-subtle uppercase tracking-wider">Shops</div>
                      {suggestions.suggestions.shops.map((s: any) => (
                        <Link
                          key={s.shopId}
                          to={`/shops/${s.slug || s.shopId}`}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-muted transition"
                        >
                          {s.logoUrl ? (
                            <img src={s.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-black">
                              {s.publicName[0]}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-bold text-content">{s.publicName}</div>
                            <div className="text-2xs text-content-muted">{s.city}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  {suggestions.suggestions.products?.length > 0 && (
                    <div className="p-2 border-t border-border">
                      <div className="px-3 py-1.5 text-2xs font-black text-content-subtle uppercase tracking-wider">Products</div>
                      {suggestions.suggestions.products.map((p: any) => (
                        <Link
                          key={p.productId}
                          to={`/products/${p.productId}`}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-muted transition"
                        >
                          {p.publicImages?.[0] ? (
                            <img src={p.publicImages[0]} alt="" className="h-10 w-10 rounded-xl object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-surface-muted flex items-center justify-center">
                              <ShoppingBag className="h-4 w-4 text-content-subtle" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-content line-clamp-1">{p.publicName}</div>
                            <div className="text-2xs text-brand-600 font-black">PKR {p.publicPrice}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  {suggestions.suggestions.categories?.length > 0 && (
                    <div className="p-2 border-t border-border">
                      <div className="px-3 py-1.5 text-2xs font-black text-content-subtle uppercase tracking-wider">Categories</div>
                      {suggestions.suggestions.categories.map((c: string) => (
                        <button
                          key={c}
                          onClick={() => {
                            updateParams({ category: c, q: null });
                            setLocalSearch('');
                            setShowSuggestions(false);
                          }}
                          className="flex items-center gap-2 p-2 rounded-xl hover:bg-surface-muted transition w-full text-left"
                        >
                          <Tag className="h-4 w-4 text-brand-600" />
                          <span className="text-sm font-bold capitalize">{c}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              variant="secondary"
              size="lg"
              leftIcon={<SlidersHorizontal className="h-4 w-4" />}
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              {activeFilters > 0 && (
                <Badge variant="brand" size="sm" className="ml-1">{activeFilters}</Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Active category tag */}
        {category && (
          <div className="flex items-center gap-2">
            <Badge variant="brand" size="lg" className="capitalize">
              {category}
              <button onClick={() => updateParams({ category: null })} className="ml-1">
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          </div>
        )}

        {/* Sort dropdown + count */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-content-muted">
            {isLoading ? 'Searching…' : data?.total ? `${data.total.toLocaleString()} results` : ''}
            {q && ` for "${q}"`}
          </div>
          <details className="relative group">
            <summary className="list-none cursor-pointer h-10 px-4 rounded-xl bg-surface border border-border hover:bg-surface-muted flex items-center gap-2 text-sm font-bold">
              Sort: {currentSort.label}
              <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 top-full mt-1 w-56 bg-surface rounded-2xl border border-border shadow-soft-lg z-20 p-1">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateParams({ sortBy: opt.value })}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition',
                    sortBy === opt.value ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400' : 'hover:bg-surface-muted text-content',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </details>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <Card className="p-4 space-y-4 animate-slide-down">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Price range */}
              <div>
                <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">Price range (PKR)</div>
                <div className="flex items-center gap-2">
                  <Input
                    inputSize="sm"
                    placeholder="Min"
                    type="number"
                    value={minPrice ?? ''}
                    onChange={(e) => updateParams({ minPrice: e.target.value || null })}
                  />
                  <span className="text-content-subtle">—</span>
                  <Input
                    inputSize="sm"
                    placeholder="Max"
                    type="number"
                    value={maxPrice ?? ''}
                    onChange={(e) => updateParams({ maxPrice: e.target.value || null })}
                  />
                </div>
              </div>

              {/* Min rating */}
              <div>
                <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">Minimum rating</div>
                <div className="flex gap-1.5">
                  {[4, 3, 2, 1].map((r) => (
                    <button
                      key={r}
                      onClick={() => updateParams({ minRating: minRating === r ? null : r })}
                      className={cn(
                        'flex items-center gap-1 h-9 px-3 rounded-xl text-xs font-black transition border',
                        minRating === r
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-500'
                          : 'bg-surface text-content-muted border-border',
                      )}
                    >
                      <Star className="h-3 w-3 fill-current" />
                      {r}+
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">Filters</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'inStockOnly', label: '✅ In stock', value: inStockOnly },
                  { key: 'onDiscount', label: '💥 On sale', value: onDiscount },
                  { key: 'freeDelivery', label: '🚚 Free delivery', value: freeDelivery },
                  { key: 'bargainEnabled', label: '💬 Bargain', value: bargainEnabled },
                  { key: 'groupBuyEnabled', label: '👥 Group buy', value: groupBuyEnabled },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => updateParams({ [f.key]: !f.value })}
                    className={cn(
                      'h-9 px-3 rounded-xl text-xs font-black transition border',
                      f.value
                        ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 border-brand-500'
                        : 'bg-surface text-content-muted border-border',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {activeFilters > 0 && (
              <button
                onClick={() => setSearchParams(new URLSearchParams(q ? { q } : {}))}
                className="text-xs font-black text-danger hover:underline flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Clear all filters ({activeFilters})
              </button>
            )}
          </Card>
        )}

        {/* Category facets */}
        {data?.facets?.categories && data.facets.categories.length > 0 && !category && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
            {data.facets.categories.slice(0, 10).map((c) => (
              <button
                key={c.name}
                onClick={() => updateParams({ category: c.name })}
                className="shrink-0 h-9 px-4 rounded-full bg-surface border border-border hover:border-brand-400 text-sm font-bold capitalize transition"
              >
                {c.name} <span className="text-content-subtle ml-1">({c.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Results grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={Search}
            title={q ? `No results for "${q}"` : 'Start searching'}
            description={q ? 'Try different keywords or clear filters' : 'Search for products, shops, or categories'}
            action={q ? (
              <Button onClick={() => { setLocalSearch(''); setSearchParams(new URLSearchParams()); }}>
                Clear search
              </Button>
            ) : null}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {data.items.map((product) => (
              <ProductCard
                key={product.productId}
                product={product}
                onWishlist={() => toggleWishlist.mutate(product.productId)}
                onQuickAdd={() => addToCart.mutate({ productId: product.productId, quantity: 1 })}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
