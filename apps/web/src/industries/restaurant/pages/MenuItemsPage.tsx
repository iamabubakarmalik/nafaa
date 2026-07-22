import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChefHat, Plus, Search, X, Star, Flame, Award, Sparkles,
  RefreshCw, Edit3, Trash2, Eye, EyeOff, Clock, Users,
  Save, Package, AlertCircle, Coffee, Wheat, Egg, Fish,
  Leaf, Beef, Milk, Info, TrendingUp,
} from 'lucide-react';
import { menuItemsApi, type RestaurantMenuItem, type SpiceLevel, type DietaryTag } from '../api/menu-items.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';

const SPICE_CONFIG: Record<SpiceLevel, { label: string; emoji: string; color: string }> = {
  NONE: { label: 'None', emoji: '❄️', color: 'text-slate-600' },
  MILD: { label: 'Mild', emoji: '🌶️', color: 'text-green-600' },
  MEDIUM: { label: 'Medium', emoji: '🌶️🌶️', color: 'text-yellow-600' },
  HOT: { label: 'Hot', emoji: '🌶️🌶️🌶️', color: 'text-orange-600' },
  EXTRA_HOT: { label: 'Extra Hot', emoji: '🔥🔥🔥', color: 'text-red-600' },
};

const DIETARY_CONFIG: Record<DietaryTag, { label: string; icon: any; color: string }> = {
  VEGETARIAN: { label: 'Veg', icon: Leaf, color: 'bg-green-100 text-green-700 border-green-300' },
  VEGAN: { label: 'Vegan', icon: Leaf, color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  HALAL: { label: 'Halal', icon: Award, color: 'bg-teal-100 text-teal-700 border-teal-300' },
  GLUTEN_FREE: { label: 'GF', icon: Wheat, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  DAIRY_FREE: { label: 'DF', icon: Milk, color: 'bg-blue-100 text-blue-700 border-blue-300' },
  NUT_FREE: { label: 'Nut-Free', icon: Info, color: 'bg-orange-100 text-orange-700 border-orange-300' },
  SPICY: { label: 'Spicy', icon: Flame, color: 'bg-red-100 text-red-700 border-red-300' },
  CONTAINS_EGG: { label: 'Egg', icon: Egg, color: 'bg-amber-100 text-amber-700 border-amber-300' },
  CONTAINS_SEAFOOD: { label: 'Seafood', icon: Fish, color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  BEEF: { label: 'Beef', icon: Beef, color: 'bg-rose-100 text-rose-700 border-rose-300' },
  CHICKEN: { label: 'Chicken', icon: Info, color: 'bg-orange-100 text-orange-700 border-orange-300' },
  MUTTON: { label: 'Mutton', icon: Info, color: 'bg-red-100 text-red-700 border-red-300' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MenuItemsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'unavailable' | 'bestseller' | 'chef'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<RestaurantMenuItem | null>(null);

  const { data: items = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['menu-items', filter, search],
    queryFn: () => menuItemsApi.list({
      available: filter === 'available' ? true : filter === 'unavailable' ? false : undefined,
      bestSeller: filter === 'bestseller' ? true : undefined,
      chefSpecial: filter === 'chef' ? true : undefined,
      search: search.trim() || undefined,
    }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => menuItemsApi.toggleAvailable(id),
    onSuccess: (item) => {
      toast.success(item.isAvailable ? 'Item available' : 'Item unavailable');
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => menuItemsApi.remove(id),
    onSuccess: () => {
      toast.success('Menu item removed');
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    },
  });

  const stats = {
    total: items.length,
    available: items.filter((i) => i.isAvailable).length,
    bestsellers: items.filter((i) => i.bestSeller).length,
    chefSpecials: items.filter((i) => i.chefSpecial).length,
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-violet-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Menu Manager
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🍽️ Menu Items
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Restaurant menu — dietary tags, spice level, prep time, chef specials
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20"
            >
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button
              className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => { setEditingItem(null); setShowForm(true); }}
            >
              <Plus className="h-4 w-4" />
              Add Menu Item
            </Button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items" value={stats.total} icon={ChefHat} color="violet" />
        <StatCard label="Available Now" value={stats.available} icon={Eye} color="emerald" />
        <StatCard label="Best Sellers" value={stats.bestsellers} icon={TrendingUp} color="amber" />
        <StatCard label="Chef Specials" value={stats.chefSpecials} icon={Star} color="rose" />
      </section>

      {/* FILTERS */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500"
              placeholder="Search menu items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { v: 'all' as const, label: 'All' },
            { v: 'available' as const, label: 'Available' },
            { v: 'unavailable' as const, label: 'Unavailable' },
            { v: 'bestseller' as const, label: '🏆 Best Sellers' },
            { v: 'chef' as const, label: '⭐ Chef Specials' },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setFilter(opt.v)}
              className={
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
                (filter === opt.v
                  ? 'bg-violet-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200')
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {showForm && (
        <MenuItemForm
          editing={editingItem}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditingItem(null);
            queryClient.invalidateQueries({ queryKey: ['menu-items'] });
          }}
        />
      )}

      {/* MENU ITEMS GRID */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-72 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-violet-100 dark:bg-violet-950/40 mx-auto flex items-center justify-center">
            <ChefHat className="h-10 w-10 text-violet-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No menu items</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">Pehla menu item add karo</p>
          <Button
            className="mt-4 bg-gradient-to-r from-violet-600 to-fuchsia-700"
            onClick={() => { setEditingItem(null); setShowForm(true); }}
          >
            <Plus className="h-4 w-4" />
            Add First Menu Item
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onToggle={() => toggleMutation.mutate(item.id)}
              onEdit={() => { setEditingItem(item); setShowForm(true); }}
              onDelete={() => {
                if (confirm('Delete menu item "' + item.product?.name + '"?')) removeMutation.mutate(item.id);
              }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    violet: 'from-violet-500 to-purple-600',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-red-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function MenuItemCard({ item, onToggle, onEdit, onDelete }: {
  item: RestaurantMenuItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const product = item.product;

  return (
    <div className={
      'group rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden ' +
      (!item.isAvailable ? 'opacity-60 border-slate-200 dark:border-neutral-800' : item.chefSpecial ? 'border-amber-400 ring-2 ring-amber-100 dark:ring-amber-950/40' : 'border-slate-200 dark:border-neutral-800')
    }>
      {/* Image */}
      <div className="relative aspect-video bg-gradient-to-br from-violet-500 via-fuchsia-600 to-pink-600 overflow-hidden">
        {item.imageUrl || product?.images?.[0]?.url ? (
          <img src={item.imageUrl || product?.images?.[0]?.url} alt={product?.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="h-16 w-16 text-white/40" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {item.chefSpecial && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
              <Star className="h-2 w-2 fill-current" /> Chef Special
            </span>
          )}
          {item.bestSeller && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
              <TrendingUp className="h-2 w-2" /> Best Seller
            </span>
          )}
          {item.tagLine && (
            <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[9px] font-extrabold uppercase shadow">
              {item.tagLine}
            </span>
          )}
        </div>

        {/* Availability toggle */}
        <button
          onClick={onToggle}
          className={
            'absolute top-2 right-2 h-8 w-8 rounded-lg backdrop-blur flex items-center justify-center transition shadow-lg ' +
            (item.isAvailable ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white')
          }
          title={item.isAvailable ? 'Available' : 'Unavailable'}
        >
          {item.isAvailable ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>

        {/* Actions on hover */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={onEdit}
            className="h-8 w-8 rounded-lg bg-slate-900/90 text-white flex items-center justify-center hover:bg-slate-900 shadow"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="h-8 w-8 rounded-lg bg-rose-600/90 text-white flex items-center justify-center hover:bg-rose-600 shadow"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2.5">
        <div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">{product?.name || 'Unknown'}</h3>
          {product?.category && (
            <span className="inline-block mt-0.5 text-[10px] font-extrabold uppercase" style={{ color: product.category.color }}>
              {product.category.name}
            </span>
          )}
        </div>

        {/* Attributes */}
        <div className="flex flex-wrap gap-1">
          {item.isSpicy && item.spiceLevel && (
            <span className={'inline-flex items-center gap-0.5 text-xs font-extrabold ' + SPICE_CONFIG[item.spiceLevel].color}>
              <Flame className="h-3 w-3" />
              {SPICE_CONFIG[item.spiceLevel].emoji}
            </span>
          )}
          {item.dietaryTags?.slice(0, 3).map((tag) => {
            const cfg = DIETARY_CONFIG[tag];
            const Icon = cfg.icon;
            return (
              <span key={tag} className={'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold border ' + cfg.color}>
                <Icon className="h-2 w-2" />
                {cfg.label}
              </span>
            );
          })}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold">
          {item.prepTimeMinutes && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {item.prepTimeMinutes}m
            </span>
          )}
          {item.servesPeople && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {item.servesPeople}
            </span>
          )}
          {item.calories && (
            <span>{item.calories} cal</span>
          )}
          {item.servingSize && (
            <span className="truncate">{item.servingSize}</span>
          )}
        </div>

        {/* Price */}
        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-end justify-between">
          <div>
            <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">
              {formatPKR(product?.price ?? 0)}
            </div>
            <div className="text-[10px] font-extrabold text-slate-500 uppercase mt-0.5">Menu Price</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-extrabold text-slate-500">Ordered</div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{item.totalOrdered}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItemForm({ editing, onClose, onSaved }: {
  editing: RestaurantMenuItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [productId, setProductId] = useState(editing?.productId ?? '');
  const [productSearch, setProductSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(!editing);

  const [form, setForm] = useState({
    prepTimeMinutes: editing?.prepTimeMinutes ?? 15,
    cookingInstructions: editing?.cookingInstructions ?? '',
    chefSpecial: editing?.chefSpecial ?? false,
    bestSeller: editing?.bestSeller ?? false,
    isSpicy: editing?.isSpicy ?? false,
    spiceLevel: editing?.spiceLevel ?? ('MILD' as SpiceLevel),
    calories: editing?.calories ?? '',
    servingSize: editing?.servingSize ?? '',
    servesPeople: editing?.servesPeople ?? 1,
    dietaryTags: editing?.dietaryTags ?? [] as DietaryTag[],
    allergenInfo: editing?.allergenInfo ?? '',
    isAvailable: editing?.isAvailable ?? true,
    availableFrom: editing?.availableFrom ?? '',
    availableTo: editing?.availableTo ?? '',
    availableDays: editing?.availableDays ?? [],
    imageUrl: editing?.imageUrl ?? '',
    highlightColor: editing?.highlightColor ?? '',
    tagLine: editing?.tagLine ?? '',
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-for-menu', productSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 30, search: productSearch || undefined }),
    enabled: showProductPicker,
  });

  const selectedProduct = editing?.product;
  const products = productsData?.items ?? [];

  const saveMutation = useMutation({
    mutationFn: () => menuItemsApi.upsert({
      productId,
      prepTimeMinutes: Number(form.prepTimeMinutes) || undefined,
      cookingInstructions: form.cookingInstructions || undefined,
      chefSpecial: form.chefSpecial,
      bestSeller: form.bestSeller,
      isSpicy: form.isSpicy,
      spiceLevel: form.isSpicy ? form.spiceLevel : undefined,
      calories: form.calories ? Number(form.calories) : undefined,
      servingSize: form.servingSize || undefined,
      servesPeople: Number(form.servesPeople) || undefined,
      dietaryTags: form.dietaryTags,
      allergenInfo: form.allergenInfo || undefined,
      isAvailable: form.isAvailable,
      availableFrom: form.availableFrom || undefined,
      availableTo: form.availableTo || undefined,
      availableDays: form.availableDays,
      imageUrl: form.imageUrl || undefined,
      highlightColor: form.highlightColor || undefined,
      tagLine: form.tagLine || undefined,
    }),
    onSuccess: () => {
      toast.success(editing ? 'Menu item updated' : 'Menu item created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const toggleDietaryTag = (tag: DietaryTag) => {
    setForm((f) => ({
      ...f,
      dietaryTags: f.dietaryTags.includes(tag)
        ? f.dietaryTags.filter((t) => t !== tag)
        : [...f.dietaryTags, tag],
    }));
  };

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      availableDays: f.availableDays.includes(day)
        ? f.availableDays.filter((d) => d !== day)
        : [...f.availableDays, day],
    }));
  };

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-violet-300 dark:border-violet-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-violet-50 dark:bg-violet-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">{editing ? 'Edit Menu Item' : 'New Menu Item'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
        {/* PRODUCT PICKER */}
        {!productId || showProductPicker ? (
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Select Product *</label>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="mt-2 max-h-56 overflow-y-auto space-y-1 rounded-xl border border-slate-200 dark:border-neutral-700">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setProductId(p.id); setShowProductPicker(false); }}
                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800 transition text-left"
                >
                  <Package className="h-4 w-4 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate text-slate-900 dark:text-white">{p.name}</div>
                    <div className="text-xs text-slate-500 font-semibold">{formatPKR(p.price)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border-2 border-violet-200 dark:border-violet-800 p-3 flex items-center gap-3">
            <Package className="h-5 w-5 text-violet-600" />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 dark:text-white">{selectedProduct?.name || 'Selected product'}</div>
              <div className="text-xs text-slate-500 font-semibold">Product ID: {productId.slice(0, 8)}...</div>
            </div>
            {!editing && (
              <button onClick={() => { setProductId(''); setShowProductPicker(true); }} className="text-xs font-extrabold text-violet-600 hover:underline">
                Change
              </button>
            )}
          </div>
        )}

        {productId && (
          <>
            {/* BASIC INFO */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Prep Time (minutes)</label>
                <input
                  type="number"
                  value={form.prepTimeMinutes}
                  onChange={(e) => setForm({ ...form, prepTimeMinutes: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Serves People</label>
                <input
                  type="number"
                  value={form.servesPeople}
                  onChange={(e) => setForm({ ...form, servesPeople: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Calories</label>
                <input
                  type="number"
                  value={form.calories}
                  onChange={(e) => setForm({ ...form, calories: e.target.value as any })}
                  placeholder="Optional"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Serving Size</label>
                <input
                  value={form.servingSize}
                  onChange={(e) => setForm({ ...form, servingSize: e.target.value })}
                  placeholder="1 plate / 500ml"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Tag Line</label>
                <input
                  value={form.tagLine}
                  onChange={(e) => setForm({ ...form, tagLine: e.target.value })}
                  placeholder="New! / Popular"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {/* FLAGS */}
            <div className="grid grid-cols-3 gap-2">
              <label className={
                'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ' +
                (form.chefSpecial ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'border-slate-200 dark:border-neutral-700 hover:border-amber-300')
              }>
                <input type="checkbox" checked={form.chefSpecial} onChange={(e) => setForm({ ...form, chefSpecial: e.target.checked })} className="h-4 w-4 rounded" />
                <Star className={'h-4 w-4 ' + (form.chefSpecial ? 'text-amber-500 fill-amber-500' : 'text-slate-400')} />
                <span className="text-xs font-extrabold">Chef Special</span>
              </label>
              <label className={
                'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ' +
                (form.bestSeller ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'border-slate-200 dark:border-neutral-700 hover:border-emerald-300')
              }>
                <input type="checkbox" checked={form.bestSeller} onChange={(e) => setForm({ ...form, bestSeller: e.target.checked })} className="h-4 w-4 rounded" />
                <TrendingUp className={'h-4 w-4 ' + (form.bestSeller ? 'text-emerald-600' : 'text-slate-400')} />
                <span className="text-xs font-extrabold">Best Seller</span>
              </label>
              <label className={
                'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ' +
                (form.isAvailable ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40' : 'border-slate-200 dark:border-neutral-700')
              }>
                <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} className="h-4 w-4 rounded" />
                {form.isAvailable ? <Eye className="h-4 w-4 text-blue-600" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
                <span className="text-xs font-extrabold">Available</span>
              </label>
            </div>

            {/* SPICE */}
            <div className="rounded-xl border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isSpicy} onChange={(e) => setForm({ ...form, isSpicy: e.target.checked })} className="h-4 w-4 rounded" />
                <Flame className="h-4 w-4 text-red-600" />
                <span className="text-sm font-extrabold text-red-900 dark:text-red-300">Is Spicy?</span>
              </label>
              {form.isSpicy && (
                <div className="grid grid-cols-5 gap-1">
                  {(['MILD', 'MEDIUM', 'HOT', 'EXTRA_HOT'] as SpiceLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setForm({ ...form, spiceLevel: level })}
                      className={
                        'p-2 rounded-lg text-xs font-extrabold transition ' +
                        (form.spiceLevel === level
                          ? 'bg-red-600 text-white shadow'
                          : 'bg-white dark:bg-neutral-800 border border-slate-200 text-slate-700 hover:border-red-300')
                      }
                    >
                      <div>{SPICE_CONFIG[level].emoji}</div>
                      <div className="text-[9px] mt-0.5">{SPICE_CONFIG[level].label}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* DIETARY TAGS */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2 block">Dietary Tags</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(DIETARY_CONFIG).map(([tag, cfg]) => {
                  const active = form.dietaryTags.includes(tag as DietaryTag);
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleDietaryTag(tag as DietaryTag)}
                      className={
                        'px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 border-2 transition ' +
                        (active ? cfg.color + ' shadow' : 'bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-600 hover:border-slate-300')
                      }
                    >
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ALLERGEN */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Allergen Info</label>
              <textarea
                rows={2}
                value={form.allergenInfo}
                onChange={(e) => setForm({ ...form, allergenInfo: e.target.value })}
                placeholder="Contains peanuts, may contain traces of dairy..."
                className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>

            {/* COOKING INSTRUCTIONS */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Cooking Instructions (Kitchen)</label>
              <textarea
                rows={3}
                value={form.cookingInstructions}
                onChange={(e) => setForm({ ...form, cookingInstructions: e.target.value })}
                placeholder="Grill on medium heat for 8 minutes each side..."
                className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>

            {/* AVAILABILITY TIME */}
            <div className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 p-4 space-y-3">
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">Time-based Availability (Optional)</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Available From</label>
                  <input
                    type="time"
                    value={form.availableFrom}
                    onChange={(e) => setForm({ ...form, availableFrom: e.target.value })}
                    className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Available To</label>
                  <input
                    type="time"
                    value={form.availableTo}
                    onChange={(e) => setForm({ ...form, availableTo: e.target.value })}
                    className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2 block">Days of Week</label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map((day, idx) => {
                    const active = form.availableDays.includes(idx);
                    return (
                      <button
                        key={day}
                        onClick={() => toggleDay(idx)}
                        className={
                          'py-2 rounded-lg text-xs font-extrabold transition ' +
                          (active
                            ? 'bg-violet-600 text-white shadow'
                            : 'bg-white dark:bg-neutral-800 border-2 border-slate-200 dark:border-neutral-700 text-slate-600 hover:border-violet-300')
                        }
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">Empty = available all days</p>
              </div>
            </div>

            {/* IMAGE */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Custom Menu Image</label>
              {form.imageUrl ? (
                <div className="relative w-40 h-40 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-neutral-700">
                  <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setForm({ ...form, imageUrl: '' })}
                    className="absolute top-1 right-1 h-7 w-7 rounded-lg bg-rose-600 text-white flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <UploadDropzone
                  onUploaded={(records) => {
                    const first = Array.isArray(records) ? records[0] : records;
                    const url = typeof first === 'string' ? first : (first as any)?.url;
                    if (url) setForm({ ...form, imageUrl: url });
                  }}
                />
              )}
            </div>

            {/* ACTIONS */}
            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
              <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-700"
                onClick={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
                disabled={!productId}
              >
                <Save className="h-4 w-4" />
                {editing ? 'Update Menu Item' : 'Create Menu Item'}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
