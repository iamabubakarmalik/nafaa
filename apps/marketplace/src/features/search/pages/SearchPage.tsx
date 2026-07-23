import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Search, X, Filter, Mic, TrendingUp, Clock, ArrowLeft,
  SlidersHorizontal, ChevronDown,
} from 'lucide-react';
import { productsApi } from '@features/products/api/products.api';
import { homeApi } from '@features/home/api/home.api';
import { cartApi } from '@features/cart/api/cart.api';
import { useLocationStore } from '@stores/location.store';
import { ProductCard } from '@features/home/components/ProductCard';
import { VoiceSearchButton } from '../components/VoiceSearchButton';
import { Button } from '@shared/ui/Button';
import { Badge } from '@shared/ui/Badge';
import { SkeletonCard } from '@shared/ui/Skeleton';
import { EmptyState } from '@shared/ui/EmptyState';
import { cn } from '@lib/cn';

const RECENT_KEY = 'nafaa_recent_searches';
const POPULAR_SEARCHES = [
  'Chicken karahi', 'iPhone 15', 'Lawn suit', 'Anda', 'Milk',
  'Biryani', 'Cake', 'Shampoo', 'Cooking oil', 'Sugar',
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { lat, lng, city } = useLocationStore();
  const [query, setQuery] = useState(params.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [category, setCategory] = useState(params.get('category') || '');
  const [sortBy, setSortBy] = useState<'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'>('relevance');
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch {
      return [];
    }
  });

  // Debounce query for API
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Save to URL params
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedQuery) next.set('q', debouncedQuery);
    if (category) next.set('category', category);
    setParams(next, { replace: true });
  }, [debouncedQuery, category, setParams]);

  // Save recent search
  const saveRecent = (q: string) => {
    if (!q.trim()) return;
    const updated = [q, ...recent.filter((r) => r !== q)].slice(0, 8);
    setRecent(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  const clearRecent = () => {
    setRecent([]);
    localStorage.removeItem(RECENT_KEY);
  };

  // Search suggestions (as-you-type)
  const { data: suggestions } = useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: () => homeApi.searchSuggestions(query),
    enabled: query.length >= 2 && query.length < 20,
  });

  // Products search
  const { data: results, isLoading, isFetching } = useQuery({
    queryKey: ['product-search', debouncedQuery, category, minPrice, maxPrice, sortBy, lat, lng],
    queryFn: () => productsApi.search({
      q: debouncedQuery || undefined,
      category: category || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sortBy,
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      city: city ?? undefined,
      limit: 40,
    }),
    enabled: debouncedQuery.length >= 2 || !!category,
  });

  const addToCartMutation = useMutation({
    mutationFn: (productId: string) => cartApi.add({ productId, quantity: 1 }),
    onSuccess: () => {
      toast.success('Cart mein add ho gaya 🛒');
      queryClient.invalidateQueries({ queryKey: ['market-cart'] });
    },
    onError: (err: any) => {
      if (err?.response?.status === 401) {
        toast.error('Pehle login karein');
        navigate('/login');
      } else {
        toast.error(err?.response?.data?.message || 'Error');
      }
    },
  });

  const handleSearch = (q: string) => {
    setQuery(q);
    setDebouncedQuery(q);
    saveRecent(q);
  };

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setCategory('');
    setSortBy('relevance');
  };

  const activeFilterCount =
    (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (category ? 1 : 0) + (sortBy !== 'relevance' ? 1 : 0);

  const isSearching = debouncedQuery.length >= 2 || !!category;

  return (
    <div className="pb-20 space-y-4 -mt-4 -mx-4 px-4">
      {/* Sticky Search Bar */}
      <div className="sticky top-[128px] z-20 -mx-4 px-4 py-3 bg-slate-50/95 dark:bg-neutral-950/95 backdrop-blur-md border-b border-slate-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="h-11 w-11 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 flex items-center justify-center shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Products, brands, dukanein search karein..."
              className="w-full h-11 pl-10 pr-16 rounded-2xl border-2 border-brand-200 dark:border-brand-800 bg-white dark:bg-neutral-900 text-sm font-semibold focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              autoFocus
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
              <VoiceSearchButton onResult={(text) => setQuery(text)} />
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'h-11 w-11 rounded-2xl border-2 flex items-center justify-center relative shrink-0 transition',
              showFilters || activeFilterCount > 0
                ? 'bg-brand-600 border-brand-600 text-white'
                : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-300',
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-neutral-950">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-3 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 shadow-soft-lg space-y-3 animate-slide-down">
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Price Range (PKR)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Min"
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-bold focus:outline-none focus:border-brand-500"
                />
                <span className="text-slate-400">—</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Max"
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-bold focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-bold focus:outline-none focus:border-brand-500"
              >
                <option value="relevance">Relevance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest First</option>
              </select>
            </div>

            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" fullWidth onClick={clearFilters}>
                Clear All Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Suggestions (as-you-type) */}
      {query.length >= 2 && !isSearching && suggestions?.items?.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft overflow-hidden">
          {suggestions.items.map((s: any, i: number) => (
            <button
              key={i}
              onClick={() => handleSearch(s.text)}
              className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800 transition border-b border-slate-100 dark:border-neutral-800 last:border-b-0 text-left"
            >
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {s.text}
              </span>
              {s.count && (
                <span className="text-[10px] text-slate-500 font-bold">
                  {s.count} results
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Not searching — show recent + popular */}
      {!isSearching && (
        <div className="space-y-4">
          {recent.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-500" />
                  Recent Searches
                </h3>
                <button
                  onClick={clearRecent}
                  className="text-[10px] font-bold text-rose-600 hover:underline"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleSearch(r)}
                    className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-sm font-bold text-slate-700 dark:text-slate-300 transition"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-4 w-4 text-brand-600" />
              Popular Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSearch(p)}
                  className="px-3 py-1.5 rounded-full bg-gradient-to-r from-brand-100 to-emerald-100 dark:from-brand-900/40 dark:to-emerald-900/40 hover:from-brand-200 hover:to-emerald-200 text-sm font-bold text-brand-700 dark:text-brand-400 transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Search results */}
      {isSearching && (
        <>
          {/* Active filter chips */}
          {(category || minPrice || maxPrice) && (
            <div className="flex flex-wrap gap-2">
              {category && (
                <Badge variant="brand" size="sm">
                  Category: {category}
                  <button onClick={() => setCategory('')} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {(minPrice || maxPrice) && (
                <Badge variant="accent" size="sm">
                  Rs {minPrice || 0} - {maxPrice || '∞'}
                  <button
                    onClick={() => { setMinPrice(''); setMaxPrice(''); }}
                    className="ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {isLoading || isFetching ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : !results?.items?.length ? (
            <EmptyState
              emoji="🔍"
              title="Kuch nahi mila"
              description={`"${debouncedQuery}" ke liye koi product nahi hai — kuch aur try karein`}
              action={<Button variant="outline" onClick={() => setQuery('')}>Clear Search</Button>}
            />
          ) : (
            <>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {results.total} products mile
                {debouncedQuery && ` "${debouncedQuery}" ke liye`}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {results.items.map((p: any) => (
                  <ProductCard key={p.productId} product={p} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
