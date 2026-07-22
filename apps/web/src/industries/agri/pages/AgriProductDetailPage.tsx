import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Wheat, Leaf, Sprout, Bug, Beef, Award,
  ShieldCheck, AlertTriangle, Package, Hash, Tag, DollarSign,
  Receipt, ChevronRight, ExternalLink, Trash2, Eye,
  Image as ImageIcon, Star, TrendingUp, Calendar, Beaker, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productImagesApi } from '@modules/inventory/products/api/product-images.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { agriProductsApi } from '../api/products.api';

const CAT_EMOJI: Record<string, string> = {
  SEEDS: '🌱', FERTILIZER: '🧪', PESTICIDE: '💊', HERBICIDE: '🌿',
  FUNGICIDE: '🍄', INSECTICIDE: '🐛', ANIMAL_FEED: '🐄', POULTRY_FEED: '🐔',
  CATTLE_FEED: '🐮', FISH_FEED: '🐟', VETERINARY_MEDICINE: '💉',
  FARM_TOOLS: '🔧', IRRIGATION: '💧', MACHINERY_PART: '⚙️',
  ORGANIC_INPUT: '🍃', OTHER: '📦',
};

export default function AgriProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: images = [] } = useQuery({
    queryKey: ['product-images', id],
    queryFn: () => productImagesApi.list(id!),
    enabled: !!id,
  });

  const { data: agriProfiles = [] } = useQuery({
    queryKey: ['agri-products-all'],
    queryFn: () => agriProductsApi.list({}),
  });

  const profile = useMemo(
    () => agriProfiles.find((p: any) => p.productId === id),
    [agriProfiles, id],
  );

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
      navigate('/agri/dashboard');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const stats = useMemo(() => {
    const soldItems = allSales.flatMap((s) =>
      s.items.filter((it) => it.product.id === id).map((it) => ({ ...it, sale: s })),
    );
    const totalSold = soldItems.reduce((a, it) => a + Number(it.quantity || 0), 0);
    const totalRevenue = soldItems.reduce((a, it) => a + Number(it.total || 0), 0);
    const totalOrders = new Set(soldItems.map((it) => it.sale.id)).size;
    return {
      totalSold, totalRevenue, totalOrders,
      stock: product ? Number(product.stock || 0) : 0,
      stockValue: product ? Number(product.stock || 0) * Number(product.price || 0) : 0,
      cropCount: profile?.targetCrops?.length ?? 0,
      pestCount: profile?.targetPests?.length ?? 0,
      animalCount: profile?.targetAnimals?.length ?? 0,
    };
  }, [allSales, id, product, profile]);

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-lime-200 border-t-lime-600 animate-spin" />
      </div>
    );
  }

  const agriCategory = profile?.category || 'OTHER';
  const catEmoji = CAT_EMOJI[agriCategory] || '🌾';

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/agri/dashboard')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-lime-600 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/agri-products/${id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-lime-50 border-2 border-lime-200 hover:bg-lime-100 text-lime-700 text-sm font-extrabold transition"
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
            onClick={() => { if (confirm(`Delete "${product.name}"?`)) removeMutation.mutate(); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border-2 border-rose-200 hover:bg-rose-100 text-rose-700 text-sm font-extrabold transition"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-lime-900 to-green-800 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-lime-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-green-400/15 blur-3xl" />
        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20 shrink-0">
            {images[0]?.url ? (
              <img src={images[0].url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-white/40">
                {catEmoji}
              </div>
            )}
            {profile?.isFeatured && (
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
              <span className="text-base">{catEmoji}</span>
              {agriCategory.replace(/_/g, ' ')}
              {product.category && (
                <>
                  <span className="text-white/40">•</span>
                  <span>{product.category.name}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
            {product.description && (
              <p className="mt-2 text-sm text-white/85 max-w-2xl">{product.description}</p>
            )}

            <div className="mt-3 flex items-center gap-3 flex-wrap text-xs">
              {product.sku && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur font-mono">
                  <Hash className="h-3 w-3" /> {product.sku}
                </span>
              )}
              {profile?.brand && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/30 border border-violet-300/40 font-bold">
                  <Tag className="h-3 w-3" /> {profile.brand}
                </span>
              )}
              {profile?.isOrganic && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/30 border border-emerald-300/40 font-extrabold uppercase">
                  <Leaf className="h-3 w-3" /> Organic
                </span>
              )}
              {profile?.isRestricted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/30 border border-rose-300/40 font-extrabold uppercase animate-pulse">
                  <AlertTriangle className="h-3 w-3" /> Restricted
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Package} label="Stock" value={stats.stock} sub={product.unit} tone="lime" />
              <HeroStat icon={Sprout} label="Crops" value={stats.cropCount} tone="emerald" />
              <HeroStat icon={Receipt} label="Sold" value={stats.totalSold} sub={`${stats.totalOrders} orders`} tone="violet" />
              <HeroStat icon={TrendingUp} label="Revenue" value={formatPKR(stats.totalRevenue)} tone="amber" />
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
        <Link to="/agri/farmers" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-lime-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-lime-100 group-hover:bg-lime-600 group-hover:text-white text-lime-700 flex items-center justify-center transition">
            <Wheat className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Farmers</div>
            <div className="text-[10px] text-slate-500 font-semibold">Bulk orders</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/agri/bulk-orders/new" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-teal-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-teal-100 group-hover:bg-teal-600 group-hover:text-white text-teal-700 flex items-center justify-center transition">
            <Package className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">New Bulk Order</div>
            <div className="text-[10px] text-slate-500 font-semibold">Farmer order</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/agri/advisory" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-green-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-green-100 group-hover:bg-green-600 group-hover:text-white text-green-700 flex items-center justify-center transition">
            <Leaf className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Crop Advisory</div>
            <div className="text-[10px] text-slate-500 font-semibold">Recommendations</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/pos" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-amber-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-amber-100 group-hover:bg-amber-600 group-hover:text-white text-amber-700 flex items-center justify-center transition">
            <DollarSign className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Go to POS</div>
            <div className="text-[10px] text-slate-500 font-semibold">Sell this product</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
      </section>

      {/* Chemical Specs */}
      {profile && (profile.npkRatio || profile.activeIngredient || profile.concentration) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-md">
              <Beaker className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Chemical Specifications</h3>
              <p className="text-xs text-slate-500 font-semibold">NPK, active ingredient, concentration</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {profile.npkRatio && <SpecBox label="NPK Ratio" value={profile.npkRatio} tone="blue" />}
            {profile.activeIngredient && <SpecBox label="Active Ingredient" value={profile.activeIngredient} tone="emerald" />}
            {profile.concentration && <SpecBox label="Concentration" value={profile.concentration} tone="violet" />}
            {profile.packSize && <SpecBox label="Pack Size" value={`${profile.packSize} ${profile.packUnit || ''}`} tone="amber" />}
          </div>
        </section>
      )}

      {/* Target Crops / Pests / Animals */}
      {profile && (profile.targetCrops?.length > 0 || profile.targetPests?.length > 0 || profile.targetAnimals?.length > 0) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-lime-700 text-white flex items-center justify-center shadow-md">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Targets</h3>
              <p className="text-xs text-slate-500 font-semibold">Crops, pests, animals</p>
            </div>
          </div>

          {profile.targetCrops?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-extrabold text-green-700 mb-2 flex items-center gap-1">
                <Sprout className="h-3 w-3" /> Target Crops ({profile.targetCrops.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.targetCrops.map((crop: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-extrabold border border-green-200">
                    {crop}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.targetPests?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-extrabold text-rose-700 mb-2 flex items-center gap-1">
                <Bug className="h-3 w-3" /> Target Pests ({profile.targetPests.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.targetPests.map((pest: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 text-xs font-extrabold border border-rose-200">
                    {pest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.targetAnimals?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-extrabold text-violet-700 mb-2 flex items-center gap-1">
                <Beef className="h-3 w-3" /> Target Animals ({profile.targetAnimals.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.targetAnimals.map((animal: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-violet-100 text-violet-700 text-xs font-extrabold border border-violet-200">
                    {animal}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Certifications */}
      {profile && (profile.isOrganic || profile.govtRegNumber) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white flex items-center justify-center shadow-md">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Certifications</h3>
              <p className="text-xs text-slate-500 font-semibold">Organic & govt registration</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {profile.isOrganic && (
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Leaf className="h-4 w-4 text-emerald-600" />
                  <div className="text-xs font-extrabold text-emerald-700 uppercase">Organic Certified</div>
                </div>
                {profile.organicCertNumber && (
                  <div className="text-xs font-mono font-bold text-emerald-800">Cert #: {profile.organicCertNumber}</div>
                )}
              </div>
            )}
            {profile.govtRegNumber && (
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-4 w-4 text-blue-600" />
                  <div className="text-xs font-extrabold text-blue-700 uppercase">Govt Registered</div>
                </div>
                <div className="text-xs font-mono font-bold text-blue-800">Reg #: {profile.govtRegNumber}</div>
                {profile.govtRegExpiry && (
                  <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                    Expires: {new Date(profile.govtRegExpiry).toLocaleDateString('en-PK')}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Safety Info */}
      {profile && (profile.toxicityLevel || profile.warningLabel || profile.precautions || profile.firstAid) && (
        <section className="rounded-3xl bg-white border-2 border-rose-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Safety Information</h3>
              <p className="text-xs text-slate-500 font-semibold">Hazard, precautions, first aid</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            {profile.toxicityLevel && <SpecBox label="Toxicity" value={profile.toxicityLevel.replace(/_/g, ' ')} tone="rose" />}
            {profile.hazardClass && <SpecBox label="Hazard Class" value={profile.hazardClass} tone="amber" />}
            {profile.warningLabel && <SpecBox label="Warning" value={profile.warningLabel} tone="rose" />}
            {profile.ppePeriod && <SpecBox label="PPE Period" value={`${profile.ppePeriod}h`} tone="amber" />}
            {profile.reEntryPeriod && <SpecBox label="Re-entry" value={`${profile.reEntryPeriod}h`} tone="amber" />}
            {profile.season && <SpecBox label="Season" value={profile.season} tone="teal" />}
          </div>
          {profile.precautions && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-2">
              <div className="text-[10px] uppercase font-extrabold text-amber-700 mb-1">⚠️ Precautions</div>
              <div className="text-sm text-slate-800 font-semibold">{profile.precautions}</div>
            </div>
          )}
          {profile.firstAid && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-rose-700 mb-1">🚑 First Aid</div>
              <div className="text-sm text-slate-800 font-semibold">{profile.firstAid}</div>
            </div>
          )}
        </section>
      )}

      {/* Application & Storage */}
      {profile && (profile.applicationRate || profile.applicationMethod || profile.storageInstructions || profile.shelfLifeMonths) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Application & Storage</h3>
              <p className="text-xs text-slate-500 font-semibold">Usage rate, method, storage</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            {profile.applicationRate && <SpecBox label="Application Rate" value={profile.applicationRate} tone="emerald" />}
            {profile.applicationMethod && <SpecBox label="Method" value={profile.applicationMethod} tone="blue" />}
            {profile.applicationInterval && <SpecBox label="Interval" value={profile.applicationInterval} tone="violet" />}
            {profile.shelfLifeMonths && <SpecBox label="Shelf Life" value={`${profile.shelfLifeMonths} months`} tone="amber" />}
            {profile.storageTemp && <SpecBox label="Storage Temp" value={profile.storageTemp} tone="slate" />}
          </div>
          {profile.storageInstructions && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 mb-2">
              <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-1">📦 Storage</div>
              <div className="text-sm text-slate-700 font-semibold">{profile.storageInstructions}</div>
            </div>
          )}
          {profile.usageInstructions && (
            <div className="rounded-xl bg-lime-50 border border-lime-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-lime-700 mb-1">📋 Usage Instructions</div>
              <div className="text-sm text-slate-700 font-semibold whitespace-pre-line">{profile.usageInstructions}</div>
            </div>
          )}
        </section>
      )}

      {/* Sales History */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Sales History</h3>
            <p className="text-xs text-slate-500 font-semibold">
              {salesForProduct.length} recent • {stats.totalSold} {product.unit} sold
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
                <Link key={s.id} to={`/sales/${s.id}/receipt`} className="block px-5 py-3 hover:bg-slate-50/50 transition">
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
    lime: 'from-lime-400/30 to-lime-600/20 border-lime-300/40',
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

function SpecBox({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
    teal: 'border-teal-200 bg-teal-50 text-teal-800',
  };
  return (
    <div className={`rounded-xl border-2 p-3 ${tones[tone] || tones.slate}`}>
      <div className="text-[10px] uppercase font-extrabold opacity-75 mb-0.5">{label}</div>
      <div className="text-sm font-extrabold">{value}</div>
    </div>
  );
}
