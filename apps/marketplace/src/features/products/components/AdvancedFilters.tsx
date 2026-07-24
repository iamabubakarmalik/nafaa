import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  SlidersHorizontal, X, Filter, DollarSign, Star, MapPin,
  Store, Tag, Zap, Users, ShieldCheck,
} from 'lucide-react';
import { Button, Card, Badge } from '@/ui';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';

interface Props {
  onApply?: () => void;
  onClose?: () => void;
  isOpen: boolean;
}

export function AdvancedFiltersPanel({ isOpen, onApply, onClose }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [minPrice, setMinPrice] = useState(Number(searchParams.get('minPrice') || 0));
  const [maxPrice, setMaxPrice] = useState(Number(searchParams.get('maxPrice') || 100000));
  const [minRating, setMinRating] = useState(Number(searchParams.get('minRating') || 0));
  const [radius, setRadius] = useState(Number(searchParams.get('radiusKm') || 15));
  const [flags, setFlags] = useState({
    inStockOnly: searchParams.get('inStockOnly') === 'true',
    onDiscount: searchParams.get('onDiscount') === 'true',
    freeDelivery: searchParams.get('freeDelivery') === 'true',
    bargainEnabled: searchParams.get('bargainEnabled') === 'true',
    groupBuyEnabled: searchParams.get('groupBuyEnabled') === 'true',
    verifiedOnly: searchParams.get('minVerification') === 'GOLD',
  });

  const activeCount = Object.values(flags).filter(Boolean).length + (minRating > 0 ? 1 : 0) + (minPrice > 0 || maxPrice < 100000 ? 1 : 0);

  const apply = () => {
    const next = new URLSearchParams(searchParams);
    if (minPrice > 0) next.set('minPrice', String(minPrice)); else next.delete('minPrice');
    if (maxPrice < 100000) next.set('maxPrice', String(maxPrice)); else next.delete('maxPrice');
    if (minRating > 0) next.set('minRating', String(minRating)); else next.delete('minRating');
    if (radius !== 15) next.set('radiusKm', String(radius)); else next.delete('radiusKm');
    Object.entries(flags).forEach(([k, v]) => {
      if (v) {
        if (k === 'verifiedOnly') next.set('minVerification', 'GOLD');
        else next.set(k, 'true');
      } else {
        if (k === 'verifiedOnly') next.delete('minVerification');
        else next.delete(k);
      }
    });
    setSearchParams(next);
    onApply?.();
  };

  const clear = () => {
    setMinPrice(0);
    setMaxPrice(100000);
    setMinRating(0);
    setRadius(15);
    setFlags({
      inStockOnly: false, onDiscount: false, freeDelivery: false,
      bargainEnabled: false, groupBuyEnabled: false, verifiedOnly: false,
    });
    const next = new URLSearchParams();
    const q = searchParams.get('q');
    const sort = searchParams.get('sortBy');
    if (q) next.set('q', q);
    if (sort) next.set('sortBy', sort);
    setSearchParams(next);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <Card className="w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="p-4 border-b border-border sticky top-0 bg-surface z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-brand-600" />
            <h3 className="font-black text-lg">Advanced filters</h3>
            {activeCount > 0 && <Badge variant="brand" size="sm">{activeCount}</Badge>}
          </div>
          <button onClick={onClose} className="text-content-subtle hover:text-content">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Price range */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-black text-content-muted uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                Price range
              </div>
              <div className="text-xs font-bold">
                {formatPrice(minPrice)} — {formatPrice(maxPrice)}
              </div>
            </div>
            <div className="space-y-2">
              <input
                type="range" min={0} max={100000} step={500}
                value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
              <input
                type="range" min={0} max={100000} step={500}
                value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>
          </div>

          {/* Rating */}
          <div>
            <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2 flex items-center gap-1">
              <Star className="h-3.5 w-3.5" />
              Minimum rating
            </div>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRating(r)}
                  className={cn(
                    'flex-1 h-10 rounded-xl border-2 text-xs font-black transition flex items-center justify-center gap-1',
                    minRating === r
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                      : 'border-border bg-surface',
                  )}
                >
                  {r === 0 ? 'Any' : (
                    <>
                      <Star className="h-3 w-3 fill-current" />
                      {r}+
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Radius */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-black text-content-muted uppercase tracking-wider flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                Delivery radius
              </div>
              <div className="text-xs font-bold">{radius} km</div>
            </div>
            <input
              type="range" min={1} max={50} step={1}
              value={radius} onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </div>

          {/* Feature toggles */}
          <div>
            <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
              Features
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'inStockOnly',     icon: '✅', label: 'In stock' },
                { key: 'onDiscount',      icon: '💥', label: 'On sale' },
                { key: 'freeDelivery',    icon: '🚚', label: 'Free delivery' },
                { key: 'bargainEnabled',  icon: '💬', label: 'Bargain' },
                { key: 'groupBuyEnabled', icon: '👥', label: 'Group buy' },
                { key: 'verifiedOnly',    icon: '✓',  label: 'Verified only' },
              ].map((f) => {
                const active = flags[f.key as keyof typeof flags];
                return (
                  <button
                    key={f.key}
                    onClick={() => setFlags({ ...flags, [f.key]: !active })}
                    className={cn(
                      'p-3 rounded-xl border-2 text-xs font-black transition flex items-center gap-2',
                      active
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700'
                        : 'border-border bg-surface',
                    )}
                  >
                    <span>{f.icon}</span>
                    <span className="flex-1 text-left">{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-surface border-t border-border p-4 flex gap-2">
          <Button variant="ghost" size="lg" fullWidth onClick={clear}>
            Clear all
          </Button>
          <Button variant="gradient" size="lg" fullWidth onClick={apply}>
            Apply {activeCount > 0 && `(${activeCount})`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
