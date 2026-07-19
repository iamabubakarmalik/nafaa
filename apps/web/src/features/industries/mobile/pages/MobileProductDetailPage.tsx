import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Plus, Smartphone, Palette, Package,
  DollarSign, TrendingUp, Star, ChevronRight, ExternalLink,
  AlertTriangle, Receipt, ShoppingCart, Hash, Tag,
  ShieldCheck, Trash2, Eye, CheckCircle2, XCircle,
  Image as ImageIcon, HardDrive, Cable,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { productsApi } from '@/api/products.api';
import { productVariantsApi } from '@/api/product-variants.api';
import { productImagesApi } from '@/api/product-images.api';
import { salesApi } from '@/api/sales.api';
import {
  imeiApi, PTA_STATUS_COLORS, PTA_STATUS_LABELS, type PtaStatus,
} from '../api/imei.api';
import { BulkImeiAddModal } from '../components/BulkImeiAddModal';
import { useState } from 'react';

export default function MobileProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddImei, setShowAddImei] = useState(false);
  const [addImeiVariant, setAddImeiVariant] = useState<{ id?: string; name?: string }>({});

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', id],
    queryFn: () => productVariantsApi.list(id!),
    enabled: !!id,
  });

  const { data: images = [] } = useQuery({
    queryKey: ['product-images', id],
    queryFn: () => productImagesApi.list(id!),
    enabled: !!id,
  });

  const { data: imeis = [] } = useQuery({
    queryKey: ['product-imeis', id],
    queryFn: () => imeiApi.listByProduct(id!),
    enabled: !!id,
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ['sales-list-for-product'],
    queryFn: () => salesApi.list(),
    enabled: !!id,
  });

  const salesForProduct = useMemo(() => {
    if (!id) return [];
    return allSales
      .filter((s) => s.items.some((it) => it.product.id === id))
      .slice(0, 20);
  }, [allSales, id]);

  const removeMutation = useMutation({
    mutationFn: () => productsApi.remove(id!),
    onSuccess: (data: any) => {
      toast.success(data?.softDeleted ? 'Product deactivated' : 'Product deleted');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/imei-inventory');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const removeImeiMutation = useMutation({
    mutationFn: (imeiId: string) => imeiApi.remove(imeiId),
    onSuccess: () => {
      toast.success('IMEI removed');
      queryClient.invalidateQueries({ queryKey: ['product-imeis', id] });
    },
  });

  // ─── Stats ─────────────────────────────────────────
  const stats = useMemo(() => {
    const inStock = imeis.filter((i) => i.status === 'IN_STOCK');
    const sold = imeis.filter((i) => i.status === 'SOLD');
    const damaged = imeis.filter((i) => i.status === 'DAMAGED');
    const returned = imeis.filter((i) => i.status === 'RETURNED');

    const stockValue = inStock.reduce((a, i) => a + Number(i.costPrice || 0), 0);
    const soldRevenue = sold.reduce((a, i) => a + Number(i.soldPrice || 0), 0);
    const soldCost = sold.reduce((a, i) => a + Number(i.costPrice || 0), 0);
    const soldProfit = soldRevenue - soldCost;

    // PTA breakdown for in-stock only
    const ptaBreakdown: Record<string, { count: number; taxLocked: number }> = {};
    for (const imei of inStock) {
      const key = imei.ptaStatus;
      if (!ptaBreakdown[key]) ptaBreakdown[key] = { count: 0, taxLocked: 0 };
      ptaBreakdown[key].count++;
      ptaBreakdown[key].taxLocked += Number(imei.ptaTaxPaid || 0);
    }

    // Accessory stock (variant.stock for variants where no IMEIs exist)
    const variantsWithImeis = new Set(imeis.map((i) => i.variantId).filter(Boolean));
    const accessoryStock = variants
      .filter((v) => !variantsWithImeis.has(v.id))
      .reduce((a, v) => a + (v.stock || 0), 0);
    const baseAccessoryStock = variants.length === 0 ? (product?.stock || 0) : 0;

    return {
      inStockCount: inStock.length,
      soldCount: sold.length,
      damagedCount: damaged.length,
      returnedCount: returned.length,
      totalImeis: imeis.length,
      stockValue,
      soldRevenue,
      soldProfit,
      accessoryStock: accessoryStock + baseAccessoryStock,
      totalUnits: inStock.length + accessoryStock + baseAccessoryStock,
      ptaBreakdown,
    };
  }, [imeis, variants, product]);

  // ─── Per-variant breakdown ─────────────────────────
  const variantBreakdown = useMemo(() => {
    const buckets = new Map<string | null, {
      variantId: string | null;
      variantName: string;
      colorHex?: string | null;
      storage?: string | null;
      inStock: number;
      sold: number;
      damaged: number;
      totalValue: number;
    }>();

    for (const v of variants) {
      buckets.set(v.id, {
        variantId: v.id,
        variantName: v.name,
        colorHex: v.colorHex,
        storage: v.size,
        inStock: 0, sold: 0, damaged: 0, totalValue: 0,
      });
    }
    if (imeis.some((i) => !i.variantId)) {
      buckets.set(null, {
        variantId: null,
        variantName: 'No variant',
        inStock: 0, sold: 0, damaged: 0, totalValue: 0,
      });
    }

    for (const imei of imeis) {
      const b = buckets.get(imei.variantId ?? null);
      if (!b) continue;
      if (imei.status === 'IN_STOCK') {
        b.inStock++;
        b.totalValue += Number(imei.costPrice || 0);
      } else if (imei.status === 'SOLD') b.sold++;
      else if (imei.status === 'DAMAGED') b.damaged++;
    }

    // For variants with no IMEIs — show variant.stock (accessory)
    for (const v of variants) {
      const b = buckets.get(v.id)!;
      if (b.inStock === 0 && b.sold === 0 && (v.stock || 0) > 0) {
        b.inStock = v.stock;
        b.totalValue = (v.stock || 0) * Number(v.costPrice || 0);
      }
    }

    return Array.from(buckets.values());
  }, [variants, imeis]);

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {showAddImei && id && (
        <BulkImeiAddModal
          productId={id}
          productName={product.name}
          variantId={addImeiVariant.id}
          variantName={addImeiVariant.name}
          defaultCostPrice={product.costPrice ?? 0}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['product-imeis', id] });
            queryClient.invalidateQueries({ queryKey: ['imei-available'] });
          }}
          onClose={() => { setShowAddImei(false); setAddImeiVariant({}); }}
        />
      )}

      {/* Back nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/imei-inventory')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to IMEI Inventory
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/mobile-products/${id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 text-blue-700 text-sm font-extrabold transition"
          >
            <Edit3 className="h-4 w-4" /> Edit Product
          </Link>
          <Link
            to="/catalog"
            target="_blank"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-sm font-extrabold transition"
          >
            <ExternalLink className="h-4 w-4" /> View in Catalog
          </Link>
          <button
            onClick={() => {
              if (confirm(`Delete "${product.name}"?`)) removeMutation.mutate();
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border-2 border-rose-200 hover:bg-rose-100 text-rose-700 text-sm font-extrabold transition"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      {/* HERO HEADER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-400/15 blur-3xl" />

        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20 shrink-0">
            {images[0]?.url ? (
              <img
                src={images[0].url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50">
                <ImageIcon className="h-16 w-16" />
              </div>
            )}
            {product.isFeatured && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-white" /> FEATURED
              </div>
            )}
            {!product.isActive && (
              <div className="absolute inset-x-0 bottom-0 py-1.5 bg-rose-600 text-white text-center text-xs font-extrabold">
                INACTIVE
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Smartphone className="h-3.5 w-3.5 text-amber-300" />
              Mobile Product
              {product.category && (
                <>
                  <span className="text-white/40">•</span>
                  <span>{product.category.name}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              {product.name}
            </h1>
            {product.shortDescription && (
              <p className="mt-2 text-sm text-white/85 max-w-2xl">{product.shortDescription}</p>
            )}

            <div className="mt-3 flex items-center gap-3 flex-wrap text-xs">
              {product.sku && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur font-mono">
                  <Hash className="h-3 w-3" /> {product.sku}
                </span>
              )}
              {product.barcode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur font-mono">
                  {product.barcode}
                </span>
              )}
              {product.brand && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/30 border border-violet-300/40 font-bold">
                  <Tag className="h-3 w-3" /> {product.brand.name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Smartphone} label="In Stock IMEIs" value={stats.inStockCount} sub={`Value: ${formatPKR(stats.stockValue)}`} tone="blue" />
              <HeroStat icon={CheckCircle2} label="Sold" value={stats.soldCount} sub={formatPKR(stats.soldRevenue)} tone="emerald" />
              <HeroStat icon={Cable} label="Accessories" value={stats.accessoryStock} sub="units" tone="violet" />
              <HeroStat icon={TrendingUp} label="Realized Profit" value={formatPKRFull(stats.soldProfit)} tone="amber" />
            </div>

            <div className="mt-5 flex items-center gap-4 flex-wrap">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Sale price</div>
                <div className="text-3xl font-extrabold tabular-nums leading-none mt-1">
                  {formatPKRFull(product.price)}
                </div>
              </div>
              {product.costPrice > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Cost</div>
                  <div className="text-xl font-extrabold tabular-nums text-white/80 leading-none mt-1">
                    {formatPKRFull(product.costPrice)}
                  </div>
                </div>
              )}
              {product.wholesalePrice && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Wholesale</div>
                  <div className="text-xl font-extrabold tabular-nums text-amber-300 leading-none mt-1">
                    {formatPKRFull(product.wholesalePrice)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => { setAddImeiVariant({}); setShowAddImei(true); }}
          className="rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md p-4 flex items-center gap-3 transition group text-left"
        >
          <div className="h-11 w-11 rounded-xl bg-blue-100 group-hover:bg-blue-600 group-hover:text-white text-blue-700 flex items-center justify-center transition">
            <Plus className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Add IMEIs</div>
            <div className="text-[10px] text-slate-500 font-semibold">Bulk or single</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>
        <Link to="/imei-inventory" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-indigo-100 group-hover:bg-indigo-600 group-hover:text-white text-indigo-700 flex items-center justify-center transition">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">All IMEIs</div>
            <div className="text-[10px] text-slate-500 font-semibold">Global inventory</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/repair-tickets" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-orange-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-orange-100 group-hover:bg-orange-600 group-hover:text-white text-orange-700 flex items-center justify-center transition">
            <Package className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Repairs</div>
            <div className="text-[10px] text-slate-500 font-semibold">Service tickets</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/pos" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-amber-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-amber-100 group-hover:bg-amber-600 group-hover:text-white text-amber-700 flex items-center justify-center transition">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Go to POS</div>
            <div className="text-[10px] text-slate-500 font-semibold">Sell this product</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
      </section>

      {/* PTA BREAKDOWN */}
      {Object.keys(stats.ptaBreakdown).length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">PTA Breakdown</h3>
              <p className="text-xs text-slate-500 font-semibold">In-stock IMEIs by compliance status</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(Object.entries(stats.ptaBreakdown) as [PtaStatus, { count: number; taxLocked: number }][])
              .map(([status, data]) => {
              const colors = PTA_STATUS_COLORS[status];
              return (
                <div key={status} className={`rounded-xl border-2 p-3 ${colors.bg} ${colors.border}`}>
                  <div className={`text-[10px] uppercase font-extrabold ${colors.text}`}>
                    {PTA_STATUS_LABELS[status]}
                  </div>
                  <div className={`text-2xl font-extrabold ${colors.text} tabular-nums`}>
                    {data.count}
                  </div>
                  {data.taxLocked > 0 && (
                    <div className={`text-[10px] font-bold ${colors.text} mt-1`}>
                      Tax: {formatPKR(data.taxLocked)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* VARIANT BREAKDOWN */}
      {variantBreakdown.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-blue-50/50 to-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
                Variant Breakdown
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                {variantBreakdown.length} variant{variantBreakdown.length !== 1 ? 's' : ''} • per-variant IMEI count
              </p>
            </div>
          </div>

          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {variantBreakdown.map((b) => (
              <div
                key={b.variantId ?? 'none'}
                className={[
                  'rounded-2xl border-2 p-3',
                  b.inStock > 0 ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-slate-50/50',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  {b.colorHex ? (
                    <div
                      className="h-11 w-11 rounded-xl border-2 border-white shadow-md shrink-0"
                      style={{ backgroundColor: b.colorHex }}
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                      <Palette className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 text-sm truncate">
                      {b.variantName}
                    </div>
                    {b.storage && (
                      <div className="text-[10px] font-mono text-indigo-700 inline-flex items-center gap-0.5">
                        <HardDrive className="h-2.5 w-2.5" /> {b.storage}
                      </div>
                    )}
                  </div>
                  {b.variantId && (
                    <button
                      onClick={() => {
                        const variant = variants.find((v) => v.id === b.variantId);
                        setAddImeiVariant({
                          id: b.variantId ?? undefined,
                          name: variant?.name,
                        });
                        setShowAddImei(true);
                      }}
                      className="h-7 w-7 rounded-lg bg-blue-100 hover:bg-blue-600 hover:text-white text-blue-700 flex items-center justify-center transition"
                      title="Add IMEIs for this variant"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="rounded-lg bg-white border border-slate-200 p-2 text-center">
                    <div className="text-[9px] uppercase font-extrabold text-emerald-700">In Stock</div>
                    <div className="text-base font-extrabold text-emerald-900 tabular-nums">{b.inStock}</div>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-2 text-center">
                    <div className="text-[9px] uppercase font-extrabold text-violet-700">Sold</div>
                    <div className="text-base font-extrabold text-violet-900 tabular-nums">{b.sold}</div>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-2 text-center">
                    <div className="text-[9px] uppercase font-extrabold text-rose-700">Damaged</div>
                    <div className="text-base font-extrabold text-rose-900 tabular-nums">{b.damaged}</div>
                  </div>
                </div>

                {b.totalValue > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200 flex items-baseline justify-between">
                    <div className="text-[10px] uppercase font-extrabold text-slate-600">Stock Value</div>
                    <div className="text-sm font-extrabold text-blue-700 tabular-nums">
                      {formatPKRFull(b.totalValue)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* IMEIs TABLE */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center shadow-md">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">IMEI Inventory</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {stats.inStockCount} in stock • {stats.totalImeis} total
              </p>
            </div>
          </div>
          <Button
            onClick={() => { setAddImeiVariant({}); setShowAddImei(true); }}
            className="bg-gradient-to-r from-blue-600 to-indigo-700"
          >
            <Plus className="h-4 w-4" /> Add IMEIs
          </Button>
        </div>

        {imeis.length === 0 ? (
          <div className="p-10 text-center">
            <Smartphone className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <div className="font-extrabold text-slate-700">No IMEIs yet</div>
            <p className="text-sm text-slate-500 mt-1">Add IMEIs to start selling this product</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">IMEI</th>
                  <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Variant</th>
                  <th className="px-3 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-700">PTA</th>
                  <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Cost</th>
                  <th className="px-3 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {imeis.slice(0, 50).map((imei) => {
                  const ptaColors = PTA_STATUS_COLORS[imei.ptaStatus];
                  return (
                    <tr key={imei.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2">
                        <div className="font-mono font-extrabold text-slate-900 text-xs">{imei.imei1}</div>
                        {imei.imei2 && (
                          <div className="font-mono text-[10px] text-slate-500">2: {imei.imei2}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {imei.variant ? (
                          <span className="font-bold">{imei.variant.name}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {imei.color && (
                          <div className="text-[10px] text-violet-700 font-bold">{imei.color}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-extrabold ${ptaColors.bg} ${ptaColors.text} ${ptaColors.border}`}>
                          {PTA_STATUS_LABELS[imei.ptaStatus]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-bold">
                        {formatPKR(imei.costPrice)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={[
                          'px-1.5 py-0.5 rounded-full text-[9px] font-extrabold',
                          imei.status === 'IN_STOCK' ? 'bg-emerald-100 text-emerald-700' :
                          imei.status === 'SOLD' ? 'bg-violet-100 text-violet-700' :
                          imei.status === 'DAMAGED' ? 'bg-rose-100 text-rose-700' :
                          imei.status === 'RETURNED' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700',
                        ].join(' ')}>
                          {imei.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {imei.status === 'IN_STOCK' && (
                          <button
                            onClick={() => {
                              if (confirm(`Remove IMEI ${imei.imei1}?`)) removeImeiMutation.mutate(imei.id);
                            }}
                            className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 inline-flex items-center justify-center"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {imeis.length > 50 && (
              <div className="p-3 text-center border-t border-slate-100 bg-slate-50">
                <Link
                  to={`/products/${id}/imei`}
                  className="text-xs font-extrabold text-blue-700 hover:underline inline-flex items-center gap-1"
                >
                  View all {imeis.length} IMEIs <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      {/* SALES HISTORY */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Sales History</h3>
            <p className="text-xs text-slate-500 font-semibold">
              {salesForProduct.length} recent orders
            </p>
          </div>
        </div>

        {salesForProduct.length === 0 ? (
          <div className="p-10 text-center">
            <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <div className="font-extrabold text-slate-700">Abhi tak koi sale nahi</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {salesForProduct.map((s) => {
              const productLines = s.items.filter((it) => it.product.id === id);
              const qty = productLines.reduce((a, it) => a + Number(it.quantity || 0), 0);
              const revenue = productLines.reduce((a, it) => a + Number(it.total || 0), 0);
              return (
                <Link
                  key={s.id}
                  to={`/sales/${s.id}/receipt`}
                  className="block px-5 py-3 hover:bg-slate-50/50 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-extrabold text-sm text-slate-900">
                          {s.saleNumber}
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {new Date(s.soldAt).toLocaleDateString('en-PK', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-semibold mt-0.5">
                        {s.customer?.name || 'Walk-in'} • {qty} units
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 tabular-nums">
                        {formatPKRFull(revenue)}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function HeroStat({
  icon: Icon, label, value, sub, tone,
}: { icon: any; label: string; value: string | number; sub?: string; tone: string }) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-xl font-extrabold text-white tabular-nums leading-none">{value}</div>
      {sub && <div className="text-[10px] font-bold text-white/70 mt-0.5">{sub}</div>}
    </div>
  );
}
