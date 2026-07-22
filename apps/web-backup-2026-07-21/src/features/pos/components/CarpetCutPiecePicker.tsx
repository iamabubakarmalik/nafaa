import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, Scissors, Search, AlertCircle, Check, Ruler, Filter,
  Sparkles, Package, TrendingDown, MapPin, SortAsc, Tag,
} from 'lucide-react';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { carpetCutPiecesApi, type CarpetCutPiece } from '@/features/industries/carpet/api/carpet-cut-pieces.api';
import type { Product } from '@/api/products.api';
import type { ProductVariant } from '@/api/product-variants.api';

interface Props {
  product: Product;
  variant?: ProductVariant;
  onSelect: (piece: CarpetCutPiece) => void;
  onClose: () => void;
}

type SortBy = 'newest' | 'largest' | 'smallest' | 'cheapest' | 'expensive';

export function CarpetCutPiecePicker({ product, variant, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  useEffect(() => {
    const t = setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>('[data-cutpiece-search]');
      el?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, []);

  const { data: piecesData, isLoading } = useQuery({
    queryKey: ['carpet-cut-pieces-pos', product.id, variant?.id],
    queryFn: () =>
      carpetCutPiecesApi.list({
        productId: product.id,
        variantId: variant?.id,
        status: 'AVAILABLE',
        limit: 200,
      }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const pieces = piecesData?.items ?? [];

  // Universal search — piece code, roll #, variant, condition, notes, size, rack
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = q
      ? pieces.filter((p) => {
          const hay = [
            p.pieceCode,
            (p as any).notes,
            (p as any).sourceRoll?.rollNumber,
            (p as any).variant?.name,
            (p as any).variant?.color,
            (p as any).condition,
            (p as any).rackNumber,
            String((p as any).totalSqft),
            `${(p as any).widthFt}x${(p as any).lengthFt}`,
            `${(p as any).widthFt}×${(p as any).lengthFt}`,
          ].filter(Boolean).join(' ').toLowerCase();
          return hay.includes(q);
        })
      : [...pieces];

    result.sort((a, b) => {
      switch (sortBy) {
        case 'largest':   return Number((b as any).totalSqft) - Number((a as any).totalSqft);
        case 'smallest':  return Number((a as any).totalSqft) - Number((b as any).totalSqft);
        case 'cheapest':  return Number((a as any).salePrice) - Number((b as any).salePrice);
        case 'expensive': return Number((b as any).salePrice) - Number((a as any).salePrice);
        case 'newest':
        default:          return new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime();
      }
    });
    return result;
  }, [pieces, search, sortBy]);

  const totalSqft = useMemo(
    () => pieces.reduce((s, p) => s + Number((p as any).totalSqft || 0), 0),
    [pieces],
  );
  const totalValue = useMemo(
    () => pieces.reduce((s, p) => s + Number((p as any).salePrice || 0), 0),
    [pieces],
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-5xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95dvh] sm:max-h-[92vh] flex flex-col min-h-0">
        {/* HEADER */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white shrink-0">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-pink-400/15 blur-2xl" />

          <div className="relative px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg ring-2 ring-white/20 shrink-0">
                <Scissors className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider mb-1 border border-white/20">
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  Cut Pieces Stock
                </div>
                <h3 className="font-extrabold text-xl leading-tight truncate">
                  {product.name}
                  {variant && <span className="ml-2 text-amber-300 text-base font-bold">— {variant.name}</span>}
                </h3>
                <p className="text-sm text-white/85 font-semibold mt-1 flex items-center gap-2 flex-wrap">
                  <Package className="h-3 w-3" />
                  {pieces.length} piece{pieces.length !== 1 ? 's' : ''}
                  <span className="text-white/40">•</span>
                  <span className="text-violet-300 font-extrabold">{totalSqft.toFixed(0)} sqft</span>
                  {totalValue > 0 && (
                    <>
                      <span className="text-white/40">•</span>
                      <span className="text-emerald-300 font-extrabold">{formatPKR(totalValue)}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center transition shrink-0"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* SEARCH + SORT */}
        <div className="px-5 py-3 border-b-2 border-slate-100 bg-slate-50/50 space-y-2 shrink-0">
          <div className="relative">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              data-cutpiece-search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search: piece code, roll #, variant, size, rack, condition..."
              className="h-14 w-full rounded-xl border-2 border-slate-200 bg-white pl-11 pr-11 text-base font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            )}
            {search && (
              <div className="absolute -bottom-6 left-2 text-xs font-extrabold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-200">
                {filtered.length} match{filtered.length !== 1 ? 'es' : ''}
              </div>
            )}
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1">
            {[
              { v: 'newest' as SortBy, l: 'Newest', icon: Sparkles },
              { v: 'largest' as SortBy, l: 'Largest', icon: SortAsc },
              { v: 'smallest' as SortBy, l: 'Smallest', icon: Filter },
              { v: 'cheapest' as SortBy, l: 'Cheapest', icon: TrendingDown },
              { v: 'expensive' as SortBy, l: 'Expensive', icon: Tag },
            ].map((opt) => {
              const Icon = opt.icon;
              const active = sortBy === opt.v;
              return (
                <button
                  key={opt.v}
                  onClick={() => setSortBy(opt.v)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition ${
                    active ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {opt.l}
                </button>
              );
            })}
          </div>
        </div>

        {/* SCROLLABLE GRID */}
        <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-slate-50/30 to-white min-h-0">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-56 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-200 flex items-center justify-center shadow-inner">
                <AlertCircle className="h-12 w-12 text-violet-600" />
              </div>
              <div className="mt-4 font-extrabold text-slate-900 text-xl">
                {search ? `No pieces match "${search}"` : 'No cut pieces available'}
              </div>
              <p className="text-sm text-slate-500 mt-1 max-w-sm text-center font-semibold">
                {search
                  ? 'Try different keywords — piece code, roll number, size, or variant'
                  : 'Cut pieces auto-create hote hain jab carpet roll cut karte hain smaller customer width se'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((piece) => {
                const totalSqft = Number((piece as any).totalSqft || 0);
                const salePrice = Number((piece as any).salePrice || 0);
                const pricePerSqft = totalSqft > 0 ? salePrice / totalSqft : 0;
                const widthFt = Number((piece as any).widthFt || 0);
                const widthInch = Number((piece as any).widthInch || 0);
                const lengthFt = Number((piece as any).lengthFt || 0);
                const lengthInch = Number((piece as any).lengthInch || 0);
                const condition = (piece as any).condition;
                const isSpecialCondition = condition && condition !== 'Good';

                return (
                  <button
                    key={piece.id}
                    onClick={() => onSelect(piece)}
                    className="group rounded-2xl border-2 border-slate-200 bg-white overflow-hidden text-left hover:border-violet-500 hover:shadow-xl hover:shadow-violet-500/20 hover:-translate-y-1 transition-all"
                  >
                    {/* Top header strip */}
                    <div className="px-3 py-2 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between">
                      <div className="font-mono font-extrabold text-white text-sm truncate">
                        {piece.pieceCode}
                      </div>
                      <div className="h-7 w-7 rounded-lg bg-white/15 group-hover:bg-violet-500 text-white flex items-center justify-center transition shadow-sm shrink-0 ml-1">
                        <Check className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="p-3 space-y-2.5">
                      {/* Variant */}
                      {(piece as any).variant && (
                        <div className="text-xs font-extrabold text-violet-700 flex items-center gap-1.5 bg-violet-50 rounded-md px-2 py-1 border border-violet-200">
                          {(piece as any).variant.colorHex && (
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-white shadow-sm shrink-0"
                              style={{ backgroundColor: (piece as any).variant.colorHex }}
                            />
                          )}
                          <span className="truncate">{(piece as any).variant.name}</span>
                        </div>
                      )}

                      {/* Dimensions box */}
                      <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 p-2.5">
                        <div className="text-[10px] uppercase font-extrabold text-violet-700 flex items-center gap-0.5">
                          <Ruler className="h-2.5 w-2.5" />
                          Size
                        </div>
                        <div className="font-extrabold text-slate-900 text-sm tabular-nums mt-0.5">
                          {widthFt}ft{widthInch > 0 ? ` ${widthInch}in` : ''} × {lengthFt}ft{lengthInch > 0 ? ` ${lengthInch}in` : ''}
                        </div>
                        <div className="flex items-baseline gap-1 mt-1">
                          <div className="text-2xl font-extrabold text-violet-700 tabular-nums leading-none">
                            {totalSqft.toFixed(2)}
                          </div>
                          <div className="text-xs font-extrabold text-violet-700">sqft</div>
                        </div>
                      </div>

                      {/* Price + source */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-lg font-extrabold text-emerald-700 leading-none tabular-nums">
                            {formatPKRFull(salePrice)}
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                            {formatPKR(pricePerSqft)}/sqft
                          </div>
                        </div>
                        {(piece as any).sourceRoll && (
                          <div className="text-right shrink-0">
                            <div className="text-[9px] font-extrabold text-slate-500 uppercase">From</div>
                            <div className="text-[10px] font-mono font-extrabold text-emerald-700 truncate max-w-[80px]">
                              {(piece as any).sourceRoll.rollNumber}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Rack + condition badges */}
                      {((piece as any).rackNumber || isSpecialCondition) && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {(piece as any).rackNumber && (
                            <div className="inline-flex items-center gap-0.5 text-[10px] text-slate-700 font-bold bg-slate-100 rounded-md px-1.5 py-0.5">
                              <MapPin className="h-2.5 w-2.5" />
                              {(piece as any).rackNumber}
                            </div>
                          )}
                          {isSpecialCondition && (
                            <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-extrabold uppercase tracking-wider">
                              {condition}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom action strip */}
                    <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 group-hover:bg-violet-50 transition">
                      <div className="text-center text-xs font-extrabold text-slate-700 group-hover:text-violet-700 transition">
                        Tap to add to cart →
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t-2 border-slate-200 bg-white px-5 py-3 flex items-center justify-between gap-2 shrink-0">
          <div className="text-xs font-bold text-slate-600">
            {filtered.length > 0 && (
              <span>
                Showing <strong className="text-slate-900">{filtered.length}</strong> of{' '}
                <strong className="text-slate-900">{pieces.length}</strong> pieces
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-extrabold text-slate-600 hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
