import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, X, Package, Sparkles, Eye, ShoppingBag, Share2,
} from 'lucide-react';
import { productsApi, type Product } from '@/api/products.api';
import { categoriesApi } from '@/api/categories.api';
import { productVariantsApi } from '@/api/product-variants.api';
import { formatPKRFull } from '@/lib/format';
import { toast } from 'sonner';

export default function CatalogPage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cleanMode, setCleanMode] = useState(false);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['catalog-products', search, categoryId],
    queryFn: () => productsApi.list({
      search,
      categoryId: categoryId || undefined,
      isActive: true,
      limit: 100,
    }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const products = productsData?.items ?? [];

  const sharePage = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: 'Our Catalog', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Catalog link copied to clipboard');
    }
  };

  return (
    <div className={cleanMode ? 'fixed inset-0 z-50 bg-slate-50 overflow-auto' : 'space-y-6'}>
      {/* Header */}
      {!cleanMode && (
        <section className="rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-6 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Product Catalog
              </div>
              <h1 className="mt-3 text-3xl font-bold">Showcase your products</h1>
              <p className="mt-2 text-sm text-white/80 max-w-2xl">
                Customer ko apna phone/laptop dikhao — products beautifully dikhenge. Cost / wholesale hidden hain.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={sharePage}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur text-white text-sm font-bold transition"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
              <button
                onClick={() => setCleanMode(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-emerald-700 text-sm font-bold hover:bg-slate-100 shadow-lg"
              >
                <Eye className="h-4 w-4" /> Customer View
              </button>
            </div>
          </div>
        </section>
      )}

      {cleanMode && (
        <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">Our Products</h1>
            <button
              onClick={() => setCleanMode(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-bold text-slate-700"
            >
              <X className="h-4 w-4 inline" /> Exit View
            </button>
          </div>
        </div>
      )}

      <div className={cleanMode ? 'max-w-7xl mx-auto p-4' : ''}>
        {/* Search & Filters */}
        <div className="flex gap-2 flex-wrap mb-5">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-12 rounded-xl border-2 border-slate-200 bg-white px-4 text-sm font-bold focus:outline-none focus:border-emerald-500"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Stats */}
        {!cleanMode && (
          <div className="text-sm text-slate-500 mb-4">
            Showing <strong className="text-slate-900">{products.length}</strong> products
          </div>
        )}

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
            <Package className="h-16 w-16 text-slate-300 mx-auto" />
            <h3 className="mt-4 text-lg font-bold text-slate-900">No products found</h3>
            <p className="text-sm text-slate-500 mt-1">Try changing search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((p) => (
              <CatalogCard
                key={p.id}
                product={p}
                onClick={() => setSelectedProduct(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          productId={selectedProduct.id}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

// ─── Product Card ───────────────────────────────────────────────────────
function CatalogCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const primaryImage = product.images?.[0]?.url;
  const variantCount = product._count?.variants ?? 0;

  return (
    <button
      onClick={onClick}
      className="group relative rounded-2xl bg-white border-2 border-slate-200 overflow-hidden hover:border-emerald-400 hover:shadow-xl transition-all text-left"
    >
      {product.isFeatured && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-lg">
          ⭐ FEATURED
        </div>
      )}

      <div className="aspect-square bg-slate-100 overflow-hidden relative">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <Package className="h-12 w-12 text-slate-400" />
          </div>
        )}

        {variantCount > 0 && (
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-slate-900/80 backdrop-blur text-white text-[10px] font-bold">
            {variantCount} variants
          </div>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        {product.brand && (
          <div className="text-[10px] uppercase tracking-wider text-violet-700 font-bold truncate">
            {product.brand.name}
          </div>
        )}
        <h3 className="font-bold text-slate-900 line-clamp-2 leading-tight text-sm">
          {product.name}
        </h3>
        <div className="flex items-end justify-between pt-1">
          <div className="text-emerald-700 font-bold text-base">
            {formatPKRFull(product.price)}
          </div>
          <div className="text-[10px] text-slate-500 font-semibold">
            / {product.unit}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Product Detail Modal (with variants) ───────────────────────────────
function ProductDetailModal({ productId, onClose }: { productId: string; onClose: () => void }) {
  const { data: product, isLoading } = useQuery({
    queryKey: ['catalog-product', productId],
    queryFn: () => productsApi.getOne(productId),
  });

  const { data: variants = [] } = useQuery({
    queryKey: ['catalog-variants', productId],
    queryFn: () => productVariantsApi.list(productId),
  });

  const activeVariants = useMemo(
    () => variants.filter((v) => v.isActive !== false),
    [variants]
  );

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId);

  const displayImage =
    selectedVariant?.imageUrl ||
    product?.images?.find((i) => i.isPrimary)?.url ||
    product?.images?.[0]?.url;

  const displayPrice = selectedVariant?.price ?? product?.price ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-4xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[95vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <div className="font-bold text-slate-900 truncate">{product?.name}</div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
          >
            <X className="h-5 w-5 text-slate-700" />
          </button>
        </div>

        {isLoading || !product ? (
          <div className="p-12 text-center">
            <div className="inline-block h-10 w-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-0">
            {/* Image side */}
            <div className="bg-slate-100 aspect-square md:aspect-auto md:min-h-[400px] relative">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-slate-400" />
                </div>
              )}
            </div>

            {/* Details side */}
            <div className="p-6 space-y-5">
              {product.brand && (
                <div className="text-xs uppercase tracking-wider text-violet-700 font-bold">
                  {product.brand.name}
                </div>
              )}

              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">{product.name}</h2>
                {product.shortDescription && (
                  <p className="text-sm text-slate-600 mt-2">{product.shortDescription}</p>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-extrabold text-emerald-700">
                  {formatPKRFull(displayPrice)}
                </div>
                <div className="text-sm text-slate-500 font-bold">/ {product.unit}</div>
              </div>

              {product.description && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {product.description}
                </div>
              )}

              {activeVariants.length > 0 && (
                <div>
                  <div className="text-sm font-bold text-slate-900 mb-3">
                    Available Variants ({activeVariants.length})
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {activeVariants.map((v) => {
                      const isSelected = selectedVariantId === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariantId(isSelected ? null : v.id)}
                          className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                            isSelected
                              ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-lg'
                              : 'border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <div className="aspect-square bg-slate-100">
                            {v.imageUrl ? (
                              <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" />
                            ) : v.colorHex ? (
                              <div
                                className="w-full h-full"
                                style={{ backgroundColor: v.colorHex }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="px-2 py-1.5 bg-white">
                            <div className="text-[11px] font-bold text-slate-900 truncate">
                              {v.size || v.color || v.name}
                            </div>
                            <div className="text-[10px] text-emerald-700 font-bold">
                              {formatPKRFull(v.price)}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow">
                              ✓
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedVariant && (
                    <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm">
                      <div className="font-bold text-emerald-900">{selectedVariant.name}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-emerald-800">
                        {selectedVariant.sku && <span>SKU: <strong>{selectedVariant.sku}</strong></span>}
                        {selectedVariant.size && <span>Code: <strong>{selectedVariant.size}</strong></span>}
                        {selectedVariant.color && <span>Color: <strong>{selectedVariant.color}</strong></span>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    const text = `${product.name}\nPrice: ${formatPKRFull(displayPrice)} / ${product.unit}`;
                    navigator.clipboard.writeText(text);
                    toast.success('Product details copied');
                  }}
                  className="flex-1 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm inline-flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="h-4 w-4" /> Copy details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
