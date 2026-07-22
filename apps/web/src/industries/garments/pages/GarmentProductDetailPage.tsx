import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Shirt, Palette, TrendingUp, Star,
  ChevronRight, ExternalLink, Receipt, ShoppingCart, Hash, Tag,
  Trash2, Eye, Image as ImageIcon, Package, Ruler, Award,
  Users, Sparkles, Zap, Bookmark, CreditCard, Clock, Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { productImagesApi } from '@modules/inventory/products/api/product-images.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { garmentProductsApi } from '../api/products.api';

const GENDER_EMOJI: Record<string, string> = {
  MEN: '👨', WOMEN: '👩', BOYS: '👦', GIRLS: '👧',
  UNISEX: '👥', KIDS: '🧒', BABY: '👶',
};

export default function GarmentProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: profile } = useQuery({
    queryKey: ['garment-profile', id],
    queryFn: () => garmentProductsApi.byProduct(id!),
    enabled: !!id,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', id],
    queryFn: () => productVariantsApi.list(id!),
    enabled: !!id,
  });

  const { data: variantProfiles = [] } = useQuery({
    queryKey: ['variant-profiles', id],
    queryFn: () => garmentProductsApi.variantProfiles(id!),
    enabled: !!id,
  });

  const { data: images = [] } = useQuery({
    queryKey: ['product-images', id],
    queryFn: () => productImagesApi.list(id!),
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
      navigate('/garments/products');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const stats = useMemo(() => {
    const totalStock = variants.reduce((a, v) => a + Number(v.stock || 0), 0) + (variants.length === 0 ? Number(product?.stock || 0) : 0);
    const uniqueSizes = new Set(variants.map((v) => v.size).filter(Boolean)).size;
    const uniqueColors = new Set(variantProfiles.map((v) => v.colorName?.toLowerCase()).filter(Boolean)).size;
    const soldItems = allSales.flatMap((s) =>
      s.items.filter((it) => it.product.id === id).map((it) => ({ ...it, sale: s })),
    );
    const totalSold = soldItems.reduce((a, it) => a + Number(it.quantity || 0), 0);
    const totalRevenue = soldItems.reduce((a, it) => a + Number(it.total || 0), 0);
    const totalOrders = new Set(soldItems.map((it) => it.sale.id)).size;

    return {
      totalStock, uniqueSizes, uniqueColors, variantCount: variants.length,
      totalSold, totalRevenue, totalOrders,
    };
  }, [product, variants, variantProfiles, allSales, id]);

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/garments/products')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-pink-600 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Garments
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/garment-products/${id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-pink-50 border-2 border-pink-200 hover:bg-pink-100 text-pink-700 text-sm font-extrabold transition"
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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-fuchsia-400/15 blur-3xl" />

        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20 shrink-0">
            {images[0]?.url ? (
              <img src={images[0].url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50">
                <Shirt className="h-16 w-16" />
              </div>
            )}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {profile?.isNewArrival && (
                <span className="px-2 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-extrabold shadow inline-flex items-center gap-0.5">
                  <Sparkles className="h-2.5 w-2.5" /> NEW
                </span>
              )}
              {profile?.isBestSeller && (
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-extrabold shadow inline-flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-current" /> BEST
                </span>
              )}
              {profile?.isOnSale && (
                <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-extrabold shadow inline-flex items-center gap-0.5">
                  <Zap className="h-2.5 w-2.5" /> SALE
                </span>
              )}
            </div>
            {!product.isActive && (
              <div className="absolute inset-x-0 bottom-0 py-1.5 bg-rose-600 text-white text-center text-xs font-extrabold">
                INACTIVE
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Shirt className="h-3.5 w-3.5 text-amber-300" />
              Garment Product
              {profile?.gender && (
                <>
                  <span className="text-white/40">•</span>
                  <span>{GENDER_EMOJI[profile.gender]} {profile.gender}</span>
                </>
              )}
              {profile?.categoryType && (
                <>
                  <span className="text-white/40">•</span>
                  <span>{profile.categoryType.replace(/_/g, ' ')}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
            {profile?.styleCode && (
              <div className="mt-1 font-mono text-xs text-white/70">Style: {profile.styleCode}</div>
            )}
            {product.description && (
              <p className="mt-2 text-sm text-white/85 max-w-2xl">{product.description}</p>
            )}

            <div className="mt-3 flex items-center gap-3 flex-wrap text-xs">
              {product.sku && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur font-mono">
                  <Hash className="h-3 w-3" /> {product.sku}
                </span>
              )}
              {product.brand && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/30 border border-violet-300/40 font-bold">
                  <Tag className="h-3 w-3" /> {product.brand.name}
                </span>
              )}
              {profile?.fabricType && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/30 border border-purple-300/40 font-bold">
                  {profile.fabricType}
                </span>
              )}
              {profile?.workType && profile.workType !== 'PLAIN' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-fuchsia-500/30 border border-fuchsia-300/40 font-bold">
                  {profile.workType.replace(/_/g, ' ')}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Palette} label="Variants" value={stats.variantCount} sub={`${stats.uniqueSizes}S × ${stats.uniqueColors}C`} tone="pink" />
              <HeroStat icon={Package} label="Stock" value={stats.totalStock} sub={product.unit} tone="emerald" />
              <HeroStat icon={Receipt} label="Sold" value={stats.totalSold} sub={`${stats.totalOrders} orders`} tone="violet" />
              <HeroStat icon={TrendingUp} label="Revenue" value={formatPKR(stats.totalRevenue)} tone="amber" />
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
        <QuickAction to={`/garment-products/${id}/edit`} icon={Edit3} label="Edit" desc="Update details" color="pink" />
        <QuickAction to="/garments/collections" icon={Sparkles} label="Collections" desc="Seasonal groups" color="fuchsia" />
        <QuickAction to="/garments/alterations" icon={Ruler} label="Alterations" desc="Fitting service" color="amber" />
        <QuickAction to="/pos" icon={ShoppingCart} label="Sell" desc="Go to POS" color="emerald" />
      </section>

      {/* SERVICES ENABLED */}
      {profile && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <h3 className="font-extrabold text-slate-900 text-lg leading-tight mb-3 flex items-center gap-2">
            <Award className="h-5 w-5 text-fuchsia-600" />
            Services & Type
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {profile.isReadyMade && <ServiceBadge icon={ShoppingCart} label="Ready-Made" color="emerald" />}
            {profile.isStitchable && <ServiceBadge icon={Ruler} label="Stitchable" desc={`~${profile.defaultStitchingDays}d`} color="purple" />}
            {profile.isFabricOnly && <ServiceBadge icon={Package} label="Fabric Only" color="cyan" />}
            {profile.allowAlteration && <ServiceBadge icon={Ruler} label="Alterations" desc={`Min ${profile.minAlterationDays}d`} color="orange" />}
            {profile.allowReservation && <ServiceBadge icon={Bookmark} label="Reservations" color="blue" />}
            {profile.allowLayaway && <ServiceBadge icon={CreditCard} label="Layaway/EMI" color="emerald" />}
          </div>
        </section>
      )}

      {/* VARIANTS */}
      {variants.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-pink-50/50 to-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-700 text-white flex items-center justify-center shadow-md">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Variants</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {variants.length} variants • {stats.uniqueSizes} sizes × {stats.uniqueColors} colors
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Variant</th>
                  <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">SKU</th>
                  <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Barcode</th>
                  <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Price</th>
                  <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {variants.map((v) => {
                  const vp = variantProfiles.find((p) => p.variantId === v.id);
                  return (
                    <tr key={v.id} className="hover:bg-pink-50/50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {vp?.colorHex && (
                            <span
                              className="h-6 w-6 rounded-full border-2 border-white shadow shrink-0"
                              style={{ backgroundColor: vp.colorHex }}
                            />
                          )}
                          <div>
                            <div className="font-extrabold text-slate-900">{v.name}</div>
                            {vp?.isFeaturedColor && (
                              <span className="text-[9px] font-extrabold text-amber-700 uppercase">⭐ Featured</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs font-mono font-bold text-slate-700">{v.sku || '—'}</td>
                      <td className="px-3 py-2 text-xs font-mono font-bold text-slate-700">{v.barcode || '—'}</td>
                      <td className="px-3 py-2 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(v.price)}</td>
                      <td className={`px-3 py-2 text-right font-extrabold tabular-nums ${
                        v.stock === 0 ? 'text-rose-700' :
                        v.stock <= (v.lowStockAlert ?? 0) ? 'text-amber-700' : 'text-slate-900'
                      }`}>
                        {v.stock}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* FABRIC & CARE */}
      {profile && (profile.fabricType || profile.careInstructions || profile.countryOfOrigin) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <h3 className="font-extrabold text-slate-900 text-lg leading-tight mb-3 flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Fabric & Care
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {profile.fabricType && (
              <InfoRow label="Fabric" value={profile.fabricType} />
            )}
            {profile.fabricBlend && (
              <InfoRow label="Blend" value={profile.fabricBlend} />
            )}
            {profile.pattern && (
              <InfoRow label="Pattern" value={profile.pattern} />
            )}
            {profile.neckline && (
              <InfoRow label="Neckline" value={profile.neckline} />
            )}
            {profile.sleeveType && (
              <InfoRow label="Sleeve" value={profile.sleeveType} />
            )}
            {profile.fitType && (
              <InfoRow label="Fit" value={profile.fitType} />
            )}
            {profile.countryOfOrigin && (
              <InfoRow label="Origin" value={profile.countryOfOrigin} />
            )}
            {profile.manufacturer && (
              <InfoRow label="Manufacturer" value={profile.manufacturer} />
            )}
            {profile.designer && (
              <InfoRow label="Designer" value={profile.designer} />
            )}
          </div>
          {profile.careInstructions && (
            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-1">Care Instructions</div>
              <div className="text-sm text-slate-900 font-semibold">{profile.careInstructions}</div>
            </div>
          )}
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
    pink: 'from-pink-400/30 to-pink-600/20 border-pink-300/40',
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

function QuickAction({ to, icon: Icon, label, desc, color }: any) {
  const colors: Record<string, string> = {
    pink: 'from-pink-500 to-fuchsia-600', fuchsia: 'from-fuchsia-500 to-pink-600',
    amber: 'from-amber-500 to-orange-600', emerald: 'from-emerald-500 to-green-600',
  };
  return (
    <Link to={to} className="rounded-2xl bg-white border-2 border-slate-200 hover:border-pink-300 hover:shadow-md p-4 flex items-center gap-3 transition group">
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-slate-900 text-sm">{label}</div>
        <div className="text-[10px] text-slate-500 font-semibold">{desc}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </Link>
  );
}

function ServiceBadge({ icon: Icon, label, desc, color }: any) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    purple: 'bg-purple-50 border-purple-300 text-purple-800',
    cyan: 'bg-cyan-50 border-cyan-300 text-cyan-800',
    orange: 'bg-orange-50 border-orange-300 text-orange-800',
    blue: 'bg-blue-50 border-blue-300 text-blue-800',
  };
  return (
    <div className={`rounded-xl border-2 p-3 flex items-center gap-3 ${colors[color]}`}>
      <Icon className="h-5 w-5" />
      <div>
        <div className="text-sm font-extrabold">{label}</div>
        {desc && <div className="text-[10px] font-bold opacity-75">{desc}</div>}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
      <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className="text-sm font-extrabold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}
