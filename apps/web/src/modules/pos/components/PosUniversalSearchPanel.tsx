import { useMemo } from 'react';
import {
  Search, Package, Layers, Scissors, ChevronRight, Hash, Smartphone, Sparkles,
} from 'lucide-react';
import type { Product } from '@modules/inventory/products/api/products.api';
import type { ProductVariant } from '@modules/inventory/products/api/product-variants.api';
import type { CarpetRoll } from '@industries/carpet/api/carpet-rolls.api';
import type { CarpetCutPiece } from '@industries/carpet/api/carpet-cut-pieces.api';
import { formatPKR } from '@core/lib/format';

interface Props {
  query: string;
  products: Product[];
  rolls: CarpetRoll[];
  cutPieces: CarpetCutPiece[];
  onPickProduct: (product: Product) => void;
  onPickRoll: (payload: {
    product: Product;
    variant?: ProductVariant;
    roll: CarpetRoll;
  }) => void;
  onPickCutPiece: (payload: {
    product: Product;
    variant?: ProductVariant;
    piece: CarpetCutPiece;
  }) => void;
}

type ResultItem =
  | { kind: 'product'; score: number; product: Product }
  | { kind: 'roll'; score: number; product: Product; variant?: ProductVariant; roll: CarpetRoll }
  | { kind: 'piece'; score: number; product: Product; variant?: ProductVariant; piece: CarpetCutPiece };

function rank(q: string, fields: Array<string | number | null | undefined>) {
  const query = q.trim().toLowerCase();
  if (!query) return -1;

  let best = -1;

  for (const raw of fields) {
    const value = String(raw ?? '').toLowerCase().trim();
    if (!value) continue;

    if (value === query) best = Math.max(best, 1000);
    else if (value.startsWith(query)) best = Math.max(best, 700);
    else if (value.includes(query)) best = Math.max(best, 400);

    if (value.replace(/\s+/g, '') === query.replace(/\s+/g, '')) {
      best = Math.max(best, 900);
    }
  }

  return best;
}

