// apps/web/src/industries/electronics/pages/ElectronicsCatalogPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Cpu, Search, X, Star, ShieldCheck, Award, ShoppingBag, Plus, Heart,
  Sparkles, Package, Layers, Barcode, Wifi, Battery, Monitor, Zap,
  GraduationCap, Keyboard, CheckCircle2, TrendingUp, Filter, Gift,
  ChevronRight, ShieldAlert, Store, Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { useCatalogCart } from '@modules/catalog/hooks/useCatalogCart';
import { useWishlist } from '@modules/catalog/hooks/useWishlist';
import { CatalogCartDrawer } from '@modules/catalog/components/CatalogCartDrawer';
import { electronicsPosApi, type PosElectronicsProduct } from '../api/electronics-pos.api';
import {
  CATEGORY_GROUPS, CATEGORY_META, CONDITION_META,
  type CategoryType, type ConditionType,
} from '../constants';

/* ═════════════════════════════════════════════════════════════
   NAFAA ELECTRONICS — CATALOG
   ─────────────────────────────────────────────────────────────
   🛍️ Customer ko dikhane wala catalog — WhatsApp par order bhi
   🗂️ Category khandaan ke hisab se (Audio, Power, Camera...)
   🛡️ Warranty aur condition har card par saaf
   🎁 Bundles — combo deal alag se
   ═════════════════════════════════════════════════════════════ */

const PRICE_RANGES = [
  { label: '2K tak', min: 0, max: 2000 },
  { label: '2K – 10K', min: 2000, max: 10000 },
  { label: '10K – 30K', min: 10000, max: 30000 },
  { label: '30K – 1L', min: 30000, max: 100000 },
  { label: '1L+', min: 100000, max: Infinity },
];

type Sort = 'featured' | 'cheap' | 'costly' | 'new';

