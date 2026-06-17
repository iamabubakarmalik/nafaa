import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Scissors, Search, AlertCircle, Check, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKRFull } from '@/lib/format';
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

export function CarpetCutPiecePicker({ product, variant, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');

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
    if (!q) return pieces;
    return pieces.filter(
      (p) =>
        p.pieceCode.toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q) ||
        (p.sourceRoll?.rollNumber || '').toLowerCase().includes(q),
    );
  }, [pieces, search]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-violet-50 to-purple-50 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shrink-0">
              <Scissors className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-violet-700 font-bold">
                Select Cut Piece
              </div>
              <h3 className="font-bold text-slate-900 truncate">{product.name}</h3>
              <p className="text-xs text-slate-600">
                {pieces.length} piece{pieces.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by piece code, roll number..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="h-12 w-12 text-slate-300 mb-3" />
              <div className="font-bold text-slate-700">No cut pieces available</div>
              <p className="text-xs text-slate-500 mt-1 max-w-xs text-center">
                {search
                  ? 'Try different search'
                  : 'Cut pieces tab create hote hain jab roll se cutting hoti hai aur bacha tukra reh jata hai'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((piece) => (
                <button
                  key={piece.id}
                  onClick={() => onSelect(piece)}
                  className="group rounded-2xl border-2 border-slate-200 bg-white p-4 text-left hover:border-violet-500 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-mono font-extrabold text-sm text-slate-900">
                      {piece.pieceCode}
                    </div>
                    <div className="h-6 w-6 rounded-full bg-violet-100 group-hover:bg-violet-600 text-violet-700 group-hover:text-white flex items-center justify-center transition">
                      <Check className="h-3 w-3" />
                    </div>
                  </div>

                  {piece.variant && (
                    <div className="text-[11px] font-bold text-violet-700 flex items-center gap-1 mb-2">
                      {piece.variant.colorHex && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: piece.variant.colorHex }}
                        />
                      )}
                      {piece.variant.name}
                    </div>
                  )}

                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                    <div className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1">
                      <Ruler className="h-2.5 w-2.5" />
                      Size
                    </div>
                    <div className="font-extrabold text-slate-900 text-sm">
                      {piece.widthFt}ft × {piece.lengthFt}ft
                    </div>
                    <div className="text-xs font-bold text-violet-700">
                      {piece.totalSqft.toFixed(2)} sqft
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="text-lg font-extrabold text-emerald-700">
                      {formatPKRFull(piece.salePrice)}
                    </div>
                    {piece.sourceRoll && (
                      <div className="text-[9px] font-mono font-bold text-slate-500">
                        from {piece.sourceRoll.rollNumber}
                      </div>
                    )}
                  </div>

                  {piece.condition && piece.condition !== 'Good' && (
                    <div className="mt-1 text-[10px] font-bold text-amber-700">
                      {piece.condition}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