export function PosUniversalSearchPanel({
  query,
  products,
  rolls,
  cutPieces,
  onPickProduct,
  onPickRoll,
  onPickCutPiece,
}: Props) {
  const q = query.trim().toLowerCase();

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const results = useMemo(() => {
    if (q.length < 2) return [] as ResultItem[];

    const items: ResultItem[] = [];

    // Products
    for (const product of products) {
      const score = rank(q, [
        product.name,
        product.sku,
        product.barcode,
        product.category?.name,
      ]);
      if (score > -1) {
        items.push({ kind: 'product', score, product });
      }
    }

    // Rolls
    for (const roll of rolls) {
      const productId =
        (roll as any).productId ||
        (roll as any).product?.id ||
        (roll as any).variant?.productId;

      if (!productId) continue;

      const product = productMap.get(productId);
      if (!product) continue;

      const variant = (roll as any).variant as ProductVariant | undefined;

      const score = rank(q, [
        roll.rollNumber,
        (roll as any).designCode,
        (roll as any).rackNumber,
        product.name,
        variant?.name,
      ]);

      if (score > -1) {
        items.push({ kind: 'roll', score: score + 30, product, variant, roll });
      }
    }

    // Cut Pieces
    for (const piece of cutPieces) {
      const productId =
        (piece as any).productId ||
        (piece as any).product?.id ||
        (piece as any).variant?.productId;

      if (!productId) continue;

      const product = productMap.get(productId);
      if (!product) continue;

      const variant = (piece as any).variant as ProductVariant | undefined;

      const score = rank(q, [
        piece.pieceCode,
        (piece as any).notes,
        (piece as any).sourceRoll?.rollNumber,
        product.name,
        variant?.name,
      ]);

      if (score > -1) {
        items.push({ kind: 'piece', score: score + 20, product, variant, piece });
      }
    }

    return items
      .sort((a, b) => b.score - a.score)
      .slice(0, 18);
  }, [q, products, rolls, cutPieces, productMap]);

  if (q.length < 2) return null;

  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-emerald-200 bg-white/80">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <Search className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-slate-900">Fast Search Results</div>
            <div className="text-xs text-slate-500 font-semibold">
              Product, roll, cut piece — sab ek jagah
            </div>
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center">
            <Search className="h-7 w-7 text-slate-400" />
          </div>
          <div className="mt-3 text-base font-extrabold text-slate-700">No instant match</div>
          <div className="text-sm text-slate-500 font-semibold mt-1">
            Neeche normal product grid bhi available hai
          </div>
        </div>
      ) : (
        <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
          {results.map((item, idx) => {
            if (item.kind === 'product') {
              const p = item.product;
              const outOfStock = p.stock <= 0;

              return (
                <button
                  key={`p-${p.id}-${idx}`}
                  onClick={() => onPickProduct(p)}
                  className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition flex items-center gap-3"
                >
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {p.images?.[0]?.url ? (
                      <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-base font-extrabold text-slate-900 truncate">{p.name}</div>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                        Product
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold mt-0.5">
                      {p.sku || p.barcode || '—'}
                      {p.category?.name ? ` • ${p.category.name}` : ''}
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-extrabold text-emerald-700">{formatPKR(p.price)}</div>
                      <div className={`text-xs font-extrabold ${outOfStock ? 'text-rose-700' : 'text-slate-600'}`}>
                        {outOfStock ? 'OUT' : `${p.stock.toFixed(p.stock % 1 === 0 ? 0 : 2)} ${p.unit}`}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </button>
              );
            }

            if (item.kind === 'roll') {
              const { roll, product, variant } = item;
              return (
                <button
                  key={`r-${roll.id}-${idx}`}
                  onClick={() => onPickRoll({ product, variant, roll })}
                  className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition flex items-center gap-3"
                >
                  <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <Layers className="h-5 w-5 text-emerald-700" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-base font-extrabold text-slate-900 truncate">
                        {roll.rollNumber}
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase">
                        Roll
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-700 truncate">
                      {product.name}
                      {variant?.name ? ` • ${variant.name}` : ''}
                    </div>

                    <div className="text-xs text-slate-500 font-semibold mt-0.5">
                      {(roll as any).designCode || ''}
                      {(roll as any).rackNumber ? ` • Rack: ${(roll as any).rackNumber}` : ''}
                    </div>

                    <div className="mt-1 flex items-center gap-3 flex-wrap">
                      <div className="text-sm font-extrabold text-emerald-700">
                        {Number(roll.remainingSqft).toFixed(2)} sqft
                      </div>
                      <div className="text-xs font-extrabold text-slate-600">
                        {Number(roll.widthFt)}ft{Number((roll as any).widthInch || 0) > 0 ? ` ${Number((roll as any).widthInch)}in` : ''}
                      </div>
                      <div className="text-xs font-extrabold text-amber-700">
                        {formatPKR(Number((roll as any).salePricePerSqft || 0))}/sqft
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </button>
              );
            }

            const { piece, product, variant } = item;
            return (
              <button
                key={`cp-${piece.id}-${idx}`}
                onClick={() => onPickCutPiece({ product, variant, piece })}
                className="w-full text-left px-4 py-3 hover:bg-violet-50 transition flex items-center gap-3"
              >
                <div className="h-12 w-12 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
                  <Scissors className="h-5 w-5 text-violet-700" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-base font-extrabold text-slate-900 truncate">
                      {piece.pieceCode}
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[10px] font-extrabold uppercase">
                      Cut Piece
                    </span>
                  </div>

                  <div className="text-sm font-bold text-slate-700 truncate">
                    {product.name}
                    {variant?.name ? ` • ${variant.name}` : ''}
                  </div>

                  <div className="mt-1 flex items-center gap-3 flex-wrap">
                    <div className="text-sm font-extrabold text-violet-700">
                      {Number((piece as any).totalSqft || 0).toFixed(2)} sqft
                    </div>
                    <div className="text-xs font-extrabold text-slate-600">
                      {(piece as any).widthFt}ft × {(piece as any).lengthFt}ft
                    </div>
                    <div className="text-xs font-extrabold text-emerald-700">
                      {formatPKR(Number((piece as any).salePrice || 0))}
                    </div>
                    {(piece as any).sourceRoll?.rollNumber && (
                      <div className="text-xs font-extrabold text-slate-500">
                        From: {(piece as any).sourceRoll.rollNumber}
                      </div>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/70 text-[11px] text-slate-600 font-bold flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-emerald-600" />
        Tip: roll number ya piece code likhte hi direct result upar aa jayega
      </div>
    </div>
  );
}
