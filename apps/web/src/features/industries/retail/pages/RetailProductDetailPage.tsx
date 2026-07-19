import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, ShoppingBag, Layers, Boxes, Package,
  DollarSign, TrendingUp, Star, ChevronRight, ExternalLink,
  Receipt, ShoppingCart, Hash, Tag, Trash2, Eye,
  Image as ImageIcon, Barcode, Calendar, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { productsApi } from '@/api/products.api';
import { productVariantsApi } from '@/api/product-variants.api';
import { productBatchesApi } from '@/api/product-batches.api';
import { productImagesApi } from '@/api/product-images.api';
import { salesApi } from '@/api/sales.api';
import { productUnitsApi } from '../api/product-units.api';

export default function RetailProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const { data: units = [] } = useQuery({
    queryKey: ['product-units', id],
    queryFn: () => productUnitsApi.byProduct(id!),
    enabled: !!id,
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['product-batches', id],
    queryFn: () => productBatchesApi.list(id!),
    enabled: !!id,
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ['sales-list-for-product'],
    queryFn: () => salesApi.list(),
    enabled: !!id,
  });

  const salesForProduct = useMemo(() => {
    if (!id) return [];
    return allSales.filter((s) => s.items.some((it) => it.product.id === id)).slice(0, 20);
  }, [allSales, id]);

  const removeMutation = useMutation({
    mutationFn: () => productsApi.remove(id!),
    onSuccess: (data: any) => {
      toast.success(data?.softDeleted ? 'Product deactivated' : 'Product deleted');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/retail/dashboard');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const stats = useMemo(() => {
    const variantStock = variants.reduce((a, v) => a + Number(v.stock || 0), 0);
    const batchStock = batches.reduce((a, b) => a + Number(b.quantity || 0), 0);
    const totalStock = product ? Number(product.stock || 0) : 0;
    const stockValue = totalStock * Number(product?.price || 0);
    const stockCost = totalStock * Number(product?.costPrice || 0);

    const soldItems = allSales.flatMap((s) =>
      s.items.filter((it) => it.product.id === id).map((it) => ({ ...it, sale: s })),
    );
    const totalSold = soldItems.reduce((a, it) => a + Number(it.quantity || 0), 0);
    const totalRevenue = soldItems.reduce((a, it) => a + Number(it.total || 0), 0);
    const totalOrders = new Set(soldItems.map((it) => it.sale.id)).size;

    const expiringSoon = batches.filter((b) => {
      if (!b.expiryDate) return false;
      const days = (new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days > 0 && days <= 30;
    }).length;

    return {
      totalStock, variantStock, batchStock,
      stockValue, stockCost,
      totalSold, totalRevenue, totalOrders,
      unitCount: units.length,
      variantCount: variants.length,
      batchCount: batches.length,
      expiringSoon,
    };
  }, [product, variants, batches, units, allSales, id]);

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-sky-200 border-t-sky-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/retail/dashboard')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/retail-products/${id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border-2 border-sky-200 hover:bg-sky-100 text-sky-700 text-sm font-extrabold transition"
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

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20 shrink-0">
            {images[0]?.url ? (
              <img src={images[0].url} alt={product.name} className="w-full h-full object-cover" />
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
              <ShoppingBag className="h-3.5 w-3.5 text-amber-300" />
              Retail Product
              {product.category && (
                <>
                  <span className="text-white/40">•</span>
                  <span>{product.category.name}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
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
                  <Barcode className="h-3 w-3" /> {product.barcode}
                </span>
              )}
              {product.brand && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/30 border border-violet-300/40 font-bold">
                  <Tag className="h-3 w-3" /> {product.brand.name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Package} label="Stock" value={stats.totalStock} sub={product.unit} tone="sky" />
              <HeroStat icon={Layers} label="Units" value={stats.unitCount} sub="multi-unit" tone="violet" />
              <HeroStat icon={Boxes} label="Variants" value={stats.variantCount} tone="amber" />
              <HeroStat icon={TrendingUp} label="Revenue" value={formatPKR(stats.totalRevenue)} sub={`${stats.totalOrders} orders`} tone="emerald" />
            </div>

            <div className="mt-5 flex items-center gap-4 flex-wrap">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Sale price</div>
                <div className="text-3xl font-extrabold tabular-nums leading-none mt-1">
                  {formatPKRFull(product.price)}
                  <span className="text-sm font-bold text-white/70 ml-1">/ {product.unit}</span>
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
        <Link to="/retail/product-units" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-sky-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-sky-100 group-hover:bg-sky-600 group-hover:text-white text-sky-700 flex items-center justify-center transition">
            <Layers className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Manage Units</div>
            <div className="text-[10px] text-slate-500 font-semibold">Multi-unit pricing</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/retail/combos" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-violet-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-violet-100 group-hover:bg-violet-600 group-hover:text-white text-violet-700 flex items-center justify-center transition">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Combos</div>
            <div className="text-[10px] text-slate-500 font-semibold">Bundle deals</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/retail/barcode-labels" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-blue-100 group-hover:bg-blue-600 group-hover:text-white text-blue-700 flex items-center justify-center transition">
            <Barcode className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Print Labels</div>
            <div className="text-[10px] text-slate-500 font-semibold">Barcode stickers</div>
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

      {/* UNITS */}
      {units.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-sky-50/50 to-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-700 text-white flex items-center justify-center shadow-md">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Multi-Unit Pricing</h3>
              <p className="text-xs text-slate-500 font-semibold">{units.length} units configured</p>
            </div>
          </div>

          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {units.map((u) => (
              <div key={u.id} className={[
                'rounded-2xl border-2 p-3',
                u.isBase ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/30',
              ].join(' ')}>
                <div className="flex items-center gap-2 mb-2">
                  {u.isBase && <Star className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600" />}
                  <div className="font-extrabold text-slate-900 capitalize">{u.unitName}</div>
                  {u.isBase && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold">BASE</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-bold">
                  1 = {u.conversionRate} {product.unit}
                </div>
                <div className="mt-2 text-lg font-extrabold text-emerald-700 tabular-nums">
                  {formatPKRFull(u.price)}
                </div>
                {u.barcode && (
                  <div className="mt-1 text-[10px] font-mono text-slate-600 flex items-center gap-1">
                    <Barcode className="h-2.5 w-2.5" /> {u.barcode}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* VARIANTS */}
      {variants.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Variants</h3>
              <p className="text-xs text-slate-500 font-semibold">{variants.length} variants</p>
            </div>
          </div>

          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {variants.map((v) => (
              <div key={v.id} className="rounded-2xl border-2 border-slate-200 bg-white p-3">
                <div className="font-extrabold text-slate-900 text-sm">{v.name}</div>
                <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                  {v.sku && `SKU: ${v.sku}`}
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div className="text-base font-extrabold text-emerald-700 tabular-nums">
                    {formatPKRFull(v.price)}
                  </div>
                  <div className="text-xs font-bold text-slate-600">
                    Stock: <strong>{v.stock}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* BATCHES */}
      {batches.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Batches / Expiry</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {batches.length} batches
                {stats.expiringSoon > 0 && (
                  <span className="ml-2 text-rose-700 font-extrabold">• {stats.expiringSoon} expiring soon</span>
                )}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Batch #</th>
                  <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Mfg</th>
                  <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Expiry</th>
                  <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Qty</th>
                  <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => {
                  const isExpiringSoon = b.expiryDate && (new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-mono font-extrabold text-slate-900 text-xs">{b.batchNumber}</td>
                      <td className="px-3 py-2 text-xs font-semibold">
                        {b.manufactureDate ? new Date(b.manufactureDate).toLocaleDateString('en-PK') : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {b.expiryDate ? (
                          <span className={['font-extrabold', isExpiringSoon ? 'text-rose-700' : 'text-slate-700'].join(' ')}>
                            {new Date(b.expiryDate).toLocaleDateString('en-PK')}
                            {isExpiringSoon && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-extrabold tabular-nums">{b.quantity}</td>
                      <td className="px-3 py-2 text-right text-xs font-bold text-slate-700">{formatPKR(b.costPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SALES HISTORY */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Sales History</h3>
            <p className="text-xs text-slate-500 font-semibold">
              {salesForProduct.length} recent • {stats.totalSold} units sold
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
                        <div className="font-mono font-extrabold text-sm text-slate-900">{s.saleNumber}</div>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {new Date(s.soldAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-semibold mt-0.5">
                        {s.customer?.name || 'Walk-in'} • {qty} {product.unit}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(revenue)}</div>
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

function HeroStat({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    sky: 'from-sky-400/30 to-sky-600/20 border-sky-300/40',
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