export default function ElectronicsCatalogPage() {
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);
  const tenantName = useAuthStore((s: any) => s.tenant?.name);
  const tenantPhone = useAuthStore((s: any) => s.tenant?.phone);

  const cart = useCatalogCart();
  const wishlist = useWishlist();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [group, setGroup] = useState<string>('all');
  const [category, setCategory] = useState<CategoryType | 'all'>('all');
  const [condition, setCondition] = useState<ConditionType | 'all'>('all');
  const [priceIdx, setPriceIdx] = useState<number | null>(null);
  const [sort, setSort] = useState<Sort>('featured');
  const [onlyStock, setOnlyStock] = useState(true);
  const [onlyWishlist, setOnlyWishlist] = useState(false);
  const [showBundles, setShowBundles] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data: catalog, isLoading } = useQuery({
    queryKey: ['electronics-pos-catalog', currentShopId, debounced, 'catalog'],
    queryFn: () => electronicsPosApi.catalog({ shopId: currentShopId || undefined, search: debounced || undefined }),
  });

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (showShortcuts) return setShowShortcuts(false);
        if (showTeacher) return setShowTeacher(false);
        if (cartOpen) return setCartOpen(false);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'g') setShowTeacher(true);
      if (e.key === 'c') setCartOpen(true);
      if (e.key === '?') setShowShortcuts((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showShortcuts, cartOpen]);

  const anyModal = showTeacher || showShortcuts;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  const items = catalog?.items ?? [];
  const bundles = catalog?.bundles ?? [];

  /* Kaunsi categories asal me stock me hain — khaali chips na dikhein */
  const liveCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of items) if (p.categoryType) set.add(p.categoryType);
    return set;
  }, [items]);

  const visibleGroups = useMemo(
    () => CATEGORY_GROUPS
      .map((g) => ({ ...g, items: g.items.filter((c) => liveCategories.has(c)) }))
      .filter((g) => g.items.length > 0),
    [liveCategories],
  );

  const groupCats = useMemo(() => {
    if (group === 'all') return null;
    return visibleGroups.find((g) => g.label === group)?.items ?? null;
  }, [group, visibleGroups]);

  const list = useMemo(() => {
    let l = [...items];
    if (onlyStock) l = l.filter((p) => (p.availableStock ?? p.stock) > 0);
    if (onlyWishlist) l = l.filter((p) => wishlist.has(p.id));
    if (groupCats) l = l.filter((p) => p.categoryType && groupCats.includes(p.categoryType as CategoryType));
    if (category !== 'all') l = l.filter((p) => p.categoryType === category);
    if (condition !== 'all') l = l.filter((p) => p.conditionType === condition);
    if (priceIdx != null) {
      const r = PRICE_RANGES[priceIdx];
      l = l.filter((p) => p.price >= r.min && p.price < r.max);
    }
    switch (sort) {
      case 'cheap': l.sort((a, b) => a.price - b.price); break;
      case 'costly': l.sort((a, b) => b.price - a.price); break;
      case 'new': l.sort((a, b) => Number(b.isNewArrival) - Number(a.isNewArrival)); break;
      default:
        l.sort((a, b) =>
          Number(b.isFeatured) - Number(a.isFeatured) ||
          Number(b.isBestSeller) - Number(a.isBestSeller));
    }
    return l;
  }, [items, onlyStock, onlyWishlist, groupCats, category, condition, priceIdx, sort, wishlist]);

  const stats = useMemo(() => ({
    total: items.length,
    inStock: items.filter((p) => (p.availableStock ?? p.stock) > 0).length,
    serial: items.filter((p) => p.requiresSerial).length,
    warranty: items.filter((p) => p.warrantyMonths > 0).length,
  }), [items]);

  const addToCart = (p: PosElectronicsProduct) => {
    const avail = p.availableStock ?? p.stock;
    if (avail <= 0) return toast.error('Ye cheez abhi stock me nahi');
    if (p.price <= 0) return toast.error('Is cheez ka rate abhi set nahi — pehle rate lagayein');
    cart.addItem({
      productId: p.id,
      name: p.name,
      image: p.imageUrl ?? undefined,
      price: p.price,
      unit: p.unit,
      quantity: 1,
      meta: {
        category: p.categoryType,
        condition: p.conditionType,
        warrantyMonths: p.warrantyMonths,
        brand: p.brandName,
      },
    });
    toast.success(`${p.name} cart me add ho gaya`);
  };

  const clearFilters = () => {
    setGroup('all'); setCategory('all'); setCondition('all');
    setPriceIdx(null); setOnlyWishlist(false); setSearch('');
  };
  const hasFilters = group !== 'all' || category !== 'all' || condition !== 'all'
    || priceIdx != null || onlyWishlist || !!search;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-44 rounded-3xl bg-slate-200 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-72 rounded-2xl bg-slate-200 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {showTeacher && <CatalogTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      <CatalogCartDrawer
        cart={cart}
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        shopName={shopName ?? tenantName}
        shopPhone={tenantPhone}
        themeColor="blue"
      />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-600 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-cyan-400/25 blur-3xl animate-pulse" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <ShoppingBag className="h-3.5 w-3.5 text-amber-300" /> Catalog
                {shopName && <><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>}
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🛍️ Poora Catalog</h1>
              <p className="mt-2 text-sm text-white/85 font-semibold">
                Customer ko dikhayein — har cheez ka rate, warranty aur halat saaf likhi hui
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setShowTeacher(true)}
                className="h-11 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition" title="Guide (G)">
                <GraduationCap className="h-4 w-4" /> Guide
              </button>
              <button onClick={() => setShowShortcuts(true)}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 inline-flex items-center justify-center backdrop-blur transition" title="Shortcuts (?)">
                <Keyboard className="h-4 w-4" />
              </button>
              <button onClick={() => setCartOpen(true)} title="Cart (C)"
                className="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition relative">
                <ShoppingBag className="h-4 w-4" /> Cart
                {cart.totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                    {cart.totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-5 relative">
            <Search className="h-5 w-5 text-white/60 absolute left-4 top-1/2 -translate-y-1/2" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Kya dhoond rahe hain? Headphone, charger, laptop... (/)"
              className="h-13 w-full rounded-2xl bg-white/15 backdrop-blur border-2 border-white/25 pl-12 pr-11 py-3.5 text-sm font-bold text-white placeholder:text-white/50 focus:outline-none focus:border-white transition" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <HeroStat label="Cheezein" value={stats.total} icon={Package} />
            <HeroStat label="Stock Me" value={stats.inStock} icon={CheckCircle2} highlight />
            <HeroStat label="Serial Wale" value={stats.serial} icon={Barcode} />
            <HeroStat label="Warranty Wale" value={stats.warranty} icon={ShieldCheck} />
          </div>
        </div>
      </section>

      {/* ═══ BUNDLES ═══ */}
      {showBundles && bundles.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-5">
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-amber-950">🎁 Combo Deals</h3>
                <p className="text-[11px] font-bold text-amber-800">Sath lein to sasta parta hai</p>
              </div>
            </div>
            <button onClick={() => setShowBundles(false)}
              className="h-8 px-2.5 rounded-lg bg-white/70 text-xs font-extrabold text-amber-800 hover:bg-white transition">
              Chhupao
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bundles.slice(0, 6).map((b) => (
              <div key={b.id} className="rounded-2xl bg-white border-2 border-amber-200 p-4 hover:border-amber-400 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 truncate">{b.name}</div>
                    <div className="text-[11px] font-bold text-slate-500">{b.items?.length ?? 0} cheezein</div>
                  </div>
                  {b.savingsPct > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold shrink-0">
                      -{Math.round(b.savingsPct)}%
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-slate-900 tabular-nums">{formatPKR(b.bundlePrice)}</span>
                  {b.originalPrice > b.bundlePrice && (
                    <span className="text-xs font-bold text-slate-400 line-through tabular-nums">{formatPKR(b.originalPrice)}</span>
                  )}
                </div>
                {b.savings > 0 && (
                  <div className="mt-1 text-[11px] font-extrabold text-emerald-600">
                    {formatPKR(b.savings)} ki bachat
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ FILTERS ═══ */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        {/* Groups */}
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => { setGroup('all'); setCategory('all'); }}
            className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
              group === 'all' ? 'bg-gradient-to-r from-blue-600 to-cyan-700 text-white border-transparent shadow'
                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
            }`}>
            <Layers className="h-3.5 w-3.5" /> Sab
          </button>
          {visibleGroups.map((g) => (
            <button key={g.label} onClick={() => { setGroup(g.label); setCategory('all'); }}
              className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                group === g.label ? 'bg-gradient-to-r from-blue-600 to-cyan-700 text-white border-transparent shadow'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
              }`}>
              <span>{g.emoji}</span> {g.label}
            </button>
          ))}
        </div>

        {/* Sub-categories */}
        {groupCats && groupCats.length > 1 && (
          <div className="flex gap-1.5 flex-wrap pt-1 border-t-2 border-slate-100">
            <button onClick={() => setCategory('all')}
              className={`h-8 px-2.5 rounded-lg text-[11px] font-extrabold transition border ${
                category === 'all' ? 'bg-slate-900 text-white border-transparent' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
              }`}>
              Sab {group}
            </button>
            {groupCats.map((c) => {
              const m = CATEGORY_META[c];
              return (
                <button key={c} onClick={() => setCategory(c)}
                  className={`h-8 px-2.5 rounded-lg text-[11px] font-extrabold inline-flex items-center gap-1 transition border ${
                    category === c ? 'bg-slate-900 text-white border-transparent' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}>
                  <span>{m.emoji}</span> {m.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Condition + price + sort */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t-2 border-slate-100">
          <select value={condition} onChange={(e) => setCondition(e.target.value as any)}
            className="h-9 rounded-lg border-2 border-slate-200 bg-white px-2.5 text-xs font-extrabold text-slate-700 focus:outline-none focus:border-blue-500 transition">
            <option value="all">Har halat</option>
            {(Object.keys(CONDITION_META) as ConditionType[]).map((c) => (
              <option key={c} value={c}>{CONDITION_META[c].emoji} {CONDITION_META[c].label}</option>
            ))}
          </select>

          {PRICE_RANGES.map((r, i) => (
            <button key={r.label} onClick={() => setPriceIdx(priceIdx === i ? null : i)}
              className={`h-9 px-2.5 rounded-lg text-[11px] font-extrabold transition border-2 ${
                priceIdx === i ? 'bg-emerald-600 text-white border-transparent shadow' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
              }`}>
              {r.label}
            </button>
          ))}

          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
            className="h-9 rounded-lg border-2 border-slate-200 bg-white px-2.5 text-xs font-extrabold text-slate-700 focus:outline-none focus:border-blue-500 transition">
            <option value="featured">Khaas pehle</option>
            <option value="cheap">Sasta pehle</option>
            <option value="costly">Mehnga pehle</option>
            <option value="new">Naya pehle</option>
          </select>

          <button onClick={() => setOnlyStock((v) => !v)}
            className={`h-9 px-2.5 rounded-lg text-[11px] font-extrabold inline-flex items-center gap-1 transition border-2 ${
              onlyStock ? 'bg-blue-600 text-white border-transparent shadow' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
            }`}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Sirf stock me
          </button>

          <button onClick={() => setOnlyWishlist((v) => !v)}
            className={`h-9 px-2.5 rounded-lg text-[11px] font-extrabold inline-flex items-center gap-1 transition border-2 ${
              onlyWishlist ? 'bg-rose-500 text-white border-transparent shadow' : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
            }`}>
            <Heart className={`h-3.5 w-3.5 ${onlyWishlist ? 'fill-white' : ''}`} /> Pasand ({wishlist.count})
          </button>

          {hasFilters && (
            <button onClick={clearFilters}
              className="h-9 px-2.5 rounded-lg text-[11px] font-extrabold bg-slate-100 text-slate-600 hover:bg-slate-200 inline-flex items-center gap-1 transition">
              <X className="h-3.5 w-3.5" /> Filter hatao
            </button>
          )}
        </div>
      </section>

      {/* ═══ GRID ═══ */}
      {list.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-12 text-center shadow-sm">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-900 text-lg">
            {hasFilters ? 'In filters se kuch nahi mila' : 'Catalog abhi khaali hai'}
          </h3>
          <p className="text-sm font-semibold text-slate-500 mt-1.5">
            {hasFilters ? 'Filter hata kar dobara dekhein' : 'Pehle kuch products add karein'}
          </p>
          {hasFilters && (
            <button onClick={clearFilters}
              className="mt-4 h-11 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-700 text-white text-sm font-extrabold shadow-lg transition">
              Filter Hatao
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-extrabold text-slate-700">
              {list.length} cheezein
              {group !== 'all' && <span className="text-slate-500 font-bold"> · {group}</span>}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {list.map((p) => (
              <ProductCard key={p.id} p={p}
                liked={wishlist.has(p.id)}
                onLike={() => wishlist.toggle(p.id)}
                onAdd={() => addToCart(p)} />
            ))}
          </div>
        </>
      )}

      {/* Floating cart (mobile) */}
      {cart.totalItems > 0 && (
        <button onClick={() => setCartOpen(true)}
          className="fixed bottom-5 right-5 z-30 h-14 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold shadow-2xl inline-flex items-center gap-2 hover:shadow-emerald-500/30 transition">
          <ShoppingBag className="h-5 w-5" />
          {cart.totalItems} · {formatPKR(cart.subtotal)}
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   PRODUCT CARD
   ═════════════════════════════════════════════════════════════ */

function ProductCard({ p, liked, onLike, onAdd }: {
  p: PosElectronicsProduct; liked: boolean; onLike: () => void; onAdd: () => void;
}) {
  const meta = p.categoryType ? CATEGORY_META[p.categoryType as CategoryType] : null;
  const cond = p.conditionType ? CONDITION_META[p.conditionType as ConditionType] : null;
  const avail = p.availableStock ?? p.stock;
  const out = avail <= 0;
  const noPrice = p.price <= 0;
  const saving = p.mrp && p.mrp > p.price ? p.mrp - p.price : 0;

  return (
    <div className={`group rounded-2xl bg-white border-2 overflow-hidden transition hover:shadow-lg ${
      out ? 'border-slate-200 opacity-70' : 'border-slate-200 hover:border-blue-400'
    }`}>
      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">{meta?.emoji ?? '📦'}</div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {p.isNewArrival && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-extrabold shadow">🆕 NAYA</span>
          )}
          {p.isBestSeller && (
            <span className="px-1.5 py-0.5 rounded-md bg-orange-500 text-white text-[9px] font-extrabold shadow inline-flex items-center gap-0.5">
              <Award className="h-2.5 w-2.5" /> HIT
            </span>
          )}
          {saving > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[9px] font-extrabold shadow">
              {formatPKR(saving)} kam
            </span>
          )}
        </div>

        <button onClick={onLike}
          className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-white/90 backdrop-blur flex items-center justify-center shadow hover:bg-white transition">
          <Heart className={`h-4 w-4 ${liked ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
        </button>

        {p.isFeatured && (
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold shadow inline-flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-white" /> KHAAS
          </div>
        )}

        {out && (
          <div className="absolute inset-x-0 bottom-0 py-1.5 bg-slate-900/80 text-center text-[11px] font-extrabold text-white backdrop-blur">
            Stock khatam
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            {meta && <span>{meta.emoji} {meta.label}</span>}
          </div>
          <h3 className="mt-0.5 font-extrabold text-slate-900 text-sm leading-tight line-clamp-2" title={p.name}>
            {p.name}
          </h3>
          {p.brandName && (
            <div className="text-[11px] font-bold text-slate-500 truncate">{p.brandName}</div>
          )}
        </div>

        {/* Chips */}
        <div className="flex items-center gap-1 flex-wrap">
          {cond && p.conditionType !== 'BRAND_NEW' && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${cond.chip}`}>
              {cond.emoji} {cond.label}
            </span>
          )}
          {p.warrantyMonths > 0 ? (
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold inline-flex items-center gap-0.5">
              <ShieldCheck className="h-2.5 w-2.5" /> {p.warrantyMonths}m warranty
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-extrabold inline-flex items-center gap-0.5">
              <ShieldAlert className="h-2.5 w-2.5" /> Warranty nahi
            </span>
          )}
          {p.requiresSerial && (
            <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold inline-flex items-center gap-0.5">
              <Barcode className="h-2.5 w-2.5" /> Serial
            </span>
          )}
          {p.notInShop && (
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold">
              Shop me assign nahi
            </span>
          )}
        </div>

        {/* Specs */}
        {(p.connectivity?.length > 0 || p.screenSize) && (
          <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold text-slate-500">
            {p.screenSize && (
              <span className="inline-flex items-center gap-0.5"><Monitor className="h-2.5 w-2.5" /> {p.screenSize}</span>
            )}
            {(p.connectivity ?? []).slice(0, 2).map((c) => (
              <span key={c} className="inline-flex items-center gap-0.5"><Wifi className="h-2.5 w-2.5" /> {c}</span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="pt-2 border-t-2 border-slate-100 flex items-end justify-between gap-2">
          <div className="min-w-0">
            {noPrice ? (
              <div className="text-sm font-extrabold text-amber-600">Rate nahi laga</div>
            ) : (
              <>
                <div className="text-lg font-extrabold text-slate-900 tabular-nums leading-none">{formatPKR(p.price)}</div>
                {p.mrp && p.mrp > p.price && (
                  <div className="text-[10px] font-bold text-slate-400 line-through tabular-nums">{formatPKR(p.mrp)}</div>
                )}
              </>
            )}
            <div className={`text-[10px] font-extrabold mt-0.5 ${out ? 'text-rose-600' : avail <= p.lowStockAlert ? 'text-amber-600' : 'text-emerald-600'}`}>
              {out ? 'Khatam' : `${avail} ${p.unit} maujood`}
            </div>
          </div>
          <button onClick={onAdd} disabled={out || noPrice}
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-center shadow hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function HeroStat({ label, value, icon: Icon, highlight }: any) {
  return (
    <div className={`rounded-xl backdrop-blur border p-2.5 ${
      highlight ? 'bg-white/25 border-white/40' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1 text-[9px] uppercase font-extrabold text-white/70 tracking-wider">
        <Icon className="h-3 w-3" /> <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 text-xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

function CatalogTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: ShoppingBag, title: 'Ye page kis kaam ka hai',
      body: 'Customer ko poora maal dikhane ke liye. Har card par rate, warranty, halat aur kitna maujood hai — sab likha hota hai, is liye bar bar poochhna nahi parta.',
      tips: ['Search me kuch bhi likhein — naam, brand', 'Sirf stock me = jo abhi mil sakta hai'],
    },
    {
      icon: Layers, title: 'Category khandaan',
      body: 'Audio, Power, Camera, Computer — cheezein khandaan ke hisab se bati hui hain. Khandaan par click karein to us ke andar ki cheezein alag nazar aati hain.',
      tips: ['Sirf wahi categories dikhti hain jin ka maal maujood hai'],
    },
    {
      icon: ShieldCheck, title: 'Warranty aur halat',
      body: 'Har card par saaf likha hota hai ke kitne mahine ki warranty hai aur cheez nayi hai, open-box hai ya used. Electronics me customer sab se pehle yehi poochta hai.',
      tips: ['🔖 Serial ka badge = us cheez ka har unit alag track hota hai'],
    },
    {
      icon: Gift, title: 'Cart aur combo deals',
      body: 'Cheez par + dabayein to cart me chali jati hai. Cart se customer ka naam aur number daal kar order WhatsApp par bheja ja sakta hai. Upar combo deals bhi milte hain.',
      tips: ['C dabao to cart khul jaye', '❤️ se pasandeeda cheezein alag rakhein'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-700 font-extrabold">Guide</div>
              <h3 className="font-extrabold text-slate-900">Catalog Kaise Chalayein?</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {steps.map((st, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <st.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900">{st.title}</div>
                <div className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">{st.body}</div>
                <ul className="mt-2 space-y-1">
                  {st.tips.map((tp, j) => (
                    <li key={j} className="text-[11px] font-semibold text-slate-500 flex items-start gap-1.5">
                      <Sparkles className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-0.5" /> {tp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 text-right shrink-0">
          <Button onClick={onClose} className="bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold shadow-lg">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const sc = [
    ['/', 'Search par jao'], ['C', 'Cart kholo'], ['G', 'Guide kholo'],
    ['?', 'Ye list'], ['Esc', 'Band karo'],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Keyboard className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-900">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {sc.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">{desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 border-2 border-slate-200 font-mono text-xs font-extrabold text-slate-700">{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
