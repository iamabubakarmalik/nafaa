import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Trash2, Cake, Star, TrendingUp, Sparkles,
  Clock, Timer, Snowflake, Heart, AlertTriangle, Info, Package,
  DollarSign, Eye, ExternalLink, ShoppingCart, ChefHat, Palette,
  Ruler, Calendar, CheckCircle2, XCircle, ImageIcon, Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { bakeryProductsApi } from '../api/products.api';
import { CATEGORIES, FLAVORS, SHAPES, CREAMS } from '../api/constants';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { ErrorBoundary } from '@core/components/error/ErrorBoundary';

export default function BakeryProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeImage, setActiveImage] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: profile } = useQuery({
    queryKey: ['bakery-profile-by-product', id],
    queryFn: () => bakeryProductsApi.byProduct(id!).catch(() => null),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: () => productsApi.remove(id!),
    onSuccess: (data: any) => {
      toast.success(data?.softDeleted ? 'Product deactivated' : 'Product deleted');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Cake className="h-16 w-16 text-slate-300" />
        <p className="font-extrabold text-slate-700">Product not found</p>
        <Link to="/products" className="text-pink-600 font-bold hover:underline">← Back to products</Link>
      </div>
    );
  }

  const category = CATEGORIES.find((c) => c.value === profile?.category);
  const flavor = FLAVORS.find((f) => f.value === profile?.defaultFlavor);
  const shape = SHAPES.find((s) => s.value === profile?.defaultShape);
  const cream = CREAMS.find((c) => c.value === profile?.defaultCreamType);

  const images = product.images ?? [];
  const currentImage = images[activeImage]?.url;

  const priceOptions = profile
    ? [
        { key: 'kg', price: profile.pricePerKg, label: 'Per Kg', emoji: '⚖️' },
        { key: 'pound', price: profile.pricePerPound, label: 'Per Pound', emoji: '⚖️' },
        { key: 'piece', price: profile.pricePerPiece, label: 'Per Piece', emoji: '🎂' },
        { key: 'dozen', price: profile.pricePerDozen, label: 'Per Dozen', emoji: '📦' },
        { key: 'slice', price: profile.pricePerSlice, label: 'Per Slice', emoji: '🍰' },
        { key: 'box', price: profile.pricePerBox, label: 'Per Box', emoji: '📦' },
        { key: 'tray', price: profile.pricePerTray, label: 'Per Tray', emoji: '🍱' },
      ].filter((o) => o.price && Number(o.price) > 0)
    : [];

  const minPrice = priceOptions.length
    ? Math.min(...priceOptions.map((o) => Number(o.price)))
    : Number(product.price || 0);

  return (
    <ErrorBoundary>
      <div className="space-y-5 pb-10">
        {/* ─── TOP BAR ─── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-pink-600 font-bold transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/catalog"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl bg-pink-50 border-2 border-pink-200 px-3 py-2 text-xs font-bold text-pink-700 hover:bg-pink-100"
            >
              <Eye className="h-3.5 w-3.5" /> View in Catalog <ExternalLink className="h-3 w-3" />
            </Link>
            <Link to={`/bakery-products/${id}/edit`}>
              <Button className="bg-gradient-to-r from-pink-600 to-fuchsia-700">
                <Edit3 className="h-4 w-4" /> Edit Product
              </Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                if (confirm(`Delete "${product.name}"?`)) removeMutation.mutate();
              }}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        {/* ─── HERO ─── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white p-6 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

          <div className="relative grid lg:grid-cols-[1fr_1fr] gap-6 items-start">
            {/* Image gallery */}
            <div>
              <div className="relative aspect-square rounded-3xl bg-gradient-to-br from-pink-100 via-fuchsia-100 to-purple-100 overflow-hidden shadow-2xl">
                {currentImage ? (
                  <img src={currentImage} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl">
                    {category?.emoji || '🎂'}
                  </div>
                )}
                {profile?.isFeatured && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-extrabold uppercase inline-flex items-center gap-1 shadow-lg">
                    <Star className="h-3 w-3 fill-white" /> FEATURED
                  </div>
                )}
                {profile?.isBestSeller && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-rose-500 text-white text-xs font-extrabold uppercase inline-flex items-center gap-1 shadow-lg">
                    <TrendingUp className="h-3 w-3" /> BEST SELLER
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {images.map((img: any, idx: number) => (
                    <button
                      key={img.id ?? idx}
                      onClick={() => setActiveImage(idx)}
                      className={`shrink-0 h-16 w-16 rounded-xl overflow-hidden border-2 transition ${
                        activeImage === idx ? 'border-white shadow-lg scale-105' : 'border-white/30 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                    🍰 Bakery Product
                  </div>
                  {category && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur px-2.5 py-0.5 text-xs font-extrabold border border-white/20">
                      {category.emoji} {category.label}
                    </div>
                  )}
                  {!product.isActive && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-rose-500/30 backdrop-blur px-2.5 py-0.5 text-xs font-extrabold border border-rose-300/40">
                      <XCircle className="h-3 w-3" /> INACTIVE
                    </div>
                  )}
                </div>
                <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
                {product.brand && (
                  <div className="mt-1 text-sm font-bold text-white/80">by {product.brand.name}</div>
                )}
              </div>

              {(profile?.descriptionLong || product.description) && (
                <p className="text-sm text-white/85 leading-relaxed">
                  {profile?.descriptionLong || product.description}
                </p>
              )}

              {/* Starting Price */}
              <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-4">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">
                  Starting At
                </div>
                <div className="text-4xl font-extrabold tabular-nums text-emerald-300 mt-1">
                  {formatPKRFull(minPrice)}
                </div>
                {product.wholesalePrice && (
                  <div className="text-xs font-bold text-amber-300 mt-1">
                    Wholesale: {formatPKR(product.wholesalePrice)}
                  </div>
                )}
              </div>

              {/* Marketing badges */}
              <div className="flex flex-wrap gap-1.5">
                {profile?.isPopular && <Badge label="🔥 Popular" />}
                {profile?.isNewArrival && <Badge label="✨ New Arrival" />}
                {profile?.isSeasonalItem && <Badge label={`🌸 ${profile.seasonName || 'Seasonal'}`} />}
                {profile?.isCakeCustomizable && <Badge label="✏️ Customizable" />}
              </div>

              {/* Dietary badges */}
              <div className="flex flex-wrap gap-1.5">
                {profile?.isEggless && <DietBadge emoji="🥚" label="Eggless" />}
                {profile?.isVegan && <DietBadge emoji="🌱" label="Vegan" />}
                {profile?.isSugarFree && <DietBadge emoji="🍬" label="Sugar-Free" />}
                {profile?.isHalal && <DietBadge emoji="☪️" label="Halal" />}
              </div>
            </div>
          </div>
        </section>

        {/* ─── PRICING TIERS ─── */}
        {priceOptions.length > 0 && (
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-md">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Pricing Tiers</h3>
                <p className="text-[11px] text-slate-500 font-semibold">
                  {priceOptions.length} unit{priceOptions.length !== 1 ? 's' : ''} available
                </p>
              </div>
            </div>
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {priceOptions.map((opt) => (
                <div
                  key={opt.key}
                  className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 hover:border-pink-300 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{opt.emoji}</span>
                    <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      {opt.label}
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">
                    {formatPKR(Number(opt.price))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── CAKE CUSTOMIZATION (if applicable) ─── */}
        {profile?.isCakeCustomizable && (
          <section className="rounded-3xl bg-gradient-to-br from-fuchsia-50 via-white to-pink-50 border-2 border-fuchsia-200 shadow-sm p-5">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-fuchsia-200/60">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white flex items-center justify-center shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Cake Customization</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Options available to customer</p>
              </div>
            </div>

            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              {flavor && (
                <PreviewCard label="Default Flavor" emoji={flavor.emoji} value={flavor.label} gradient={flavor.color} />
              )}
              {shape && (
                <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600">Default Shape</div>
                  <div className="mt-1 text-2xl">{shape.emoji}</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-1">{shape.label}</div>
                </div>
              )}
              {cream && (
                <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600">Cream Type</div>
                  <div className="mt-1 text-2xl">{cream.emoji}</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-1">{cream.label}</div>
                </div>
              )}
            </div>

            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <CapabilityBadge active={profile.allowsMessageOnCake} label="Message on Cake" emoji="✍️" />
              <CapabilityBadge active={profile.allowsPhotoOnCake} label="Photo Cake" emoji="📸" />
              <CapabilityBadge active={profile.allowsCustomShape} label="Custom Shape" emoji="✨" />
              <CapabilityBadge active={profile.allowsFlavorChoice} label="Flavor Choice" emoji="🎨" />
              <CapabilityBadge active={profile.allowsSizeChoice} label="Size Choice" emoji="📏" />
            </div>

            {(profile as any).decorativeItems && (profile as any).decorativeItems.length > 0 && (
              <div className="mt-4 pt-4 border-t-2 border-fuchsia-200/60">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-fuchsia-700 mb-2">
                  Decorative Items Offered
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(profile as any).decorativeItems.map((d: string) => (
                    <span
                      key={d}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg border-2 border-fuchsia-200 bg-white text-xs font-extrabold text-fuchsia-800"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ─── PRODUCTION & TIMING ─── */}
        {profile && (
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-md">
                <ChefHat className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Production & Storage</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Timing and shelf life</p>
              </div>
            </div>

            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {profile.prepTimeHours && (
                <InfoTile icon={Clock} label="Prep Time" value={`${profile.prepTimeHours}h`} tone="orange" />
              )}
              {profile.advanceOrderHours && (
                <InfoTile icon={Calendar} label="Advance Order" value={`${profile.advanceOrderHours}h`} tone="amber" />
              )}
              {profile.shelfLifeDays && (
                <InfoTile icon={Timer} label="Shelf Life" value={`${profile.shelfLifeDays} days`} tone="emerald" />
              )}
              {profile.shelfLifeHours && !profile.shelfLifeDays && (
                <InfoTile icon={Timer} label="Shelf Life" value={`${profile.shelfLifeHours}h`} tone="emerald" />
              )}
              {profile.minOrderQty > 1 && (
                <InfoTile icon={Package} label="Min Order" value={String(profile.minOrderQty)} tone="blue" />
              )}
              {profile.maxOrderQty && (
                <InfoTile icon={Package} label="Max Order" value={String(profile.maxOrderQty)} tone="violet" />
              )}
              {profile.servingSize && (
                <InfoTile icon={Ruler} label="Serves" value={`${profile.servingSize} people`} tone="pink" />
              )}
              {profile.numberOfSlices && (
                <InfoTile icon={Ruler} label="Slices" value={String(profile.numberOfSlices)} tone="rose" />
              )}
            </div>

            {profile.requiresRefrigeration && (
              <div className="mt-4 rounded-xl bg-cyan-50 border-2 border-cyan-200 p-3 flex items-start gap-2">
                <Snowflake className="h-4 w-4 text-cyan-700 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-cyan-900">Refrigeration Required</strong>
                  <div className="text-cyan-800 font-semibold mt-0.5">Store in fridge immediately after purchase</div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ─── ALLERGENS & DIET ─── */}
        {profile && (profile.allergens?.length > 0 || profile.containsEgg || profile.containsNuts || profile.containsGluten || profile.containsDairy) && (
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Allergens & Ingredients</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Customer safety info</p>
              </div>
            </div>

            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <ContainsBadge active={profile.containsEgg} label="Contains Egg" emoji="🥚" />
              <ContainsBadge active={profile.containsDairy} label="Contains Dairy" emoji="🥛" />
              <ContainsBadge active={profile.containsGluten} label="Contains Gluten" emoji="🌾" />
              <ContainsBadge active={profile.containsNuts} label="Contains Nuts" emoji="🥜" />
            </div>

            {profile.allergens && profile.allergens.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 mb-2">
                  Additional Allergens
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.allergens.map((a: string) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border-2 border-amber-200 bg-amber-50 text-xs font-extrabold text-amber-900"
                    >
                      ⚠️ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.ingredientList && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">Ingredients</div>
                <p className="text-sm text-slate-700 leading-relaxed">{profile.ingredientList}</p>
              </div>
            )}

            {profile.caloriesPerServing && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border-2 border-red-200">
                <Award className="h-4 w-4 text-red-700" />
                <span className="text-sm font-extrabold text-red-900 tabular-nums">
                  {profile.caloriesPerServing} kcal per serving
                </span>
              </div>
            )}
          </section>
        )}

        {/* ─── SERVING SUGGESTIONS ─── */}
        {profile?.servingSuggestions && (
          <section className="rounded-3xl bg-gradient-to-br from-pink-50 via-white to-fuchsia-50 border-2 border-pink-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white flex items-center justify-center shadow-md">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Serving Suggestions</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Best way to enjoy</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{profile.servingSuggestions}</p>
          </section>
        )}

        {/* ─── META ─── */}
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetaRow label="SKU" value={product.sku || '—'} mono />
            <MetaRow label="Barcode" value={product.barcode || '—'} mono />
            <MetaRow label="Unit" value={product.unit} />
            <MetaRow label="Tax Rate" value={`${product.taxRate ?? 0}%`} />
            <MetaRow label="Category" value={product.category?.name || '—'} />
            <MetaRow label="Brand" value={product.brand?.name || '—'} />
            <MetaRow label="Weight" value={product.weight ? `${product.weight}${product.weightUnit || 'g'}` : '—'} />
            <MetaRow label="Created" value={new Date(product.createdAt).toLocaleDateString('en-PK')} />
          </div>
        </section>
      </div>
    </ErrorBoundary>
  );
}

// ═════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/20 backdrop-blur border border-white/30 px-2.5 py-1 text-[11px] font-extrabold">
      {label}
    </span>
  );
}

function DietBadge({ emoji, label }: { emoji: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/25 backdrop-blur border border-emerald-300/50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-100">
      <span>{emoji}</span> {label}
    </span>
  );
}

function PreviewCard({ label, emoji, value, gradient }: { label: string; emoji: string; value: string; gradient: string }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 p-3 pb-2">{label}</div>
      <div className={`bg-gradient-to-br ${gradient} px-4 py-4 text-white text-center`}>
        <div className="text-3xl">{emoji}</div>
        <div className="text-sm font-extrabold mt-1 drop-shadow">{value}</div>
      </div>
    </div>
  );
}

function CapabilityBadge({ active, label, emoji }: { active: boolean; label: string; emoji: string }) {
  return (
    <div className={`rounded-xl border-2 p-2.5 flex items-center gap-2 ${
      active
        ? 'border-fuchsia-300 bg-fuchsia-50'
        : 'border-slate-200 bg-white opacity-50'
    }`}>
      <span className="text-lg">{emoji}</span>
      <div className="flex-1">
        <div className={`text-xs font-extrabold ${active ? 'text-fuchsia-900' : 'text-slate-500 line-through'}`}>
          {label}
        </div>
      </div>
      {active
        ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        : <XCircle className="h-4 w-4 text-slate-400" />}
    </div>
  );
}

function ContainsBadge({ active, label, emoji }: { active: boolean; label: string; emoji: string }) {
  return (
    <div className={`rounded-xl border-2 p-2.5 flex items-center gap-2 ${
      active
        ? 'border-amber-300 bg-amber-50'
        : 'border-slate-200 bg-slate-50 opacity-60'
    }`}>
      <span className="text-lg">{emoji}</span>
      <div className={`text-xs font-extrabold ${active ? 'text-amber-900' : 'text-slate-500'}`}>
        {label}
      </div>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  const tones: Record<string, string> = {
    orange: 'from-orange-500 to-red-500 text-orange-700 bg-orange-50 border-orange-200',
    amber: 'from-amber-500 to-orange-500 text-amber-700 bg-amber-50 border-amber-200',
    emerald: 'from-emerald-500 to-green-600 text-emerald-700 bg-emerald-50 border-emerald-200',
    blue: 'from-blue-500 to-cyan-500 text-blue-700 bg-blue-50 border-blue-200',
    violet: 'from-violet-500 to-purple-600 text-violet-700 bg-violet-50 border-violet-200',
    pink: 'from-pink-500 to-fuchsia-600 text-pink-700 bg-pink-50 border-pink-200',
    rose: 'from-rose-500 to-pink-600 text-rose-700 bg-rose-50 border-rose-200',
  };
  const parts = tones[tone] || tones.blue;
  const [gradFrom, gradTo, textCls, bgCls, borderCls] = parts.split(' ');
  return (
    <div className={`rounded-2xl border-2 ${borderCls} ${bgCls} p-3`}>
      <div className={`inline-flex items-center gap-1.5 ${textCls}`}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] uppercase tracking-wider font-extrabold">{label}</span>
      </div>
      <div className={`mt-1 text-lg font-extrabold ${textCls} tabular-nums`}>{value}</div>
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">{label}</div>
      <div className={`mt-1 text-sm font-extrabold text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
