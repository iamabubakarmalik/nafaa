import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Printer, ScanLine, Plus, Minus, Search, X, Settings2,
  Building2, DollarSign, Package, Layers, AlertCircle, Sparkles,
  Edit3, Wand2, Copy, CheckCircle2, RefreshCw, Download,
  Eye, EyeOff, Hash, Tag, FileSpreadsheet, Zap, Trash2,
  Image as ImageIcon, Filter, MapPin, BarChart3,
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
  id: string;
  product: Product;
  variant?: ProductVariant;
  copies: number;
}

type LabelSize = 'small' | 'medium' | 'large' | 'xlarge' | 'jewelry';
type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';

const SIZE_CONFIG: Record<LabelSize, any> = {
  small: {
    label: 'Small (40×25mm)',
    desc: 'Thermal printer',
    cols: 5,
    barcodeHeight: 28,
    barcodeWidth: 1.1,
    fontSize: 8,
    cardPadding: 'p-1.5',
    nameSize: 'text-[8px]',
    priceSize: 'text-[10px]',
    width: '40mm',
    height: '25mm',
  },
  medium: {
    label: 'Medium (50×30mm)',
    desc: 'Standard thermal',
    cols: 4,
    barcodeHeight: 38,
    barcodeWidth: 1.3,
    fontSize: 10,
    cardPadding: 'p-2',
    nameSize: 'text-[10px]',
    priceSize: 'text-xs',
    width: '50mm',
    height: '30mm',
  },
  large: {
    label: 'Large (70×40mm)',
    desc: 'A4 sheet labels',
    cols: 3,
    barcodeHeight: 48,
    barcodeWidth: 1.5,
    fontSize: 12,
    cardPadding: 'p-2.5',
    nameSize: 'text-xs',
    priceSize: 'text-sm',
    width: '70mm',
    height: '40mm',
  },
  xlarge: {
    label: 'X-Large (100×50mm)',
    desc: 'Detailed labels',
    cols: 2,
    barcodeHeight: 60,
    barcodeWidth: 1.8,
    fontSize: 14,
    cardPadding: 'p-3',
    nameSize: 'text-sm',
    priceSize: 'text-base',
    width: '100mm',
    height: '50mm',
  },
  jewelry: {
    label: 'Jewelry Tag (30×20mm)',
    desc: 'Small price tags',
    cols: 6,
    barcodeHeight: 22,
    barcodeWidth: 1,
    fontSize: 7,
    cardPadding: 'p-1',
    nameSize: 'text-[7px]',
    priceSize: 'text-[9px]',
    width: '30mm',
    height: '20mm',
  },
};

function BarcodeImage({
  value, height, width, fontSize, format = 'CODE128',
}: {
  value: string; height: number; width: number; fontSize: number; format?: BarcodeFormat;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, {
          format, width, height, fontSize, margin: 2, displayValue: true,
        });
      } catch (e) {
        try {
          JsBarcode(ref.current, value, {
            format: 'CODE128', width, height, fontSize, margin: 2, displayValue: true,
          });
        } catch {}
      }
    }
  }, [value, height, width, fontSize, format]);
  return <svg ref={ref} />;
}

