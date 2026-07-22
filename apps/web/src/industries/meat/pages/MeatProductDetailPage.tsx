import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Beef, ShieldCheck, Award, MapPin, Building2,
  Package, Snowflake, Leaf, TrendingUp, Star, Zap, Thermometer,
  Calendar, FileText, Hash, Tag, DollarSign, Receipt, ShoppingCart,
  ChevronRight, ExternalLink, Trash2, Eye, Image as ImageIcon,
  Activity, Utensils, Scissors,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productImagesApi } from '@modules/inventory/products/api/product-images.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { meatProductsApi } from '../api/products.api';

const ANIMAL_EMOJI: Record<string, string> = {
  BEEF: '🐄', MUTTON: '🐑', GOAT: '🐐', LAMB: '🐏',
  CHICKEN: '🐔', DUCK: '🦆', TURKEY: '🦃', QUAIL: '🐦',
  CAMEL: '🐫', BUFFALO: '🐃', FISH: '🐟', PRAWN: '🦐',
};

const GRADE_COLORS: Record<string, string> = {
  PREMIUM: 'bg-gradient-to-r from-amber-500 to-yellow-600',
  GRADE_A: 'bg-gradient-to-r from-emerald-500 to-green-600',
  GRADE_B: 'bg-gradient-to-r from-blue-500 to-cyan-600',
  GRADE_C: 'bg-gradient-to-r from-slate-500 to-slate-700',
  STANDARD: 'bg-gradient-to-r from-slate-400 to-slate-600',
  ECONOMY: 'bg-gradient-to-r from-orange-400 to-red-500',
};

