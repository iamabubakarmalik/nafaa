import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Printer, ScanLine, Plus, Minus, Search, X, Settings2,
  Building2, DollarSign, Package, Layers, AlertCircle,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { productsApi, type Product } from '@/api/products.api';
import { productVariantsApi, type ProductVariant } from '@/api/product-variants.api';
import { categoriesApi } from '@/api/categories.api';
import { settingsApi } from '@/api/settings.api';
import { Button } from '@/components/ui/Button';
import { formatPKRFull } from '@/lib/format';
import { toast } from 'sonner';

interface LabelItem {
  id: string; // composite: productId or productId__variantId
  product: Product;
  variant?: ProductVariant;
  copies: number;
}

type LabelSize = 'small' | 'medium' | 'large';

const SIZE_CONFIG = {
  small: {
    label: 'Small (40×25mm)',
    cols: 5,
    barcodeHeight: 30,
    barcodeWidth: 1.2,
    fontSize: 9,
    cardPadding: 'p-1.5',
    nameSize: 'text-[8px]',
    priceSize: 'text-[10px]',
  },
  medium: {
    label: 'Medium (50×30mm)',
    cols: 4,
    barcodeHeight: 40,
    barcodeWidth: 1.4,
    fontSize: 10,
    cardPadding: 'p-2',
    nameSize: 'text-[10px]',
    priceSize: 'text-xs',
  },
  large: {
    label: 'Large (70×40mm)',
    cols: 3,
    barcodeHeight: 50,
    barcodeWidth: 1.6,
    fontSize: 12,
    cardPadding: 'p-2.5',
    nameSize: 'text-xs',
    priceSize: 'text-sm',
  },
};

function BarcodeImage({
  value,
  height,
  width,
  fontSize,
}: {
  value: string;
  height: number;
  width: number;
  fontSize: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, {
          format: 'CODE128',
          width,
          height,
          fontSize,
          margin: 2,
          displayValue: true,
        });
      } catch (e) {
        // ignore
      }
    }
  }, [value, height, width, fontSize]);
  return <svg ref={ref} />;
}

