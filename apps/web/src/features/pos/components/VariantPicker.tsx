import { useState, useMemo } from 'react';
import { X, Package, Check, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import type { Product } from '@/api/products.api';
import type { ProductVariant } from '@/api/product-variants.api';

interface Props {
  product: Product;
  variants: ProductVariant[];
  onSelect: (variant: ProductVariant) => void;
  onClose: () => void;
}

export function VariantPicker({ product, variants, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const active = variants.filter((v) => v.isActive);
    if (!q) return active;
    return active.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.sku || '').toLowerCase().includes(q) ||
        (v.barcode || '').toLowerCase().includes(q) ||
        (v.color || '').toLowerCase().includes(q) ||
        (v.size || '').toLowerCase().includes(q),
    );
  }, [variants, search]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full sm:max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-violet-50 to-pink-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shrink-0">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-violet-700 font-bold">
                Select Variant
              </div>
              <h3 className="font-bold text-slate-900 truncate">{product.name}</h3>
              <p className="text-xs text-slate-500 truncate">
                {variants.length} variant{variants.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 transition"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU, color, size..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5 text-slate-500" />
              </button>
            )}
          </div>
        </div>

        {/* Variants grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <AlertCircle className="h-7 w-7 text-slate-400" />
              </div>
              <div className="font-bold text-slate-700">No variants found</div>
              <div className="text-xs text-slate-500 mt-1">
                {search ? `Try different search` : 'No active variants for this product'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((v) => {
                const outOfStock = v.stock <= 0;
                const lowStock = v.stock > 0 && v.stock <= (v.lowStockAlert || 5);

                return (
                  <button
                    key={v.id}
                    disabled={outOfStock}
                    onClick={() => onSelect(v)}
                    className={`group relative rounded-2xl border-2 overflow-hidden text-left transition-all ${
                      outOfStock
                        ? 'border-slate-200 opacity-50 cursor-not-allowed'
                        : 'border-slate-200 bg-white hover:border-brand-500 hover:shadow-xl hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Image */}
                    <div className="aspect-square bg-slate-100 overflow-hidden relative">
                      {v.imageUrl ? (
                        <img
                          src={v.imageUrl}
                          alt={v.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : v.colorHex ? (
                        <div
                          className="w-full h-full"
                          style={{ backgroundColor: v.colorHex }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                          <Package className="h-10 w-10 text-slate-400" />
                        </div>
                      )}

                      {/* Stock badge */}
                      {outOfStock ? (
                        <div className="absolute inset-0 bg-rose-500/80 flex items-center justify-center">
                          <span className="px-3 py-1 rounded-full bg-white text-rose-700 text-[10px] font-extrabold shadow-lg">
                            OUT OF STOCK
                          </span>
                        </div>
                      ) : lowStock ? (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow">
                          LOW STOCK
                        </div>
                      ) : null}
                    </div>

                    {/* Body */}
                    <div className="p-3 space-y-1">
                      <div className="flex items-center gap-1.5">
                        {v.colorHex && (
                          <span
                            className="h-3 w-3 rounded-full border border-slate-300 shrink-0"
                            style={{ backgroundColor: v.colorHex }}
                          />
                        )}
                        <div className="font-bold text-slate-900 text-sm truncate">
                          {v.name}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                        {v.sku && <span className="font-mono truncate">{v.sku}</span>}
                        {v.size && <span>• {v.size}</span>}
                      </div>

                      <div className="pt-1 flex items-end justify-between">
                        <div className="text-base font-extrabold text-emerald-700">
                          {formatPKR(v.price)}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500">
                          {v.stock.toFixed(v.stock % 1 === 0 ? 0 : 2)} {v.unit || product.unit}
                        </div>
                      </div>
                    </div>
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
