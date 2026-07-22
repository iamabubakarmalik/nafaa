import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, ChefHat, Flame, Star, TrendingUp, Award,
  Clock, Users, Leaf, Sparkles, BookOpen, Package, Hash, Tag,
  DollarSign, Receipt, ShoppingCart, ChevronRight, ExternalLink,
  Trash2, Eye, Image as ImageIcon, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { productsApi } from '@/api/products.api';
import { productImagesApi } from '@/api/product-images.api';
import { salesApi } from '@/api/sales.api';
import { menuItemsApi } from '../api/menu-items.api';
import { recipesApi } from '../api/recipes.api';

const SPICE_EMOJI: Record<string, string> = {
  MILD: '🌶️', MEDIUM: '🌶️🌶️', HOT: '🌶️🌶️🌶️', EXTRA_HOT: '🔥🔥🔥',
};

const DIETARY_LABELS: Record<string, { label: string; color: string }> = {
  VEGETARIAN: { label: 'Vegetarian', color: 'bg-green-100 text-green-700 border-green-300' },
  VEGAN: { label: 'Vegan', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  HALAL: { label: 'Halal', color: 'bg-teal-100 text-teal-700 border-teal-300' },
  GLUTEN_FREE: { label: 'Gluten Free', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  DAIRY_FREE: { label: 'Dairy Free', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  NUT_FREE: { label: 'Nut Free', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  SPICY: { label: 'Spicy', color: 'bg-red-100 text-red-700 border-red-300' },
  CONTAINS_EGG: { label: 'Contains Egg', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  CONTAINS_SEAFOOD: { label: 'Seafood', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  BEEF: { label: 'Beef', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  CHICKEN: { label: 'Chicken', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  MUTTON: { label: 'Mutton', color: 'bg-red-100 text-red-700 border-red-300' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RestaurantMenuItemDetailPage() {
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

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu-items'],
    queryFn: () => menuItemsApi.list(),
  });

  const menuItem = useMemo(
    () => menuItems.find((m: any) => m.productId === id),
    [menuItems, id]
  );

  const { data: recipe } = useQuery({
    queryKey: ['recipe-for-menu-item', menuItem?.id],
    queryFn: () => recipesApi.getByMenuItem(menuItem!.id),
    enabled: !!menuItem?.id,
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
      toast.success(data?.softDeleted ? 'Item deactivated' : 'Item deleted');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/restaurant/menu');
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
    const recipeCost = (recipe?.ingredients ?? []).reduce(
      (a: number, i: any) => a + Number(i.quantity || 0) * Number(i.costPerUnit || 0), 0
    );
    return {
      totalSold, totalRevenue, totalOrders,
      recipeCost,
      profit: (product?.price ?? 0) - (recipeCost || (product?.costPrice ?? 0)),
      ingredientCount: recipe?.ingredients?.length ?? 0,
    };
  }, [allSales, id, recipe, product]);

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/restaurant/menu')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Menu
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/restaurant-menu-items/${id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 border-2 border-orange-200 hover:bg-orange-100 text-orange-700 text-sm font-extrabold transition"
          >
            <Edit3 className="h-4 w-4" /> Edit Item
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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-red-400/15 blur-3xl" />

        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20 shrink-0">
            {images[0]?.url ? (
              <img src={images[0].url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50">
                <ChefHat className="h-16 w-16" />
              </div>
            )}
            {menuItem?.chefSpecial && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-white" /> CHEF SPECIAL
              </div>
            )}
            {menuItem?.bestSeller && (
              <div className="absolute top-12 right-3 px-2 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> BEST SELLER
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
              <ChefHat className="h-3.5 w-3.5 text-amber-300" />
              Menu Item
              {product.category && (
                <>
                  <span className="text-white/40">•</span>
                  <span>{product.category.name}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
            {menuItem?.tagLine && (
              <p className="mt-2 text-sm text-amber-300 font-extrabold">✨ {menuItem.tagLine}</p>
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
              {menuItem?.isSpicy && menuItem?.spiceLevel && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/30 border border-red-300/40 font-bold">
                  <Flame className="h-3 w-3" /> {SPICE_EMOJI[menuItem.spiceLevel]} {menuItem.spiceLevel}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Clock} label="Prep" value={`${menuItem?.prepTimeMinutes || 0}m`} tone="orange" />
              <HeroStat icon={Users} label="Serves" value={menuItem?.servesPeople || 1} tone="blue" />
              <HeroStat icon={Receipt} label="Sold" value={stats.totalSold} sub={`${stats.totalOrders} orders`} tone="violet" />
              <HeroStat icon={TrendingUp} label="Revenue" value={formatPKR(stats.totalRevenue)} tone="emerald" />
            </div>

            <div className="mt-5 flex items-center gap-4 flex-wrap">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Menu Price</div>
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
              {stats.recipeCost > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Recipe Cost</div>
                  <div className="text-xl font-extrabold tabular-nums text-amber-300 leading-none mt-1">
                    {formatPKRFull(stats.recipeCost)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Dietary Tags */}
      {menuItem?.dietaryTags && menuItem.dietaryTags.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white flex items-center justify-center shadow-md">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Dietary Info</h3>
              <p className="text-xs text-slate-500 font-semibold">{menuItem.dietaryTags.length} tags</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {menuItem.dietaryTags.map((tag: string) => {
              const cfg = DIETARY_LABELS[tag];
              if (!cfg) return null;
              return (
                <span key={tag} className={`px-3 py-1.5 rounded-lg border-2 text-xs font-extrabold ${cfg.color}`}>
                  {cfg.label}
                </span>
              );
            })}
          </div>
          {menuItem.allergenInfo && (
            <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 font-semibold">
              <strong>⚠️ Allergen:</strong> {menuItem.allergenInfo}
            </div>
          )}
        </section>
      )}

      {/* Modifiers */}
      {menuItem?.modifiers && menuItem.modifiers.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Customization Options</h3>
              <p className="text-xs text-slate-500 font-semibold">{menuItem.modifiers.length} modifier groups</p>
            </div>
          </div>
          <div className="space-y-2">
            {menuItem.modifiers.map((mm: any) => {
              const g = mm.modifierGroup;
              if (!g) return null;
              return (
                <div key={g.id} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <div className="font-extrabold text-slate-900 text-sm">{g.name}</div>
                    <span className="px-1.5 py-0.5 rounded bg-pink-200 text-pink-800 text-[9px] font-extrabold uppercase">{g.type}</span>
                    {g.isRequired && <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-extrabold uppercase">Required</span>}
                    <span className="text-[10px] text-slate-500 font-bold">Choose {g.minSelections}–{g.maxSelections}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {g.options?.map((o: any) => (
                      <span key={o.id} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-700">
                        {o.emoji} {o.name}
                        {(o.priceAdjustment ?? 0) !== 0 && ` (${o.priceAdjustment > 0 ? '+' : ''}${formatPKR(o.priceAdjustment)})`}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recipe */}
      {recipe && recipe.ingredients && recipe.ingredients.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-amber-50/50 to-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Recipe / BOM</h3>
              <p className="text-xs text-slate-500 font-semibold">
                Yields {recipe.yieldQuantity} {recipe.yieldUnit} • {recipe.ingredients.length} ingredients
                {recipe.cookingTime && ` • ${recipe.cookingTime}m cook time`}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Ingredient</th>
                  <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Qty</th>
                  <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Unit</th>
                  <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Cost</th>
                  <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recipe.ingredients.map((ing: any) => (
                  <tr key={ing.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-extrabold text-slate-900">
                      {ing.ingredient?.name || 'Unknown'}
                      {ing.isOptional && <span className="ml-2 text-[9px] font-extrabold text-slate-500 uppercase">(optional)</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{ing.quantity}</td>
                    <td className="px-3 py-2 text-xs font-semibold">{ing.unit}</td>
                    <td className="px-3 py-2 text-right text-xs font-bold text-slate-700">{formatPKR(ing.costPerUnit || 0)}</td>
                    <td className="px-3 py-2 text-right font-extrabold text-emerald-700 tabular-nums">
                      {formatPKR((ing.quantity || 0) * (ing.costPerUnit || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-amber-50 border-t-2 border-amber-200">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right text-xs font-extrabold text-amber-900 uppercase">Total Recipe Cost</td>
                  <td className="px-3 py-2 text-right text-sm font-extrabold text-amber-900 tabular-nums">
                    {formatPKRFull(stats.recipeCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {recipe.preparationSteps && (
            <div className="p-5 border-t border-slate-100 bg-slate-50/50">
              <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-2">Preparation Steps</div>
              <div className="text-sm text-slate-900 whitespace-pre-line font-semibold">{recipe.preparationSteps}</div>
            </div>
          )}
        </section>
      )}

      {/* Availability Schedule */}
      {menuItem && (menuItem.availableFrom || menuItem.availableTo || (menuItem.availableDays && menuItem.availableDays.length > 0)) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-md">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Availability Schedule</h3>
              <p className="text-xs text-slate-500 font-semibold">When this item is available</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {menuItem.availableFrom && menuItem.availableTo && (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border-2 border-blue-200">
                <Clock className="h-4 w-4 text-blue-700" />
                <span className="font-extrabold text-blue-900">{menuItem.availableFrom} – {menuItem.availableTo}</span>
              </div>
            )}
            {menuItem.availableDays && menuItem.availableDays.length > 0 && (
              <div className="flex gap-1">
                {DAYS.map((day, idx) => {
                  const active = menuItem.availableDays.includes(idx);
                  return (
                    <span
                      key={day}
                      className={[
                        'px-2 py-1 rounded text-[10px] font-extrabold',
                        active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400',
                      ].join(' ')}
                    >
                      {day}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
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
              {salesForProduct.length} recent orders • {stats.totalSold} items sold
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
