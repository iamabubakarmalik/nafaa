import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Package, Wrench, Car, ShieldCheck, Award,
  Hash, Star, Zap, AlertCircle, TrendingUp, DollarSign, Globe,
  Clock, Receipt, ShoppingCart, ChevronRight, ExternalLink,
  Trash2, Eye, Image as ImageIcon, Tag, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { productsApi } from '@/api/products.api';
import { productImagesApi } from '@/api/product-images.api';
import { salesApi } from '@/api/sales.api';
import { partProfilesApi } from '../api/part-profiles.api';

const CONDITION_COLORS: Record<string, string> = {
  NEW: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  GENUINE: 'bg-blue-100 text-blue-800 border-blue-300',
  OEM: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  AFTERMARKET: 'bg-orange-100 text-orange-800 border-orange-300',
  REFURBISHED: 'bg-violet-100 text-violet-800 border-violet-300',
  USED: 'bg-amber-100 text-amber-800 border-amber-300',
  LOCAL: 'bg-slate-100 text-slate-800 border-slate-300',
};

export default function AutoPartDetailPage() {
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

  const { data: profile } = useQuery({
    queryKey: ['part-profile', id],
    queryFn: () => partProfilesApi.byProduct(id!),
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
      toast.success(data?.softDeleted ? 'Part deactivated' : 'Part deleted');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/autoparts/parts');
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
    const stockValue = (product?.stock || 0) * (product?.price || 0);
    const stockCost = (product?.stock || 0) * (product?.costPrice || 0);
    return { totalSold, totalRevenue, totalOrders, stockValue, stockCost };
  }, [allSales, id, product]);

  const compatibility = profile?.compatibility as any;
  const isUniversal = compatibility?.isUniversal;
  const fitments = compatibility?.fitments || [];

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-slate-700 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/autoparts/parts')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Parts
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/autoparts-products/${id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 border-2 border-slate-200 hover:bg-slate-200 text-slate-700 text-sm font-extrabold transition"
          >
            <Edit3 className="h-4 w-4" /> Edit Part
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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-800 to-slate-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-slate-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-orange-400/15 blur-3xl" />

        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20 shrink-0">
            {images[0]?.url ? (
              <img src={images[0].url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50">
                <Package className="h-16 w-16" />
              </div>
            )}
            {profile?.isFastMoving && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-red-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                <Zap className="h-3 w-3" /> FAST MOVING
              </div>
            )}
            {profile?.isCritical && (
              <div className="absolute top-12 right-3 px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> CRITICAL
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
              <Wrench className="h-3.5 w-3.5 text-amber-300" />
              Auto Part
              {profile?.category && (
                <>
                  <span className="text-white/40">•</span>
                  <span>{profile.category.replace(/_/g, ' ')}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
            {product.description && (
              <p className="mt-2 text-sm text-white/85 max-w-2xl">{product.description}</p>
            )}

            <div className="mt-3 flex items-center gap-3 flex-wrap text-xs">
              {profile?.partNumber && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur font-mono">
                  <Hash className="h-3 w-3" /> {profile.partNumber}
                </span>
              )}
              {profile?.oemNumber && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/30 border border-blue-300/40 font-mono">
                  OEM: {profile.oemNumber}
                </span>
              )}
              {profile?.condition && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/30 border border-emerald-300/40 font-bold">
                  <Award className="h-3 w-3" /> {profile.condition}
                </span>
              )}
              {profile?.brand && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/30 border border-violet-300/40 font-bold">
                  {profile.brand}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Package} label="Stock" value={product.stock || 0} sub={product.unit} tone="slate" />
              <HeroStat icon={ShieldCheck} label="Warranty" value={`${profile?.warrantyMonths || 0}m`} tone="emerald" />
              <HeroStat icon={Receipt} label="Sold" value={stats.totalSold} sub={`${stats.totalOrders} orders`} tone="violet" />
              <HeroStat icon={TrendingUp} label="Revenue" value={formatPKR(stats.totalRevenue)} tone="amber" />
            </div>

            <div className="mt-5 flex items-center gap-4 flex-wrap">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Sale Price</div>
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

      {/* Part Numbers */}
      {(profile?.partNumber || profile?.oemNumber || (profile?.alternateNumbers && profile.alternateNumbers.length > 0)) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center shadow-md">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Part Numbers</h3>
              <p className="text-xs text-slate-500 font-semibold">All reference numbers</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {profile?.partNumber && (
              <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3">
                <div className="text-[10px] uppercase font-extrabold text-blue-700">Part Number</div>
                <div className="mt-1 text-lg font-mono font-extrabold text-blue-900">{profile.partNumber}</div>
              </div>
            )}
            {profile?.oemNumber && (
              <div className="rounded-xl bg-cyan-50 border-2 border-cyan-200 p-3">
                <div className="text-[10px] uppercase font-extrabold text-cyan-700">OEM Number</div>
                <div className="mt-1 text-lg font-mono font-extrabold text-cyan-900">{profile.oemNumber}</div>
              </div>
            )}
          </div>
          {profile?.alternateNumbers && profile.alternateNumbers.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-2">Cross-Reference Numbers</div>
              <div className="flex flex-wrap gap-1.5">
                {profile.alternateNumbers.map((num) => (
                  <span key={num} className="px-2 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-mono font-bold">
                    {num}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Specs */}
      {profile && (profile.brand || profile.manufacturer || profile.countryOfOrigin || profile.weightGrams || profile.material) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center shadow-md">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Specifications</h3>
              <p className="text-xs text-slate-500 font-semibold">Physical & manufacturer info</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {profile.brand && <SpecCell label="Brand" value={profile.brand} icon={Award} />}
            {profile.manufacturer && <SpecCell label="Manufacturer" value={profile.manufacturer} icon={Package} />}
            {profile.countryOfOrigin && <SpecCell label="Origin" value={profile.countryOfOrigin} icon={Globe} />}
            {profile.weightGrams && <SpecCell label="Weight" value={`${profile.weightGrams}g`} />}
            {profile.dimensions && <SpecCell label="Dimensions" value={profile.dimensions} />}
            {profile.material && <SpecCell label="Material" value={profile.material} />}
            {profile.color && <SpecCell label="Color" value={profile.color} />}
          </div>
        </section>
      )}

      {/* Warranty */}
      {profile && profile.warrantyMonths > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-900 text-lg leading-tight">Warranty</h3>
              <p className="text-xs text-emerald-700 font-semibold">Coverage details</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-white border-2 border-emerald-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-emerald-700">Duration</div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-900">
                {profile.warrantyMonths} <span className="text-sm">months</span>
              </div>
            </div>
            {profile.warrantyKm && (
              <div className="rounded-xl bg-white border-2 border-emerald-200 p-3">
                <div className="text-[10px] uppercase font-extrabold text-emerald-700">Mileage Limit</div>
                <div className="mt-1 text-2xl font-extrabold text-emerald-900 tabular-nums">
                  {profile.warrantyKm.toLocaleString()} km
                </div>
              </div>
            )}
          </div>
          {profile.warrantyNotes && (
            <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm font-semibold text-emerald-900">
              {profile.warrantyNotes}
            </div>
          )}
        </section>
      )}

      {/* Vehicle Compatibility */}
      {compatibility && (isUniversal || fitments.length > 0) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-fuchsia-50/50 to-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-700 text-white flex items-center justify-center shadow-md">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Vehicle Compatibility</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {isUniversal ? 'Universal fitment' : `${fitments.length} vehicle${fitments.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {isUniversal ? (
            <div className="p-8 text-center">
              <Globe className="h-16 w-16 text-emerald-500 mx-auto mb-3" />
              <div className="text-xl font-extrabold text-emerald-900">Universal Fit</div>
              <div className="text-sm text-emerald-700 font-semibold mt-1">
                Fits all vehicles / generic sizing
              </div>
            </div>
          ) : (
            <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {fitments.map((f: any, idx: number) => (
                <div key={idx} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-slate-900 text-sm truncate">
                        {f.makeName} {f.modelName}
                      </div>
                      {(f.yearFrom || f.yearTo) && (
                        <div className="text-[10px] font-bold text-slate-500 inline-flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5" />
                          {f.yearFrom || '?'} – {f.yearTo || 'Present'}
                        </div>
                      )}
                    </div>
                  </div>
                  {f.engineOptions && f.engineOptions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {f.engineOptions.map((e: string, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-fuchsia-100 text-fuchsia-800 text-[9px] font-extrabold">
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                  {f.notes && (
                    <div className="mt-1 text-[10px] italic text-slate-600 font-semibold">{f.notes}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Installation Info */}
      {profile && (profile.installationMinutes || profile.installationDifficulty || profile.requiresSpecialTool) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center shadow-md">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Installation</h3>
              <p className="text-xs text-slate-500 font-semibold">Difficulty & time</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {profile.installationMinutes && (
              <div className="rounded-xl bg-orange-50 border-2 border-orange-200 p-3">
                <div className="text-[10px] uppercase font-extrabold text-orange-700 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> Estimated Time
                </div>
                <div className="mt-1 text-xl font-extrabold text-orange-900">{profile.installationMinutes} min</div>
              </div>
            )}
            {profile.installationDifficulty && (
              <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3">
                <div className="text-[10px] uppercase font-extrabold text-amber-700">Difficulty</div>
                <div className="mt-1 text-xl font-extrabold text-amber-900">{profile.installationDifficulty}</div>
              </div>
            )}
            {profile.requiresSpecialTool && (
              <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-3">
                <div className="text-[10px] uppercase font-extrabold text-rose-700">⚠️ Special Tool</div>
                <div className="mt-1 text-sm font-extrabold text-rose-900">Required</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link to="/autoparts/parts" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-slate-100 group-hover:bg-slate-700 group-hover:text-white text-slate-700 flex items-center justify-center transition">
            <Package className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Parts Catalog</div>
            <div className="text-[10px] text-slate-500 font-semibold">All auto parts</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/autoparts/jobs/new" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-orange-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-orange-100 group-hover:bg-orange-600 group-hover:text-white text-orange-700 flex items-center justify-center transition">
            <Wrench className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Use in Job</div>
            <div className="text-[10px] text-slate-500 font-semibold">Add to workshop job</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/autoparts/vehicles" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-fuchsia-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-fuchsia-100 group-hover:bg-fuchsia-600 group-hover:text-white text-fuchsia-700 flex items-center justify-center transition">
            <Car className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Vehicles</div>
            <div className="text-[10px] text-slate-500 font-semibold">Customer vehicles</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/pos" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-emerald-100 group-hover:bg-emerald-600 group-hover:text-white text-emerald-700 flex items-center justify-center transition">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Go to POS</div>
            <div className="text-[10px] text-slate-500 font-semibold">Sell this part</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
      </section>

      {/* Sales History */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Sales History</h3>
            <p className="text-xs text-slate-500 font-semibold">
              {salesForProduct.length} recent orders • {stats.totalSold} units sold
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
    slate: 'from-slate-400/30 to-slate-600/20 border-slate-300/40',
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
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

function SpecCell({ label, value, icon: Icon }: any) {
  return (
    <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
      <div className="text-[10px] uppercase font-extrabold text-slate-600 flex items-center gap-1">
        {Icon && <Icon className="h-2.5 w-2.5" />}
        {label}
      </div>
      <div className="mt-1 text-sm font-extrabold text-slate-900">{value}</div>
    </div>
  );
}
