import { useState, useMemo, useEffect } from 'react';
import { X, Package, Check, Search, AlertCircle } from 'lucide-react';
import { Input, Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import type { Product } from '@modules/inventory/products/api/products.api';
import { freeVariantStock, type ProductVariant } from '@modules/inventory/products/api/product-variants.api';

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
    return variants.filter((v) => v.isActive).reduce((s, v) => s + Math.max(freeVariantStock(v), 0), 0);
  }, [variants, ignoreStock]);

  const activeCount = variants.filter((v) => v.isActive).length;
  const stockLine = ignoreStock
    ? 'Stock rolls me'
    : `${totalStock.toFixed(totalStock % 1 === 0 ? 0 : 1)} Stock`;

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={product.name}
      description={`Variant chunein · ${filtered.length} / ${activeCount} Variant · ${stockLine}`}
    >
      <div className="sticky -top-4 z-10 -mx-5 -mt-4 mb-4 border-b border-slate-100 bg-white px-5 py-3">
        <Input
          data-variant-search
          data-autofocus
          size="lg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Naam, SKU, rang ya size se Variant dhoondein"
          leftIcon={<Search className="h-5 w-5" />}
          rightIcon={search ? (
            <button
              type="button"
              aria-label="Saaf karein"
              onClick={() => setSearch('')}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          ) : undefined}
        />
      </div>

      <div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-inner">
              <AlertCircle className="h-10 w-10 text-slate-400" />
            </div>
            <div className="mt-4 font-semibold text-slate-900 text-lg">Koi Variant nahi mila</div>
            <div className="text-sm text-slate-500 mt-1 font-semibold">
              {search ? 'Kuch aur likh kar dhoondein' : 'Koi active Variant nahi'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((v) => {
              // Pieces held for customers are not offered for sale.
              const free = freeVariantStock(v);
              const held = Math.max(Number(v.reserved ?? 0), 0);
              const outOfStock = ignoreStock ? false : free <= 0;
              const lowStock = ignoreStock ? false : free > 0 && free <= (v.lowStockAlert || 5);

              return (
                <button
                  key={v.id}
                  disabled={outOfStock}
                  onClick={() => onSelect(v)}
                  className={`group relative rounded-2xl border overflow-hidden text-left transition-all ${
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
                        <span className="px-3 py-1.5 rounded-full bg-white text-rose-700 text-xs font-semibold shadow-lg uppercase tracking-wider">
                          Stock khatam
                        </span>
                      </div>
                    ) : lowStock ? (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[0.6875rem] font-semibold shadow-md ring-2 ring-white animate-pulse">
                        Kam
                      </div>
                    ) : null}

                    {!outOfStock && (
                      <div className="absolute inset-0 bg-violet-900/0 group-hover:bg-violet-900/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="h-12 w-12 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-xl scale-90 group-hover:scale-100 transition-transform">
                          <Check className="h-6 w-6" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      {v.colorHex && (
                        <span
                          className="h-3 w-3 rounded-full border border-white shadow shrink-0 ring-1 ring-slate-200"
                          style={{ backgroundColor: v.colorHex }}
                        />
                      )}
                      <div className="font-semibold text-slate-900 text-base truncate">
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
                      <div className="text-lg font-semibold text-emerald-700 tabular-nums leading-none">
                        {formatPKR(v.price)}
                      </div>
                      <div className="text-xs font-semibold text-right shrink-0">
                        {ignoreStock ? (
                          <span className="text-emerald-700">Rolls</span>
                        ) : outOfStock ? (
                          <span className="text-rose-700">0</span>
                        ) : lowStock ? (
                          <span className="text-amber-700">
                            {free.toFixed(free % 1 === 0 ? 0 : 1)}
                          </span>
                        ) : (
                          <span className="text-slate-700">
                            {free.toFixed(free % 1 === 0 ? 0 : 1)} {v.unit || product.unit}
                          </span>
                        )}
                        {!ignoreStock && held > 0 && (
                          <div className="text-[0.6875rem] text-amber-700">{held} hold par</div>
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
    </Modal>
  );
}
