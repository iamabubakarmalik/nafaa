import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, Scissors, Search, AlertCircle, Check, Ruler, Filter,
  Sparkles, Package, ArrowRight, TrendingDown, Award,
} from 'lucide-react';
import { formatPKR, formatPKRFull } from '@/lib/format';
import {
  carpetCutPiecesApi,
  type CarpetCutPiece,
} from '@/features/industries/carpet/api/carpet-cut-pieces.api';
import type { Product } from '@/api/products.api';
import type { ProductVariant } from '@/api/product-variants.api';

interface Props {
  product: Product;
  variant?: ProductVariant;
  onSelect: (piece: CarpetCutPiece) => void;
  onClose: () => void;
}

type SortBy = 'newest' | 'largest' | 'smallest' | 'cheapest';

export function CarpetCutPiecePicker({ product, variant, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  useEffect(() => {
    const t = setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>('[data-cutpiece-search]');
      el?.focus();
    }, 80);
    return () => clearTimeout(t);
  }, []);

  const { data: piecesData, isLoading } = useQuery({
    queryKey: ['carpet-cut-pieces-pos', product.id, variant?.id],
    queryFn: () =>
      carpetCutPiecesApi.list({
        productId: product.id,
        variantId: variant?.id,
        status: 'AVAILABLE',
        limit: 50,
      }),
  });

  const pieces = piecesData?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = q
      ? pieces.filter(
          (p) =>
            p.pieceCode.toLowerCase().includes(q) ||
            (p.notes || '').toLowerCase().includes(q) ||
            (p.sourceRoll?.rollNumber || '').toLowerCase().includes(q),
        )
      : [...pieces];

    result.sort((a, b) => {
      switch (sortBy) {
        case 'largest':
          return b.totalSqft - a.totalSqft;
        case 'smallest':
          return a.totalSqft - b.totalSqft;
        case 'cheapest':
          return a.salePrice - b.salePrice;
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [pieces, search, sortBy]);

  const totalSqft = useMemo(
    () => pieces.reduce((s, p) => s + p.totalSqft, 0),
    [pieces],
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-5xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* ═══ HEADER ═══ */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white shrink-0">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-pink-400/15 blur-2xl" />

          <div className="relative px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg ring-2 ring-white/20 shrink-0">
                <Scissors className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider mb-1 border border-white/20">
                  <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                  Cut Pieces Stock
                </div>
                <h3 className="font-extrabold text-lg leading-tight truncate">{product.name}</h3>
                <p className="text-[11px] text-white/80 font-semibold mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-0.5">
                    <Package className="h-2.5 w-2.5" />
                    {pieces.length} piece{pieces.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="text-violet-300 font-extrabold">
                    {totalSqft.toFixed(0)} sqft total
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 flex items-center justify-center transition shrink-0"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* ═══ SEARCH + SORT ═══ */}
        <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white space-y-2 shrink-0">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              data-cutpiece-search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search piece code, roll number..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-3.5 w-3.5 text-slate-500" />
              </button>
            )}
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {[
              { v: 'newest' as SortBy, l: 'Newest', icon: Sparkles },
              { v: 'largest' as SortBy, l: 'Largest', icon: Filter },
              { v: 'smallest' as SortBy, l: 'Smallest', icon: Filter },
              { v: 'cheapest' as SortBy, l: 'Cheapest', icon: TrendingDown },
            ].map((opt) => {
              const Icon = opt.icon;
              const active = sortBy === opt.v;
              return (
                <button
                  key={opt.v}
                  onClick={() => setSortBy(opt.v)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1 transition ${
                    active
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {opt.l}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ PIECES GRID ═══ */}
        <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-slate-50/30 to-white">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-200 flex items-center justify-center shadow-inner">
                <AlertCircle className="h-10 w-10 text-violet-600" />
              </div>
              <div className="mt-4 font-extrabold text-slate-900">No cut pieces</div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm text-center font-semibold">
                {search
                  ? 'Try different search'
                  : 'Cut pieces tab automatically create hote hain jab carpet roll cut karte hain aur leftover bachta hai'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((piece) => {
                const pricePerSqft = piece.totalSqft > 0 ? piece.salePrice / piece.totalSqft : 0;
                return (
                  <button
                    key={piece.id}
                    onClick={() => onSelect(piece)}
                    className="group rounded-2xl border-2 border-slate-200 bg-white p-3 text-left hover:border-violet-500 hover:shadow-xl hover:shadow-violet-500/20 hover:-translate-y-1 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-mono font-extrabold text-sm text-slate-900">
                        {piece.pieceCode}
                      </div>
                      <div className="h-7 w-7 rounded-lg bg-violet-100 group-hover:bg-violet-600 text-violet-700 group-hover:text-white flex items-center justify-center transition shadow-sm">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    {piece.variant && (
                      <div className="text-[10px] font-extrabold text-violet-700 flex items-center gap-1 mb-2 bg-violet-50 rounded-md px-1.5 py-0.5">
                        {piece.variant.colorHex && (
                          <span
                            className="h-2 w-2 rounded-full border border-white"
                            style={{ backgroundColor: piece.variant.colorHex }}
                          />
                        )}
                        <span className="truncate">{piece.variant.name}</span>
                      </div>
                    )}

                    <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 p-2 mb-2">
                      <div className="text-[8px] uppercase font-extrabold text-slate-500 flex items-center gap-0.5">
                        <Ruler className="h-2 w-2" />
                        Dimensions
                      </div>
                      <div className="font-extrabold text-slate-900 text-sm tabular-nums mt-0.5">
                        {piece.widthFt}ft × {piece.lengthFt}ft
                      </div>
                      <div className="text-xs font-extrabold text-violet-700 tabular-nums">
                        = {piece.totalSqft.toFixed(2)} sqft
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-lg font-extrabold text-emerald-700 leading-none tabular-nums">
                          {formatPKRFull(piece.salePrice)}
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 mt-0.5">
                          {formatPKR(pricePerSqft)}/sqft
                        </div>
                      </div>
                      {piece.sourceRoll && (
                        <div className="text-right shrink-0">
                          <div className="text-[8px] font-bold text-slate-500 uppercase">From</div>
                          <div className="text-[9px] font-mono font-extrabold text-slate-700 truncate max-w-[80px]">
                            {piece.sourceRoll.rollNumber}
                          </div>
                        </div>
                      )}
                    </div>

                    {piece.condition && piece.condition !== 'Good' && (
                      <div className="mt-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase tracking-wider">
                        {piece.condition}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