export default function MeatProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: profile } = useQuery({
    queryKey: ['meat-profile', id],
    queryFn: () => meatProductsApi.byProduct(id!),
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
      navigate('/meat/products');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const stats = useMemo(() => {
    const soldItems = allSales.flatMap((s) =>
      s.items.filter((it) => it.product.id === id).map((it) => ({ ...it, sale: s })),
    );
    const totalSoldKg = soldItems.reduce((a, it) => a + Number(it.quantity || 0), 0);
    const totalRevenue = soldItems.reduce((a, it) => a + Number(it.total || 0), 0);
    const totalOrders = new Set(soldItems.map((it) => it.sale.id)).size;
    return { totalSoldKg, totalRevenue, totalOrders };
  }, [allSales, id]);

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-red-200 border-t-red-600 animate-spin" />
      </div>
    );
  }

  const animalEmoji = profile ? ANIMAL_EMOJI[profile.animalType] || '🥩' : '🥩';
  const nutrition = profile?.nutritionInfo as any;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/meat/products')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/meat-products/${id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border-2 border-red-200 hover:bg-red-100 text-red-700 text-sm font-extrabold transition"
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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-red-900 to-rose-800 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-red-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-rose-400/15 blur-3xl" />

        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20 shrink-0">
            {images[0]?.url ? (
              <img src={images[0].url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl">
                {animalEmoji}
              </div>
            )}
            {profile?.isHalalCertified && (
              <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> HALAL
              </div>
            )}
            {product.isFeatured && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-white" /> FEATURED
              </div>
            )}
            {profile?.isOnSale && (
              <div className="absolute top-14 right-3 px-2 py-1 rounded-lg bg-rose-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                <Zap className="h-3 w-3" /> SALE
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
              <Beef className="h-3.5 w-3.5 text-amber-300" />
              Meat Product
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

            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              {profile?.qualityGrade && (
                <span className={'px-2 py-1 rounded-md text-white font-extrabold ' + GRADE_COLORS[profile.qualityGrade]}>
                  <Award className="h-3 w-3 inline mr-1" />
                  {profile.qualityGrade.replace('_', ' ')}
                </span>
              )}
              {profile?.cutCategory && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 backdrop-blur font-bold">
                  <Scissors className="h-3 w-3" /> {profile.cutCategory.replace(/_/g, ' ')}
                </span>
              )}
              {profile?.freshnessType && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 backdrop-blur font-bold">
                  {profile.freshnessType === 'FROZEN' ? <Snowflake className="h-3 w-3" /> : '❄️'}
                  {profile.freshnessType.replace(/_/g, ' ')}
                </span>
              )}
              {profile?.isBoneless && (
                <span className="px-2 py-1 rounded-md bg-white/10 backdrop-blur font-bold">BONELESS</span>
              )}
              {profile?.isOrganic && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/30 border border-green-300/40 font-bold">
                  <Leaf className="h-3 w-3" /> ORGANIC
                </span>
              )}
              {product.sku && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 backdrop-blur font-mono font-bold">
                  <Hash className="h-3 w-3" /> {product.sku}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={ShieldCheck} label="Halal" value={profile?.isHalalCertified ? '✓' : '—'} tone="emerald" />
              <HeroStat icon={Receipt} label="Sold" value={`${stats.totalSoldKg.toFixed(1)}kg`} sub={`${stats.totalOrders} orders`} tone="orange" />
              <HeroStat icon={TrendingUp} label="Revenue" value={formatPKR(stats.totalRevenue)} tone="emerald" />
              <HeroStat icon={Thermometer} label="Shelf Life" value={`${profile?.shelfLifeDays || 0}d`} tone="blue" />
            </div>

            <div className="mt-5 flex items-center gap-4 flex-wrap">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Price per kg</div>
                <div className="text-3xl font-extrabold tabular-nums leading-none mt-1">
                  {formatPKRFull(profile?.pricePerKg || product.price)}
                </div>
              </div>
              {profile?.pricePerPiece && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Per piece</div>
                  <div className="text-xl font-extrabold tabular-nums text-white/80 leading-none mt-1">
                    {formatPKRFull(profile.pricePerPiece)}
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
              {product.costPrice > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Cost</div>
                  <div className="text-xl font-extrabold tabular-nums text-white/80 leading-none mt-1">
                    {formatPKRFull(product.costPrice)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Halal Certification Card */}
      {profile?.isHalalCertified && (
        <section className="rounded-3xl bg-white border-2 border-emerald-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-900 text-lg leading-tight">Halal Certified</h3>
              <p className="text-xs text-emerald-700 font-semibold">Verified halal product</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            {profile.halalCertNumber && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <div className="text-[10px] uppercase font-extrabold text-emerald-700">Certificate #</div>
                <div className="font-extrabold text-emerald-900 font-mono">{profile.halalCertNumber}</div>
              </div>
            )}
            {profile.halalCertBy && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <div className="text-[10px] uppercase font-extrabold text-emerald-700">Certified By</div>
                <div className="font-extrabold text-emerald-900">{profile.halalCertBy}</div>
              </div>
            )}
            {profile.halalCertExpiry && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <div className="text-[10px] uppercase font-extrabold text-emerald-700">Expires</div>
                <div className="font-extrabold text-emerald-900">
                  {new Date(profile.halalCertExpiry).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            )}
          </div>
          {profile.otherCerts && profile.otherCerts.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-1">Other Certifications</div>
              <div className="flex flex-wrap gap-1.5">
                {profile.otherCerts.map((cert: string) => (
                  <span key={cert} className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-extrabold">{cert}</span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Farm & Origin */}
      {profile && (profile.farmName || profile.slaughterhouseName || profile.breed) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 text-white flex items-center justify-center shadow-md">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Farm & Origin</h3>
              <p className="text-xs text-slate-500 font-semibold">Traceability information</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {profile.farmName && (
              <InfoBox icon={MapPin} label="Farm" value={profile.farmName} sub={profile.farmLocation} />
            )}
            {profile.countryOfOrigin && (
              <InfoBox icon={MapPin} label="Origin" value={profile.countryOfOrigin} />
            )}
            {profile.breed && (
              <InfoBox icon={Beef} label="Breed" value={profile.breed} />
            )}
            {profile.animalAge && (
              <InfoBox icon={Calendar} label="Age" value={profile.animalAge} />
            )}
            {profile.animalSex && (
              <InfoBox icon={Activity} label="Sex" value={profile.animalSex} />
            )}
            {profile.slaughterhouseName && (
              <InfoBox icon={Building2} label="Slaughterhouse" value={profile.slaughterhouseName} sub={profile.slaughterhouseLic ? 'Lic: ' + profile.slaughterhouseLic : ''} />
            )}
            {profile.batchNumber && (
              <InfoBox icon={FileText} label="Batch" value={profile.batchNumber} />
            )}
            {profile.cuttingStyle && (
              <InfoBox icon={Scissors} label="Cutting" value={profile.cuttingStyle} />
            )}
            {profile.cleaningLevel && (
              <InfoBox icon={Package} label="Cleaning" value={profile.cleaningLevel} />
            )}
          </div>
        </section>
      )}

      {/* Storage & Packaging */}
      {profile && (profile.shelfLifeDays || profile.packagingType) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow-md">
              <Thermometer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Storage & Packaging</h3>
              <p className="text-xs text-slate-500 font-semibold">How to handle & store</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-4 gap-3 text-sm">
            {(profile.storageTempMin !== null || profile.storageTempMax !== null) && (
              <InfoBox icon={Thermometer} label="Temperature"
                value={`${profile.storageTempMin ?? '?'}°C – ${profile.storageTempMax ?? '?'}°C`} />
            )}
            {profile.shelfLifeDays && (
              <InfoBox icon={Calendar} label="Shelf Life" value={`${profile.shelfLifeDays} days`} />
            )}
            {profile.packagingType && (
              <InfoBox icon={Package} label="Packaging" value={profile.packagingType} />
            )}
            {profile.packagingWeight && (
              <InfoBox icon={Package} label="Pack Weight" value={`${profile.packagingWeight}kg`} />
            )}
          </div>
        </section>
      )}

      {/* Nutrition */}
      {nutrition && Object.keys(nutrition).length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-violet-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-violet-900 text-lg leading-tight">Nutrition Information</h3>
              <p className="text-xs text-violet-700 font-semibold">Per 100g serving</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {nutrition.calories && (
              <NutritionBox label="Calories" value={nutrition.calories} unit="kcal" tone="orange" />
            )}
            {nutrition.protein && (
              <NutritionBox label="Protein" value={nutrition.protein} unit="g" tone="red" />
            )}
            {nutrition.fat && (
              <NutritionBox label="Fat" value={nutrition.fat} unit="g" tone="amber" />
            )}
            {nutrition.carbs !== undefined && nutrition.carbs !== null && (
              <NutritionBox label="Carbs" value={nutrition.carbs} unit="g" tone="blue" />
            )}
            {nutrition.cholesterol && (
              <NutritionBox label="Cholesterol" value={nutrition.cholesterol} unit="mg" tone="violet" />
            )}
            {nutrition.sodium && (
              <NutritionBox label="Sodium" value={nutrition.sodium} unit="mg" tone="slate" />
            )}
          </div>
        </section>
      )}

      {/* Cooking Suggestions */}
      {profile?.cookingSuggestions && (
        <section className="rounded-3xl bg-orange-50 border-2 border-orange-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <Utensils className="h-5 w-5 text-orange-700" />
            <h3 className="font-extrabold text-orange-900 text-lg">Cooking Suggestions</h3>
          </div>
          <p className="text-sm text-orange-900 font-semibold whitespace-pre-line">{profile.cookingSuggestions}</p>
        </section>
      )}

      {/* Long Description */}
      {profile?.descriptionLong && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-5 w-5 text-slate-700" />
            <h3 className="font-extrabold text-slate-900 text-lg">Full Description</h3>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-line">{profile.descriptionLong}</p>
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
              {salesForProduct.length} recent orders • {stats.totalSoldKg.toFixed(1)}kg sold
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
                        {s.customer?.name || 'Walk-in'} • {qty}kg
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
    orange: 'from-orange-400/30 to-orange-600/20 border-orange-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
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

function InfoBox({ icon: Icon, label, value, sub }: any) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase font-extrabold text-slate-600 mb-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="font-extrabold text-slate-900 text-sm">{value}</div>
      {sub && <div className="text-[10px] text-slate-500 font-bold mt-0.5">{sub}</div>}
    </div>
  );
}

function NutritionBox({ label, value, unit, tone }: any) {
  const tones: Record<string, string> = {
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    violet: 'bg-violet-50 border-violet-200 text-violet-800',
    slate: 'bg-slate-50 border-slate-200 text-slate-800',
  };
  return (
    <div className={`rounded-lg border-2 p-3 text-center ${tones[tone]}`}>
      <div className="text-[10px] uppercase font-extrabold opacity-80">{label}</div>
      <div className="text-xl font-extrabold tabular-nums mt-1">{value}<span className="text-xs font-bold ml-0.5">{unit}</span></div>
    </div>
  );
}