export default function BarcodeLabelsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<LabelItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'with-barcode' | 'without-barcode'>('all');
  const [labelSize, setLabelSize] = useState<LabelSize>('medium');
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('CODE128');
  const [showShopName, setShowShopName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showCategory, setShowCategory] = useState(false);
  const [showSku, setShowSku] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data: productsData, refetch: refetchProducts } = useQuery({
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
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      if (stockFilter === 'with-barcode' && !p.barcode) return false;
      if (stockFilter === 'without-barcode' && p.barcode) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      );
    });
  }, [products, search, categoryFilter, stockFilter]);

  const stats = useMemo(() => {
    const withBarcode = products.filter((p) => p.barcode).length;
    const withoutBarcode = products.length - withBarcode;
    return { total: products.length, withBarcode, withoutBarcode };
  }, [products]);

  const labelsToPrint = useMemo(
    () =>
      selected.flatMap((item) =>
        Array.from({ length: item.copies }, (_, i) => ({
          ...item, _key: `${item.id}-${i}`,
        })),
      ),
    [selected],
  );

  const generateBarcodeMutation = useMutation({
    mutationFn: productsApi.generateBarcode,
    onSuccess: (updated) => {
      toast.success(`Barcode generated: ${updated.barcode}`);
      queryClient.invalidateQueries({ queryKey: ['products-for-labels'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Failed to generate barcode'),
  });

  const bulkGenerateMutation = useMutation({
    mutationFn: productsApi.bulkGenerateBarcodes,
    onSuccess: (result) => {
      toast.success(`${result.count} barcodes generated!`);
      queryClient.invalidateQueries({ queryKey: ['products-for-labels'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Bulk generation failed'),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      productsApi.update(id, payload),
    onSuccess: () => {
      toast.success('Barcode updated');
      queryClient.invalidateQueries({ queryKey: ['products-for-labels'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingProduct(null);
    },
    onError: () => toast.error('Update failed'),
  });

  const addProduct = async (product: Product) => {
    if (!product.barcode) {
      const confirmed = confirm(`"${product.name}" mein barcode nahi hai. Auto-generate karein?`);
      if (confirmed) {
        await generateBarcodeMutation.mutateAsync(product.id);
        toast.success('Barcode generated, ab add karein dobara');
      }
      return;
    }

    if (product.hasVariants) {
      try {
        const variants = await productVariantsApi.list(product.id);
        const active = variants.filter((v) => v.isActive);
        if (active.length === 0) {
          addOneItem(product, undefined);
          return;
        }
        let added = 0;
        active.forEach((v) => {
          if (v.barcode) {
            addOneItem(product, v);
            added++;
          }
        });
        if (added === 0) {
          addOneItem(product, undefined);
          toast('Variants mein barcode nahi — product barcode use ki');
        } else {
          toast.success(`${added} variants added`);
        }
      } catch {
        addOneItem(product, undefined);
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
        return prev.map((p) => p.id === id ? { ...p, copies: p.copies + 1 } : p);
      }
      return [...prev, { id, product, variant, copies: 1 }];
    });
  };

  const updateCopies = (id: string, delta: number) => {
    setSelected((prev) =>
      prev.map((p) => p.id === id ? { ...p, copies: Math.max(0, p.copies + delta) } : p)
        .filter((p) => p.copies > 0),
    );
  };

  const setCopies = (id: string, copies: number) => {
    setSelected((prev) =>
      prev.map((p) => p.id === id ? { ...p, copies: Math.max(0, copies) } : p)
        .filter((p) => p.copies > 0),
    );
  };

  const setAllCopies = (copies: number) => {
    setSelected((prev) => prev.map((p) => ({ ...p, copies })));
    toast.success(`All items set to ${copies} copies`);
  };

  const removeItem = (id: string) => {
    setSelected((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePrint = () => {
    if (selected.length === 0) return toast.error('Pehle products select karein');
    window.print();
  };

  const handleAddAll = () => {
    let added = 0;
    filteredProducts.forEach((p) => {
      if (p.barcode) {
        addOneItem(p, undefined);
        added++;
      }
    });
    toast.success(`${added} products added`);
  };

  const handleBulkGenerateBarcodes = () => {
    const withoutBarcode = filteredProducts.filter((p) => !p.barcode);
    if (withoutBarcode.length === 0) return toast.error('Sab products ke pass already barcodes hain');
    if (confirm(`${withoutBarcode.length} products ke liye barcodes generate karein?`)) {
      bulkGenerateMutation.mutate(withoutBarcode.map((p) => p.id));
    }
  };

  const config = SIZE_CONFIG[labelSize];
  const shopName = (settings as any)?.shopName || (settings as any)?.shopAddress || 'My Shop';

  return (
    <div className="space-y-6 print:space-y-0">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 sm:p-8 shadow-2xl print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <ScanLine className="h-3.5 w-3.5 text-amber-300" />
              Barcode Label Studio
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Barcode Labels</h2>
            <p className="mt-2 text-sm text-white/80">
              Auto-generate barcodes, beautiful labels — thermal, A4, jewelry tags sab supported
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetchProducts()}
              className="h-11 px-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur text-white text-sm font-bold inline-flex items-center gap-1.5 transition"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
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
              className="bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50 shadow-lg"
            >
              <Printer className="h-4 w-4" />
              Print {labelsToPrint.length} Labels
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="relative mt-5 rounded-2xl bg-white/10 backdrop-blur p-4 space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-white/80 block mb-2">
                Label Size
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(Object.entries(SIZE_CONFIG) as [LabelSize, any][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setLabelSize(key)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition border-2 ${
                      labelSize === key
                        ? 'bg-white text-slate-900 border-white shadow-lg'
                        : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-extrabold">{cfg.label.split('(')[0]}</div>
                    <div className="text-[9px] opacity-70 font-bold mt-0.5">{cfg.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-white/80 block mb-1.5">
                  Barcode Format
                </label>
                <select
                  value={barcodeFormat}
                  onChange={(e) => setBarcodeFormat(e.target.value as BarcodeFormat)}
                  className="h-10 w-full rounded-lg bg-white text-slate-900 px-3 text-sm font-semibold"
                >
                  <option value="CODE128">CODE128 (universal)</option>
                  <option value="CODE39">CODE39</option>
                  <option value="EAN13">EAN-13 (retail)</option>
                  <option value="UPC">UPC-A (USA)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Checkbox checked={showShopName} onChange={setShowShopName} icon={Building2} label="Shop" />
                <Checkbox checked={showPrice} onChange={setShowPrice} icon={DollarSign} label="Price" />
                <Checkbox checked={showCategory} onChange={setShowCategory} icon={Tag} label="Category" />
                <Checkbox checked={showSku} onChange={setShowSku} icon={Hash} label="SKU" />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* STATS */}
      <section className="grid grid-cols-3 gap-4 print:hidden">
        <StatCard label="Total Products" value={stats.total} icon={Package} color="violet" />
        <StatCard label="With Barcodes" value={stats.withBarcode} icon={CheckCircle2} color="emerald" />
        <StatCard
          label="Need Barcodes"
          value={stats.withoutBarcode}
          icon={AlertCircle}
          color="amber"
          action={stats.withoutBarcode > 0 ? (
            <button
              onClick={handleBulkGenerateBarcodes}
              disabled={bulkGenerateMutation.isPending}
              className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-extrabold transition disabled:opacity-50"
            >
              <Wand2 className="h-3 w-3" />
              Auto-Generate All
            </button>
          ) : null}
        />
      </section>

      <section className="grid lg:grid-cols-[420px_1fr] gap-6 print:grid-cols-1 print:gap-0">
        {/* PRODUCTS LIST */}
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden print:hidden">
          <div className="px-5 py-4 border-b-2 border-slate-200 bg-gradient-to-br from-emerald-50 to-green-50">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-700" />
                  Available Products
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  {filteredProducts.length} products • Click to add
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-2">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, SKU, barcode..."
                className="h-10 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-emerald-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold"
            >
              <option value="">All Categories</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="flex gap-1">
              {[
                { v: 'all' as const, l: 'All', c: 'bg-slate-900' },
                { v: 'with-barcode' as const, l: 'Has Barcode', c: 'bg-emerald-600' },
                { v: 'without-barcode' as const, l: 'No Barcode', c: 'bg-amber-600' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setStockFilter(opt.v)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition ${
                    stockFilter === opt.v ? `${opt.c} text-white shadow-sm` : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAddAll}
                disabled={filteredProducts.length === 0}
                className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 inline-flex items-center justify-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add All
              </button>
              <button
                onClick={handleBulkGenerateBarcodes}
                disabled={bulkGenerateMutation.isPending || stats.withoutBarcode === 0}
                className="h-9 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold disabled:opacity-50 inline-flex items-center justify-center gap-1"
              >
                <Wand2 className="h-3 w-3" />
                Generate
              </button>
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700">No products found</p>
                <p className="text-xs text-slate-500 mt-1">
                  {search ? 'Try different search' : 'Add products first'}
                </p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const isAdded = selected.some((s) => s.product.id === product.id);
                const hasBarcode = !!product.barcode;
                return (
                  <div
                    key={product.id}
                    className={`px-4 py-3 hover:bg-emerald-50/50 transition ${isAdded ? 'bg-emerald-50/30' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => addProduct(product)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
                          {product.name}
                          {product.hasVariants && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[9px] font-extrabold">
                              <Layers className="h-2.5 w-2.5" />
                              VAR
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                          {hasBarcode ? (
                            <span className="text-emerald-700 font-bold">{product.barcode}</span>
                          ) : (
                            <span className="text-amber-700 font-bold">⚠️ No barcode</span>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-emerald-700">
                            {formatPKRFull(product.price)}
                          </div>
                          {isAdded && (
                            <div className="text-[9px] font-extrabold text-emerald-600">✓ Added</div>
                          )}
                        </div>
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="h-7 w-7 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center transition"
                          title="Edit barcode"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        {!hasBarcode && (
                          <button
                            onClick={() => generateBarcodeMutation.mutate(product.id)}
                            disabled={generateBarcodeMutation.isPending}
                            className="h-7 w-7 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 flex items-center justify-center transition disabled:opacity-50"
                            title="Generate barcode"
                          >
                            <Wand2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SELECTED + PREVIEW */}
        <div className="space-y-4">
          {/* Selected list */}
          <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 print:hidden">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                  <Printer className="h-4 w-4 text-emerald-700" />
                  Selected for Print
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  {selected.length} items • <span className="text-emerald-700 font-extrabold">{labelsToPrint.length}</span> labels
                </p>
              </div>
              {selected.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500 font-bold mr-1">Set all:</span>
                  {[1, 5, 10, 20].map((n) => (
                    <button
                      key={n}
                      onClick={() => setAllCopies(n)}
                      className="h-7 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelected([])}
                    className="ml-2 h-7 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold inline-flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </button>
                </div>
              )}
            </div>

            {selected.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-700">No items selected</p>
                <p className="text-xs text-slate-500 mt-1">Left side se products add karein</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selected.map((item) => (
                  <div key={item.id} className="rounded-xl border-2 border-slate-200 p-3 hover:border-emerald-300 transition">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-sm truncate">
                          {item.product.name}
                          {item.variant && (
                            <span className="ml-1 text-violet-600 text-xs font-bold">({item.variant.name})</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {item.variant?.barcode || item.product.barcode}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => updateCopies(item.id, -1)}
                          className="h-7 w-7 rounded-lg border-2 border-slate-200 hover:bg-slate-50 flex items-center justify-center"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.copies}
                          onChange={(e) => setCopies(item.id, parseInt(e.target.value) || 0)}
                          className="w-14 h-7 text-center font-extrabold text-sm border-2 border-slate-200 rounded-lg"
                        />
                        <button
                          onClick={() => updateCopies(item.id, 1)}
                          className="h-7 w-7 rounded-lg border-2 border-slate-200 hover:bg-slate-50 flex items-center justify-center"
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

          {/* PREVIEW */}
          <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 print:border-none print:shadow-none print:p-0 print:rounded-none">
            <div className="flex items-center justify-between mb-4 print:hidden">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-700" />
                Print Preview
              </h3>
              <span className="text-xs font-bold text-slate-500">{config.label}</span>
            </div>

            <div
              className="grid gap-2 print:gap-1"
              style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))` }}
            >
              {labelsToPrint.map((item) => {
                const barcodeValue = item.variant?.barcode || item.product.barcode || '';
                const displayName = item.variant
                  ? `${item.product.name} - ${item.variant.name}`
                  : item.product.name;
                const displayPrice = item.variant?.price ?? item.product.price;
                const displaySku = item.variant?.sku || item.product.sku;

                return (
                  <div
                    key={item._key}
                    className={`border-2 border-slate-300 rounded-md bg-white text-center ${config.cardPadding} print:border-slate-700`}
                  >
                    {showShopName && (
                      <div className="text-[8px] font-extrabold text-slate-700 truncate leading-tight">
                        {shopName}
                      </div>
                    )}
                    <div className={`${config.nameSize} font-extrabold truncate text-slate-900 leading-tight`}>
                      {displayName}
                    </div>
                    {showCategory && item.product.category && (
                      <div className="text-[8px] text-slate-500 font-bold truncate">
                        {item.product.category.name}
                      </div>
                    )}
                    {showSku && displaySku && (
                      <div className="text-[8px] font-mono text-slate-600 truncate">
                        {displaySku}
                      </div>
                    )}
                    <div className="my-0.5 flex justify-center">
                      {barcodeValue && (
                        <BarcodeImage
                          value={barcodeValue}
                          height={config.barcodeHeight}
                          width={config.barcodeWidth}
                          fontSize={config.fontSize}
                          format={barcodeFormat}
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
                <div className="col-span-full text-center py-16 print:hidden">
                  <Printer className="h-16 w-16 mx-auto text-slate-300 mb-3" />
                  <p className="font-bold text-slate-700">No labels to preview</p>
                  <p className="text-xs text-slate-500 mt-1">Add products from the left to see preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* EDIT MODAL */}
      {editingProduct && (
        <EditBarcodeModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(barcode: string) => {
            updateProductMutation.mutate({
              id: editingProduct.id,
              payload: { barcode },
            });
          }}
          onGenerate={() => generateBarcodeMutation.mutate(editingProduct.id)}
          saving={updateProductMutation.isPending || generateBarcodeMutation.isPending}
        />
      )}

      <style>{`
        @media print {
          @page { margin: 5mm; size: auto; }
          body { background: white !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function Checkbox({ checked, onChange, icon: Icon, label }: any) {
  return (
    <label className={`flex items-center gap-1.5 cursor-pointer h-9 px-2 rounded-lg transition ${
      checked ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
    }`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded"
      />
      <Icon className="h-3 w-3" />
      <span className="text-[10px] font-extrabold">{label}</span>
    </label>
  );
}

function StatCard({ label, value, icon: Icon, color, action }: any) {
  const colors: any = {
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
          {action}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EditBarcodeModal({ product, onClose, onSave, onGenerate, saving }: any) {
  const [barcode, setBarcode] = useState(product.barcode || '');

  const previewRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (previewRef.current && barcode) {
      try {
        JsBarcode(previewRef.current, barcode, {
          format: 'CODE128',
          width: 2,
          height: 60,
          fontSize: 14,
          displayValue: true,
        });
      } catch {}
    }
  }, [barcode]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-b-2 border-blue-200 flex items-center justify-between">
          <h3 className="font-extrabold text-blue-900 flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Edit Barcode
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white hover:bg-slate-100 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <div className="text-xs font-bold text-slate-600 mb-1">Product</div>
            <div className="font-extrabold text-slate-900">{product.name}</div>
            {product.sku && (
              <div className="text-xs font-mono text-slate-500 mt-0.5">SKU: {product.sku}</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Barcode Value
            </label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Enter barcode or generate auto"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-4 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
            <div className="text-[10px] text-slate-500 mt-1 font-semibold">
              Supports CODE128, CODE39, EAN-13, UPC formats
            </div>
          </div>

          {barcode && (
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 flex flex-col items-center">
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-600 mb-1">Preview</div>
              <svg ref={previewRef} />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={onGenerate}
              loading={saving}
              variant="secondary"
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white border-violet-600"
            >
              <Wand2 className="h-4 w-4" />
              Auto-Generate
            </Button>
            <Button
              onClick={() => onSave(barcode)}
              loading={saving}
              disabled={!barcode.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Save Barcode
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
