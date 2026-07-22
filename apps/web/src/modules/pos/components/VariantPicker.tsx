import { useState, useMemo, useEffect } from 'react';
import {
  X, Package, Check, Search, AlertCircle, Sparkles, Layers,
} from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import type { Product } from '@modules/inventory/products/api/products.api';
import type { ProductVariant } from '@modules/inventory/products/api/product-variants.api';

interface Props {
  product: Product;
  variants: ProductVariant[];
  onSelect: (variant: ProductVariant) => void;
  onClose: () => void;
  ignoreStock?: boolean;
}

export function VariantPicker({ product, variants, onSelect, onClose, ignoreStock = false }: Props) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>('[data-variant-search]');
      el?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, []);

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

  const totalStock = useMemo(() => {
    if (ignoreStock) return 0;
    return variants.filter((v) => v.isActive).reduce((s, v) => s + v.stock, 0);
  }, [variants, ignoreStock]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-5xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white shrink-0">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-pink-400/15 blur-2xl" />

          <div className="relative px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg ring-2 ring-white/20 shrink-0">
                <Layers className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider mb-1 border border-white/20">
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  Select Variant
                </div>
                <h3 className="font-extrabold text-xl leading-tight truncate">{product.name}</h3>
                <p className="text-sm text-white/80 font-semibold mt-1">
                  {filtered.length} of {variants.filter(v => v.isActive).length} variants
                  {!ignoreStock && ` • ${totalStock.toFixed(totalStock % 1 === 0 ? 0 : 1)} total stock`}
                  {ignoreStock && ` • stock in rolls`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 flex items-center justify-center transition shrink-0"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white shrink-0">
          <div className="relative">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              data-variant-search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search variant by name, SKU, color, size..."
              className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-11 pr-11 text-base font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition shadow-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-slate-50/30 to-white min-h-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-inner">
                <AlertCircle className="h-10 w-10 text-slate-400" />
              </div>
              <div className="mt-4 font-extrabold text-slate-900 text-lg">No variants found</div>
              <div className="text-sm text-slate-500 mt-1 font-semibold">
                {search ? 'Try different search' : 'No active variants'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((v) => {
                const outOfStock = ignoreStock ? false : v.stock <= 0;
                const lowStock = ignoreStock ? false : v.stock > 0 && v.stock <= (v.lowStockAlert || 5);

                return (
                  <button
                    key={v.id}
                    disabled={outOfStock}
                    onClick={() => onSelect(v)}
                    className={`group relative rounded-2xl border-2 overflow-hidden text-left transition-all ${
                      outOfStock
                        ? 'border-slate-200 opacity-50 cursor-not-allowed'
                        : 'border-slate-200 bg-white hover:border-violet-500 hover:shadow-xl hover:shadow-violet-500/20 hover:-translate-y-1'
                    }`}
                  >
                    <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden relative">
                      {v.imageUrl ? (
                        <img
                          src={v.imageUrl}
                          alt={v.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : v.colorHex ? (
                        <div className="w-full h-full" style={{ backgroundColor: v.colorHex }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-100 via-white to-pink-100">
                          <Package className="h-10 w-10 text-violet-400" />
                        </div>
                      )}

                      {outOfStock ? (
                        <div className="absolute inset-0 bg-rose-500/85 flex items-center justify-center backdrop-blur-sm">
                          <span className="px-3 py-1.5 rounded-full bg-white text-rose-700 text-xs font-extrabold shadow-lg uppercase tracking-wider">
                            Out of Stock
                          </span>
                        </div>
                      ) : lowStock ? (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold shadow-md ring-2 ring-white animate-pulse">
                          LOW
                        </div>
                      ) : null}

                      {!outOfStock && (
                        <div className="absolute inset-0 bg-violet-900/0 group-hover:bg-violet-900/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="h-12 w-12 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                            <Check className="h-6 w-6" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        {v.colorHex && (
                          <span
                            className="h-3 w-3 rounded-full border-2 border-white shadow shrink-0 ring-1 ring-slate-200"
                            style={{ backgroundColor: v.colorHex }}
                          />
                        )}
                        <div className="font-extrabold text-slate-900 text-base truncate">
                          {v.name}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold flex-wrap">
                        {v.sku && <span className="font-mono truncate">{v.sku}</span>}
                        {v.size && (
                          <>
                            {v.sku && <span>•</span>}
                            <span>{v.size}</span>
                          </>
                        )}
                      </div>

                      <div className="pt-1 flex items-end justify-between gap-2">
                        <div className="text-lg font-extrabold text-emerald-700 tabular-nums leading-none">
                          {formatPKR(v.price)}
                        </div>
                        <div className="text-xs font-extrabold text-right shrink-0">
                          {ignoreStock ? (
                            <span className="text-emerald-700">Rolls</span>
                          ) : outOfStock ? (
                            <span className="text-rose-700">0</span>
                          ) : lowStock ? (
                            <span className="text-amber-700">
                              {v.stock.toFixed(v.stock % 1 === 0 ? 0 : 1)}
                            </span>
                          ) : (
                            <span className="text-slate-700">
                              {v.stock.toFixed(v.stock % 1 === 0 ? 0 : 1)} {v.unit || product.unit}
                            </span>
                          )}
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
