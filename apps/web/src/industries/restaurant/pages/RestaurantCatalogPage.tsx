import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChefHat, Search, X, Flame, Star, Clock, Users, Leaf, Sparkles,
  ShoppingBag, Plus, Heart, Share2, MessageCircle, Utensils,
  Bike, Package, Car, Home, TrendingUp, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { menuItemsApi } from '../api/menu-items.api';
import { modifiersApi } from '../api/modifiers.api';
import { useAuthStore } from '@core/stores/auth.store';
import { useCatalogCart } from '@modules/catalog/hooks/useCatalogCart';
import { useWishlist } from '@modules/catalog/hooks/useWishlist';
import { CatalogCartDrawer } from '@modules/catalog/components/CatalogCartDrawer';

const MODES = [
  { value: 'DINE_IN', label: 'Dine-in', icon: Utensils, color: '#10b981' },
  { value: 'TAKEAWAY', label: 'Takeaway', icon: ShoppingBag, color: '#3b82f6' },
  { value: 'DELIVERY', label: 'Delivery', icon: Bike, color: '#8b5cf6' },
  { value: 'PICKUP', label: 'Pickup', icon: Package, color: '#06b6d4' },
];

export default function RestaurantCatalogPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const cart = useCatalogCart();
  const wishlist = useWishlist();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showFeatured, setShowFeatured] = useState(false);
  const [modeSelected, setModeSelected] = useState<string>('DINE_IN');
  const [showCart, setShowCart] = useState(false);
  const [modifierPicker, setModifierPicker] = useState<any>(null);
  const [detailItem, setDetailItem] = useState<any>(null);

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['restaurant-catalog-menu'],
    queryFn: () => menuItemsApi.list({ available: true }),
  });

  const { data: modifierGroups = [] } = useQuery({
    queryKey: ['modifier-groups-catalog'],
    queryFn: () => modifiersApi.list(),
  });

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const cats: { id: string; name: string; color: string; count: number }[] = [];
    for (const mi of menuItems) {
      const cat = (mi as any).product?.category;
      if (cat?.id && !seen.has(cat.id)) {
        seen.add(cat.id);
        cats.push({
          id: cat.id,
          name: cat.name,
          color: cat.color || '#f97316',
          count: menuItems.filter((m: any) => m.product?.categoryId === cat.id).length,
        });
      }
    }
    return cats;
  }, [menuItems]);

  const filtered = useMemo(() => {
    let list = menuItems;
    if (categoryFilter !== 'all') list = list.filter((mi: any) => mi.product?.categoryId === categoryFilter);
    if (showFeatured) list = list.filter((mi: any) => mi.chefSpecial || mi.bestSeller);
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((mi: any) => mi.product?.name.toLowerCase().includes(q));
    return list;
  }, [menuItems, search, categoryFilter, showFeatured]);

  const featured = useMemo(() => menuItems.filter((mi: any) => mi.chefSpecial).slice(0, 6), [menuItems]);
  const bestSellers = useMemo(() => menuItems.filter((mi: any) => mi.bestSeller).slice(0, 6), [menuItems]);

  const handleAddToCart = (mi: any, quickAdd = false) => {
    const hasModifiers = mi.modifiers?.some((mm: any) => mm.modifierGroup?.isRequired);
    if (hasModifiers && !quickAdd) {
      setModifierPicker(mi);
      return;
    }
    cart.addItem({
      productId: mi.productId,
      name: mi.product?.name || 'Item',
      image: mi.imageUrl || mi.product?.images?.[0]?.url,
      price: Number(mi.product?.price || 0),
      unit: mi.product?.unit || 'plate',
      quantity: 1,
      meta: { spiceLevel: mi.spiceLevel, prepTime: mi.prepTimeMinutes },
    });
    toast.success(`${mi.product?.name} added to cart`);
  };

  const handleModifierConfirm = (mods: any[]) => {
    if (!modifierPicker) return;
    const modTotal = mods.reduce((s, m) => s + (m.priceAdjustment || 0), 0);
    cart.addItem({
      productId: modifierPicker.productId,
      name: modifierPicker.product?.name,
      image: modifierPicker.imageUrl || modifierPicker.product?.images?.[0]?.url,
      price: Number(modifierPicker.product?.price || 0),
      unit: modifierPicker.product?.unit || 'plate',
      quantity: 1,
      modifiers: mods.map((m) => ({ name: m.optionName, priceAdjustment: m.priceAdjustment })),
    });
    toast.success(`${modifierPicker.product?.name} added with modifiers`);
    setModifierPicker(null);
  };

  const shopSettings = (tenant as any)?.settings ?? {};
  const shopWhatsapp = shopSettings.shopWhatsapp || shopSettings.shopPhone || (tenant as any)?.phone;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white p-6 sm:p-8 shadow-2xl mb-6">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-red-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ChefHat className="h-3.5 w-3.5 text-amber-300" />
              {tenant?.name || 'Our Menu'}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Explore Our Menu</h1>
            <p className="mt-2 text-sm text-white/85 max-w-xl">
              {menuItems.length} delicious items available • Cart me add karein aur WhatsApp par order karein
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowCart(true)}
              className="relative inline-flex items-center gap-2 rounded-xl bg-white text-orange-900 px-4 py-2.5 text-sm font-extrabold shadow-lg hover:shadow-xl transition"
            >
              <ShoppingBag className="h-4 w-4" />
              Cart
              {cart.totalItems > 0 && (
                <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-lg ring-2 ring-white">
                  {cart.totalItems.toFixed(0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Order Mode Picker */}
        <div className="relative mt-6 grid grid-cols-4 gap-2">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = modeSelected === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setModeSelected(m.value)}
                className={[
                  'rounded-2xl p-3 border-2 transition text-center',
                  active ? 'border-white bg-white/25 backdrop-blur shadow-lg'
                    : 'border-white/20 bg-white/10 hover:bg-white/15',
                ].join(' ')}
              >
                <Icon className="h-5 w-5 mx-auto mb-1" />
                <div className="text-[10px] font-extrabold uppercase">{m.label}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* SEARCH + FILTERS */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              placeholder="Search dishes, drinks, desserts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFeatured((v) => !v)}
            className={[
              'h-12 px-4 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition',
              showFeatured ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
            ].join(' ')}
          >
            <Star className={`h-3.5 w-3.5 ${showFeatured ? 'fill-current' : ''}`} />
            Featured Only
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setCategoryFilter('all')}
            className={[
              'shrink-0 px-3 h-9 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition',
              categoryFilter === 'all' ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            ].join(' ')}
          >
            <Sparkles className="h-3 w-3" />
            All Items ({menuItems.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={[
                'shrink-0 px-3 h-9 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 border transition',
                categoryFilter === cat.id ? 'text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-50',
              ].join(' ')}
              style={{
                backgroundColor: categoryFilter === cat.id ? cat.color : '#fff',
                borderColor: categoryFilter === cat.id ? cat.color : '#e2e8f0',
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      </section>

      {/* FEATURED CAROUSEL */}
      {featured.length > 0 && categoryFilter === 'all' && !search && !showFeatured && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
              <Star className="h-4 w-4 fill-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-900 text-lg">Chef Specials</h3>
              <p className="text-[11px] text-amber-700 font-bold">Signature dishes must-try</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {featured.map((mi: any) => (
              <MenuCard
                key={mi.id}
                item={mi}
                compact
                onAdd={() => handleAddToCart(mi)}
                onDetail={() => setDetailItem(mi)}
                wishlist={wishlist}
              />
            ))}
          </div>
        </section>
      )}

      {/* BEST SELLERS */}
      {bestSellers.length > 0 && categoryFilter === 'all' && !search && !showFeatured && (
        <section className="rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-md">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-900 text-lg">Best Sellers</h3>
              <p className="text-[11px] text-emerald-700 font-bold">Customer favorites</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {bestSellers.map((mi: any) => (
              <MenuCard
                key={mi.id}
                item={mi}
                compact
                onAdd={() => handleAddToCart(mi)}
                onDetail={() => setDetailItem(mi)}
                wishlist={wishlist}
              />
            ))}
          </div>
        </section>
      )}

      {/* ALL MENU GRID */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-extrabold text-slate-900">
            {categoryFilter === 'all' ? 'Full Menu' : categories.find((c) => c.id === categoryFilter)?.name || 'Menu'}
          </h3>
          <div className="text-xs text-slate-500 font-bold">{filtered.length} items</div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
            <ChefHat className="h-16 w-16 text-slate-300 mx-auto mb-3" />
            <p className="font-extrabold text-slate-700">No items found</p>
            <p className="text-sm text-slate-500 font-semibold mt-1">Try different search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((mi: any) => (
              <MenuCard
                key={mi.id}
                item={mi}
                onAdd={() => handleAddToCart(mi)}
                onDetail={() => setDetailItem(mi)}
                wishlist={wishlist}
              />
            ))}
          </div>
        )}
      </section>

      {/* Floating Cart Button (Mobile) */}
      {cart.totalItems > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-br from-orange-600 to-red-700 text-white shadow-2xl hover:scale-105 transition-transform lg:hidden"
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="font-extrabold">{cart.totalItems.toFixed(0)} items</span>
          <span className="font-extrabold tabular-nums">{formatPKR(cart.subtotal)}</span>
        </button>
      )}

      {/* Cart Drawer */}
      <CatalogCartDrawer
        cart={cart}
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        shopName={tenant?.name}
        shopPhone={shopWhatsapp}
        orderMode={MODES.find((m) => m.value === modeSelected)?.label}
        themeColor="#ea580c"
      />

      {/* Modifier Picker */}
      {modifierPicker && (
        <ModifierPickerModal
          item={modifierPicker}
          modifierGroups={modifierGroups}
          onConfirm={handleModifierConfirm}
          onClose={() => setModifierPicker(null)}
        />
      )}

      {/* Detail Modal */}
      {detailItem && (
        <MenuDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onAdd={() => { handleAddToCart(detailItem); setDetailItem(null); }}
          wishlist={wishlist}
        />
      )}
    </>
  );
}

