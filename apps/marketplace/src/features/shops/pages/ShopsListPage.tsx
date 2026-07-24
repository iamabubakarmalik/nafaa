import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import {
  Store, SlidersHorizontal, MapPin, Star, ShieldCheck, X, Search,
} from 'lucide-react';
import { shopsApi } from '../api/shops.api';
import { useLocationStore } from '@/stores/location.store';
import { ShopCard, ShopCardSkeleton } from '@/features/home/components/ShopCard';
import { Button, Card, Input, Badge, EmptyState } from '@/ui';
import { cn } from '@/lib/cn';

const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'distance', label: 'Nearest' },
  { value: 'rating', label: 'Top rated' },
  { value: 'delivery_time', label: 'Fastest delivery' },
  { value: 'newest', label: 'Newest' },
];

const VERIFICATION_OPTIONS = [
  { value: '', label: 'All shops' },
  { value: 'BRONZE', label: 'Bronze+' },
  { value: 'SILVER', label: 'Silver+' },
  { value: 'GOLD', label: 'Gold+' },
  { value: 'PLATINUM', label: 'Platinum' },
];

export default function ShopsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { lat, lng, city } = useLocationStore();
  const [showFilters, setShowFilters] = useState(false);

  const search = searchParams.get('search') ?? '';
  const sortBy = (searchParams.get('sortBy') as any) ?? 'popular';
  const industry = searchParams.get('industry') ?? '';
  const minVerification = searchParams.get('minVerification') as any;
  const onlyOpen = searchParams.get('onlyOpen') === 'true';
  const freeDelivery = searchParams.get('freeDelivery') === 'true';
  const bargainEnabled = searchParams.get('bargainEnabled') === 'true';

  const updateParams = (updates: Record<string, string | boolean | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '' || v === false) next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['shops', { search, sortBy, industry, minVerification, onlyOpen, freeDelivery, bargainEnabled, lat, lng, city }],
    queryFn: () => shopsApi.list({
      search: search || undefined,
      sortBy,
      industry: industry || undefined,
      minVerification: minVerification || undefined,
      onlyOpen: onlyOpen || undefined,
      freeDelivery: freeDelivery || undefined,
      bargainEnabled: bargainEnabled || undefined,
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      city: city ?? undefined,
      limit: 50,
    }),
    staleTime: 30_000,
  });

  const activeFilterCount = [industry, minVerification, onlyOpen, freeDelivery, bargainEnabled].filter(Boolean).length;

  return (
    <>
      <Helmet>
        <title>Shops Near You | Nafaa Bazaar</title>
      </Helmet>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-content flex items-center gap-2">
              <Store className="h-7 w-7 text-brand-600" />
              Shops
            </h1>
            <p className="text-sm text-content-muted mt-0.5">
              {data ? `${data.total} shops` : 'Discover shops near you'}
              {city && ` in ${city}`}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<SlidersHorizontal className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="brand" size="sm" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
        </div>

        {/* Search */}
        <Input
          leftIcon={<Search className="h-4 w-4" />}
          placeholder="Search shops by name..."
          value={search}
          onChange={(e) => updateParams({ search: e.target.value })}
        />

        {/* Sort chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParams({ sortBy: opt.value })}
              className={cn(
                'shrink-0 h-9 px-4 rounded-full text-sm font-bold transition border',
                sortBy === opt.value
                  ? 'bg-brand-600 text-white border-brand-600 shadow-brand'
                  : 'bg-surface text-content-muted border-border hover:border-brand-300',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <Card className="p-4 space-y-4 animate-slide-down">
            <div>
              <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
                Verification level
              </div>
              <div className="flex flex-wrap gap-2">
                {VERIFICATION_OPTIONS.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => updateParams({ minVerification: v.value || null })}
                    className={cn(
                      'h-8 px-3 rounded-lg text-xs font-bold transition border',
                      (minVerification ?? '') === v.value
                        ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 border-brand-500'
                        : 'bg-surface text-content-muted border-border',
                    )}
                  >
                    {v.value === 'GOLD' && <ShieldCheck className="h-3 w-3 inline mr-1 text-amber-500" />}
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
                Quick filters
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'onlyOpen', label: '🟢 Open now', value: onlyOpen },
                  { key: 'freeDelivery', label: '🚚 Free delivery', value: freeDelivery },
                  { key: 'bargainEnabled', label: '💬 Bargain enabled', value: bargainEnabled },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => updateParams({ [f.key]: !f.value })}
                    className={cn(
                      'h-8 px-3 rounded-lg text-xs font-bold transition border',
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

            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setSearchParams(new URLSearchParams({ sortBy }));
                }}
                className="text-xs font-bold text-danger hover:underline flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear all filters
              </button>
            )}
          </Card>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ShopCardSkeleton key={i} />)}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={Store}
            title="No shops match your filters"
            description="Try adjusting or clearing filters"
            action={<Button onClick={() => setSearchParams(new URLSearchParams())}>Clear filters</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.items.map((shop) => <ShopCard key={shop.shopId} shop={shop} />)}
          </div>
        )}
      </div>
    </>
  );
}
