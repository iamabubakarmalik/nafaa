import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, X, TrendingUp, Clock, Sparkles, Tag, Mic,
  ArrowUpRight, Store, ShoppingBag,
} from 'lucide-react';
import { trendingApi } from '../api/trending.api';
import { useRecentSearchesStore } from '@/stores/recentSearches.store';
import { useLocationStore } from '@/stores/location.store';
import { VoiceSearchButton } from '@/features/voice-search/components/VoiceSearchButton';
import { formatPrice } from '@/lib/format';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { Card } from '@/ui';
import { cn } from '@/lib/cn';

interface Props {
  onSearch: (query: string) => void;
  initialValue?: string;
  autoFocus?: boolean;
}

export function SearchHeader({ onSearch, initialValue = '', autoFocus = false }: Props) {
  const navigate = useNavigate();
  const { city } = useLocationStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialValue);
  const [showDropdown, setShowDropdown] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const debouncedSet = useDebouncedCallback((v: string) => setDebouncedQuery(v), 200);
  useEffect(() => debouncedSet(query), [query]);

  useEffect(() => {
    if (autoFocus) setTimeout(() => inputRef.current?.focus(), 100);
  }, [autoFocus]);

  const recent = useRecentSearchesStore();

  const { data: trending } = useQuery({
    queryKey: ['trending-searches', city],
    queryFn: () => trendingApi.trendingSearches(city ?? undefined),
    staleTime: 5 * 60_000,
    enabled: !query,
  });

  const { data: suggestions } = useQuery({
    queryKey: ['autocomplete', debouncedQuery],
    queryFn: () => trendingApi.suggestions(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 60_000,
  });

  const submit = (q: string) => {
    if (!q.trim()) return;
    recent.add(q.trim());
    setShowDropdown(false);
    onSearch(q.trim());
  };

  const showSuggestions = showDropdown && debouncedQuery.length >= 2 && suggestions;
  const showTrending = showDropdown && !debouncedQuery && trending;
  const hasRecent = recent.items.length > 0;

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-content-subtle">
            <Search className="h-4 w-4" />
          </div>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit(query);
              if (e.key === 'Escape') setShowDropdown(false);
            }}
            placeholder="Search products, shops, categories..."
            className="w-full h-12 pl-11 pr-11 rounded-2xl bg-surface border border-border text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-surface-muted flex items-center justify-center transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <VoiceSearchButton className="shrink-0" />
      </div>

      {/* Dropdown */}
      {(showSuggestions || showTrending || (showDropdown && !query && hasRecent)) && (
        <Card className="absolute top-full mt-2 inset-x-0 z-30 shadow-soft-lg max-h-[70vh] overflow-y-auto animate-slide-down">
          {/* Autocomplete */}
          {showSuggestions && (
            <>
              {suggestions.queries?.length > 0 && (
                <div className="p-2 border-b border-border">
                  <div className="px-3 py-1.5 text-2xs font-black text-content-subtle uppercase tracking-wider">
                    Suggestions
                  </div>
                  {suggestions.queries.map((q, i) => (
                    <button
                      key={i}
                      onMouseDown={() => submit(q)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-muted transition text-left"
                    >
                      <Search className="h-4 w-4 text-content-subtle shrink-0" />
                      <span className="text-sm font-bold flex-1 truncate">{q}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-content-subtle" />
                    </button>
                  ))}
                </div>
              )}

              {suggestions.shops?.length > 0 && (
                <div className="p-2 border-b border-border">
                  <div className="px-3 py-1.5 text-2xs font-black text-content-subtle uppercase tracking-wider">
                    Shops
                  </div>
                  {suggestions.shops.slice(0, 3).map((s: any) => (
                    <button
                      key={s.shopId}
                      onMouseDown={() => { navigate(`/shops/${s.slug || s.shopId}`); setShowDropdown(false); }}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-surface-muted transition"
                    >
                      {s.logoUrl ? (
                        <img src={s.logoUrl} alt="" className="h-9 w-9 rounded-xl object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-black">
                          {s.publicName[0]}
                        </div>
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-sm font-bold truncate">{s.publicName}</div>
                        <div className="text-2xs text-content-muted">{s.city}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {suggestions.products?.length > 0 && (
                <div className="p-2 border-b border-border">
                  <div className="px-3 py-1.5 text-2xs font-black text-content-subtle uppercase tracking-wider">
                    Products
                  </div>
                  {suggestions.products.slice(0, 4).map((p: any) => (
                    <button
                      key={p.productId}
                      onMouseDown={() => { navigate(`/products/${p.productId}`); setShowDropdown(false); }}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-surface-muted transition"
                    >
                      {p.publicImages?.[0] ? (
                        <img src={p.publicImages[0]} alt="" className="h-9 w-9 rounded-lg object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-lg bg-surface-muted flex items-center justify-center">
                          <ShoppingBag className="h-4 w-4 text-content-subtle" />
                        </div>
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-sm font-bold line-clamp-1">{p.publicName}</div>
                        <div className="text-2xs text-brand-600 font-black">{formatPrice(p.publicPrice)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Recent searches (when no query) */}
          {showDropdown && !query && hasRecent && (
            <div className="p-2 border-b border-border">
              <div className="flex items-center justify-between px-3 py-1.5">
                <div className="text-2xs font-black text-content-subtle uppercase tracking-wider flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Recent searches
                </div>
                <button
                  onMouseDown={() => recent.clear()}
                  className="text-2xs font-bold text-danger hover:underline"
                >
                  Clear
                </button>
              </div>
              {recent.items.slice(0, 8).map((r) => (
                <div key={r.query} className="flex items-center hover:bg-surface-muted rounded-xl transition">
                  <button
                    onMouseDown={() => submit(r.query)}
                    className="flex-1 flex items-center gap-3 p-2.5 text-left"
                  >
                    <Clock className="h-4 w-4 text-content-subtle shrink-0" />
                    <span className="text-sm font-bold flex-1 truncate">{r.query}</span>
                  </button>
                  <button
                    onMouseDown={() => recent.remove(r.query)}
                    className="p-2 text-content-subtle hover:text-danger"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Trending */}
          {showTrending && trending.searches?.length > 0 && (
            <div className="p-2 border-b border-border">
              <div className="px-3 py-1.5 text-2xs font-black text-content-subtle uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Trending {city && `in ${city}`}
              </div>
              <div className="flex flex-wrap gap-1.5 p-2">
                {trending.searches.slice(0, 8).map((t) => (
                  <button
                    key={t}
                    onMouseDown={() => submit(t)}
                    className="h-8 px-3 rounded-full bg-brand-50 dark:bg-brand-950/30 hover:bg-brand-100 dark:hover:bg-brand-900/40 border border-brand-200 dark:border-brand-800 text-xs font-black text-brand-700 dark:text-brand-400 transition"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular categories */}
          {showTrending && trending.categories?.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-1.5 text-2xs font-black text-content-subtle uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Popular categories
              </div>
              <div className="flex flex-wrap gap-1.5 p-2">
                {trending.categories.slice(0, 8).map((c) => (
                  <button
                    key={c}
                    onMouseDown={() => { navigate(`/category/${encodeURIComponent(c)}`); setShowDropdown(false); }}
                    className="h-8 px-3 rounded-full bg-accent-50 dark:bg-accent-950/30 hover:bg-accent-100 dark:hover:bg-accent-900/40 border border-accent-200 dark:border-accent-800 text-xs font-black text-accent-700 dark:text-accent-400 transition inline-flex items-center gap-1 capitalize"
                  >
                    <Tag className="h-3 w-3" />
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