function MenuCard({ item, compact = false, onAdd, onDetail, wishlist }: any) {
  const p = item.product;
  const inWishlist = wishlist.has(p?.id);

  return (
    <div className="group relative rounded-2xl bg-white border-2 border-slate-200 overflow-hidden hover:border-orange-400 hover:shadow-xl hover:-translate-y-0.5 transition-all">
      <div className="aspect-square bg-slate-100 overflow-hidden relative cursor-pointer" onClick={onDetail}>
        {item.imageUrl || p?.images?.[0]?.url ? (
          <img
            src={item.imageUrl || p?.images?.[0]?.url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-red-100">
            <ChefHat className="h-10 w-10 text-orange-400" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
          {item.chefSpecial && (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold shadow inline-flex items-center gap-0.5">
              <Star className="h-2 w-2 fill-white" /> Chef
            </span>
          )}
          {item.bestSeller && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-extrabold shadow inline-flex items-center gap-0.5">
              <TrendingUp className="h-2 w-2" /> Best
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          onClick={(e) => { e.stopPropagation(); wishlist.toggle(p?.id); }}
          className={[
            'absolute top-1.5 right-1.5 h-7 w-7 rounded-full flex items-center justify-center shadow transition',
            inWishlist ? 'bg-rose-500 text-white' : 'bg-white/90 backdrop-blur text-slate-600 hover:bg-white hover:text-rose-500',
          ].join(' ')}
        >
          <Heart className={`h-3.5 w-3.5 ${inWishlist ? 'fill-current' : ''}`} />
        </button>

        {/* Spice/prep info */}
        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
          {item.isSpicy && (
            <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[8px] font-extrabold inline-flex items-center gap-0.5 shadow">
              <Flame className="h-2 w-2" />
            </span>
          )}
          {item.prepTimeMinutes && (
            <span className="px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur text-white text-[8px] font-extrabold inline-flex items-center gap-0.5 shadow">
              <Clock className="h-2 w-2" />
              {item.prepTimeMinutes}m
            </span>
          )}
        </div>
      </div>

      <div className="p-2.5">
        {p?.category && (
          <div className="text-[9px] uppercase font-extrabold truncate" style={{ color: p.category.color }}>
            {p.category.name}
          </div>
        )}
        <h4 className={[
          'font-extrabold text-slate-900 leading-tight',
          compact ? 'text-xs line-clamp-2 min-h-[2rem]' : 'text-sm line-clamp-2 min-h-[2.25rem]',
        ].join(' ')}>
          {p?.name}
        </h4>
        <div className="mt-1 flex items-end justify-between">
          <div className={`font-extrabold text-emerald-700 tabular-nums ${compact ? 'text-sm' : 'text-base'}`}>
            {formatPKR(p?.price ?? 0)}
          </div>
          <button
            onClick={onAdd}
            className="h-7 w-7 rounded-lg bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center shadow-sm transition group-hover:scale-110"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ModifierPickerModal({ item, modifierGroups, onConfirm, onClose }: any) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const groups = (item.modifiers ?? [])
    .map((mm: any) => modifierGroups.find((g: any) => g.id === (mm.modifierGroupId || mm.modifierGroup?.id)))
    .filter(Boolean);

  const toggle = (groupId: string, optionId: string, maxSel: number) => {
    setSelections((prev) => {
      const current = prev[groupId] || [];
      const already = current.includes(optionId);
      if (already) return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      if (maxSel === 1) return { ...prev, [groupId]: [optionId] };
      if (current.length >= maxSel) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  const canConfirm = groups.every((g: any) => {
    const sel = selections[g.id] || [];
    if (g.isRequired && sel.length < g.minSelections) return false;
    return true;
  });

  const handleConfirm = () => {
    const mods: any[] = [];
    for (const g of groups) {
      const sel = selections[g.id] || [];
      for (const optId of sel) {
        const opt = g.options.find((o: any) => o.id === optId);
        if (opt) mods.push({
          modifierOptionId: opt.id,
          optionName: opt.name,
          quantity: 1,
          priceAdjustment: opt.priceAdjustment || 0,
        });
      }
    }
    onConfirm(mods);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-br from-orange-600 to-red-700 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-white/70">Customize</div>
            <h3 className="font-extrabold text-lg">{item.product?.name}</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {groups.length === 0 ? (
            <div className="text-center py-8 text-slate-500 font-semibold">No customization needed</div>
          ) : groups.map((g: any) => {
            const sel = selections[g.id] || [];
            return (
              <div key={g.id} className="rounded-xl border-2 border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">{g.name}</div>
                    <div className="text-[10px] text-slate-500 font-bold">
                      {g.isRequired ? 'Required' : 'Optional'} • Choose {g.minSelections}-{g.maxSelections}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(g.options ?? []).filter((o: any) => o.isActive !== false).map((opt: any) => {
                    const active = sel.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggle(g.id, opt.id, g.maxSelections)}
                        className={[
                          'p-2 rounded-lg border-2 text-left text-xs font-extrabold transition',
                          active ? 'border-orange-500 bg-orange-50 text-orange-700 shadow'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            {opt.emoji && <span>{opt.emoji}</span>}
                            {opt.name}
                          </span>
                          {opt.priceAdjustment !== 0 && (
                            <span className={opt.priceAdjustment > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                              {opt.priceAdjustment > 0 ? '+' : ''}{formatPKR(opt.priceAdjustment)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t-2 border-slate-200 p-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-orange-600 to-red-700"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            <Plus className="h-4 w-4" /> Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}

function MenuDetailModal({ item, onClose, onAdd, wishlist }: any) {
  const p = item.product;
  const inWishlist = wishlist.has(p?.id);
  const image = item.imageUrl || p?.images?.[0]?.url;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[95vh] overflow-auto animate-in slide-in-from-bottom duration-300">
        <div className="relative">
          {image ? (
            <img src={image} alt="" className="w-full aspect-square object-cover" />
          ) : (
            <div className="w-full aspect-square bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
              <ChefHat className="h-24 w-24 text-orange-400" />
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white/95 backdrop-blur hover:bg-white text-slate-700 flex items-center justify-center shadow-lg">
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={() => wishlist.toggle(p?.id)}
            className={[
              'absolute top-3 left-3 h-10 w-10 rounded-full flex items-center justify-center shadow-lg transition',
              inWishlist ? 'bg-rose-500 text-white' : 'bg-white/95 backdrop-blur text-slate-700 hover:bg-white',
            ].join(' ')}
          >
            <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              {p?.category && (
                <div className="text-xs uppercase font-extrabold" style={{ color: p.category.color }}>
                  {p.category.name}
                </div>
              )}
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{p?.name}</h2>
              <div className="mt-2 flex flex-wrap gap-1">
                {item.chefSpecial && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold inline-flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 fill-current" /> Chef Special
                  </span>
                )}
                {item.bestSeller && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold inline-flex items-center gap-1">
                    <TrendingUp className="h-2.5 w-2.5" /> Best Seller
                  </span>
                )}
                {item.isSpicy && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold inline-flex items-center gap-1">
                    <Flame className="h-2.5 w-2.5" /> {item.spiceLevel}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(p?.price ?? 0)}</div>
              <div className="text-[10px] font-bold text-slate-500">/ {p?.unit}</div>
            </div>
          </div>

          {p?.description && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-sm text-slate-700 leading-relaxed">{p.description}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-xs">
            {item.prepTimeMinutes && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-center">
                <Clock className="h-4 w-4 text-blue-700 mx-auto mb-0.5" />
                <div className="font-extrabold text-blue-900">{item.prepTimeMinutes}m</div>
                <div className="text-[9px] text-blue-700 font-bold uppercase">Prep</div>
              </div>
            )}
            {item.servesPeople && (
              <div className="rounded-lg bg-violet-50 border border-violet-200 p-2 text-center">
                <Users className="h-4 w-4 text-violet-700 mx-auto mb-0.5" />
                <div className="font-extrabold text-violet-900">{item.servesPeople}</div>
                <div className="text-[9px] text-violet-700 font-bold uppercase">Serves</div>
              </div>
            )}
            {item.calories && (
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-2 text-center">
                <div className="font-extrabold text-orange-900 mt-0.5">{item.calories}</div>
                <div className="text-[9px] text-orange-700 font-bold uppercase">Cal</div>
              </div>
            )}
          </div>

          {item.dietaryTags?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-2">Dietary Info</div>
              <div className="flex flex-wrap gap-1">
                {item.dietaryTags.map((tag: string) => (
                  <span key={tag} className="px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold inline-flex items-center gap-1">
                    <Leaf className="h-2.5 w-2.5" />
                    {tag.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.allergenInfo && (
            <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 text-xs">
              <strong className="text-amber-900">⚠️ Allergen:</strong>
              <span className="text-amber-800 font-semibold ml-1">{item.allergenInfo}</span>
            </div>
          )}

          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-orange-600 to-red-700"
            onClick={onAdd}
          >
            <Plus className="h-5 w-5" /> Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