export default function BarcodeLabelsPage() {
  const [selected, setSelected] = useState<LabelItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [labelSize, setLabelSize] = useState<LabelSize>('medium');
  const [showShopName, setShowShopName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showCategory, setShowCategory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { data: productsData } = useQuery({
    queryKey: ['products-for-labels'],
    queryFn: () => productsApi.list({ page: 1, limit: 500 }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const products = productsData?.items ?? [];

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      if (!p.barcode) return false;
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      );
    });
  }, [products, search, categoryFilter]);

  const labelsToPrint = useMemo(
    () =>
      selected.flatMap((item) =>
        Array.from({ length: item.copies }, (_, i) => ({
          ...item,
          _key: `${item.id}-${i}`,
        })),
      ),
    [selected],
  );

  const addProduct = async (product: Product) => {
    if (product.hasVariants) {
      // Load variants and add each
      try {
        const variants = await productVariantsApi.list(product.id);
        const active = variants.filter((v) => v.isActive && v.barcode);
        if (active.length === 0) {
          toast.error('No variants with barcodes — use product barcode');
          addOneItem(product, undefined);
          return;
        }
        // Add all active variants
        let added = 0;
        active.forEach((v) => {
          addOneItem(product, v);
          added++;
        });
        toast.success(`${added} variants added`);
      } catch {
        toast.error('Failed to load variants');
      }
      return;
    }
    addOneItem(product, undefined);
  };

  const addOneItem = (product: Product, variant?: ProductVariant) => {
    const id = variant ? `${product.id}__${variant.id}` : product.id;
    setSelected((prev) => {
      const existing = prev.find((p) => p.id === id);
      if (existing) {
        return prev.map((p) =>
          p.id === id ? { ...p, copies: p.copies + 1 } : p,
        );
      }
      return [...prev, { id, product, variant, copies: 1 }];
    });
  };

  const updateCopies = (id: string, delta: number) => {
    setSelected((prev) =>
      prev
        .map((p) =>
          p.id === id ? { ...p, copies: Math.max(0, p.copies + delta) } : p,
        )
        .filter((p) => p.copies > 0),
    );
  };

  const setCopies = (id: string, copies: number) => {
    setSelected((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, copies: Math.max(0, copies) } : p))
        .filter((p) => p.copies > 0),
    );
  };

  const removeItem = (id: string) => {
    setSelected((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePrint = () => {
    if (selected.length === 0) {
      toast.error('Pehle products select karein');
      return;
    }
    window.print();
  };

  const handleAddAll = () => {
    filteredProducts.forEach((p) => addOneItem(p, undefined));
    toast.success(`${filteredProducts.length} products added`);
  };

  const handleClear = () => {
    setSelected([]);
  };

  const config = SIZE_CONFIG[labelSize];
  const shopName = (settings as any)?.shopName || 'Shop';

  return (
    <div className="space-y-6 print:space-y-0">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-700 text-white p-6 shadow-xl print:hidden">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
              <ScanLine className="h-3.5 w-3.5" />
              Print Labels
            </div>
            <h2 className="mt-3 text-3xl font-bold">Barcode Labels</h2>
            <p className="mt-2 text-sm text-white/80">
              Print stickers for products and variants — thermal/A4 supported
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur text-white text-sm font-bold inline-flex items-center gap-2 transition"
            >
              <Settings2 className="h-4 w-4" />
              {showSettings ? 'Hide' : 'Settings'}
            </button>
            <Button
              size="lg"
              onClick={handlePrint}
              disabled={labelsToPrint.length === 0}
              className="bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print {labelsToPrint.length} Labels
            </Button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="mt-5 rounded-2xl bg-white/10 backdrop-blur p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-white/70 block mb-1.5">
                Label Size
              </label>
              <select
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value as LabelSize)}
                className="h-10 w-full rounded-lg bg-white text-slate-900 px-3 text-sm font-semibold"
              >
                <option value="small">{SIZE_CONFIG.small.label}</option>
                <option value="medium">{SIZE_CONFIG.medium.label}</option>
                <option value="large">{SIZE_CONFIG.large.label}</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer h-10 px-3 rounded-lg bg-white/5 hover:bg-white/10 self-end">
              <input
                type="checkbox"
                checked={showShopName}
                onChange={(e) => setShowShopName(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <Building2 className="h-4 w-4" />
              <span className="text-xs font-bold">Shop Name</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer h-10 px-3 rounded-lg bg-white/5 hover:bg-white/10 self-end">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-bold">Show Price</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer h-10 px-3 rounded-lg bg-white/5 hover:bg-white/10 self-end">
              <input
                type="checkbox"
                checked={showCategory}
                onChange={(e) => setShowCategory(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <Package className="h-4 w-4" />
              <span className="text-xs font-bold">Show Category</span>
            </label>
          </div>
        )}
      </section>

      <section className="grid lg:grid-cols-[400px_1fr] gap-6 print:grid-cols-1 print:gap-0">
        {/* Available products */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden print:hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50">
            <h3 className="font-bold text-slate-900">Available Products</h3>
            <p className="text-xs text-slate-500">
              {filteredProducts.length} with barcodes • Click to add
            </p>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-2">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, SKU, barcode..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"
              >
                <option value="">All Categories</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <button
                onClick={handleAddAll}
                disabled={filteredProducts.length === 0}
                className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
              >
                Add All
              </button>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No products</p>
                <p className="text-xs text-slate-500 mt-1">
                  {search ? 'Try different search' : 'Add barcodes to products first'}
                </p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const isAdded = selected.some((s) => s.product.id === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addProduct(product)}
                    className={`w-full px-5 py-3 hover:bg-emerald-50 text-left flex items-center justify-between gap-3 transition ${
                      isAdded ? 'bg-emerald-50/50' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
                        {product.name}
                        {product.hasVariants && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[9px] font-bold">
                            <Layers className="h-2.5 w-2.5" />
                            VAR
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                        {product.barcode}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-emerald-700">
                        {formatPKRFull(product.price)}
                      </div>
                      {isAdded && (
                        <div className="text-[9px] font-bold text-emerald-600 mt-0.5">
                          ✓ Added
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected & Preview */}
        <div className="space-y-4">
          {/* Selected list */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 print:hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900">Selected for Print</h3>
                <p className="text-xs text-slate-500">
                  {selected.length} items • {labelsToPrint.length} labels total
                </p>
              </div>
              {selected.length > 0 && (
                <button
                  onClick={handleClear}
                  className="h-8 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold"
                >
                  Clear All
                </button>
              )}
            </div>

            {selected.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Empty</p>
                <p className="text-xs text-slate-500 mt-1">Left side se products add karein</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selected.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-3 hover:border-emerald-300 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-sm truncate">
                          {item.product.name}
                          {item.variant && (
                            <span className="ml-1 text-violet-600 text-xs font-bold">
                              ({item.variant.name})
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {item.variant?.barcode || item.product.barcode}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateCopies(item.id, -1)}
                          className="h-7 w-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.copies}
                          onChange={(e) => setCopies(item.id, parseInt(e.target.value) || 0)}
                          className="w-12 h-7 text-center font-bold text-sm border border-slate-200 rounded-lg"
                        />
                        <button
                          onClick={() => updateCopies(item.id, 1)}
                          className="h-7 w-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Print preview */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 print:border-none print:shadow-none print:p-0 print:rounded-none">
            <h3 className="font-bold text-slate-900 mb-3 print:hidden">
              Print Preview ({config.label})
            </h3>
            <div
              className={`grid gap-2 print:gap-1`}
              style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))` }}
            >
              {labelsToPrint.map((item) => {
                const barcodeValue =
                  item.variant?.barcode || item.product.barcode || '';
                const displayName = item.variant
                  ? `${item.product.name} - ${item.variant.name}`
                  : item.product.name;
                const displayPrice = item.variant?.price ?? item.product.price;

                return (
                  <div
                    key={item._key}
                    className={`border border-slate-300 rounded-md bg-white text-center ${config.cardPadding}`}
                  >
                    {showShopName && (
                      <div className="text-[8px] font-bold text-slate-600 truncate">
                        {shopName}
                      </div>
                    )}
                    <div className={`${config.nameSize} font-bold truncate text-slate-900 leading-tight`}>
                      {displayName}
                    </div>
                    {showCategory && item.product.category && (
                      <div className="text-[8px] text-slate-500 truncate">
                        {item.product.category.name}
                      </div>
                    )}
                    <div className="my-0.5 flex justify-center">
                      {barcodeValue && (
                        <BarcodeImage
                          value={barcodeValue}
                          height={config.barcodeHeight}
                          width={config.barcodeWidth}
                          fontSize={config.fontSize}
                        />
                      )}
                    </div>
                    {showPrice && (
                      <div className={`${config.priceSize} font-extrabold text-slate-900`}>
                        {formatPKRFull(displayPrice)}
                      </div>
                    )}
                  </div>
                );
              })}
              {labelsToPrint.length === 0 && (
                <div className="col-span-full text-center text-sm text-slate-500 py-12 print:hidden">
                  <Printer className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                  No labels selected
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 5mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
