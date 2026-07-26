import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Layers, Search, X, Star, ShoppingBag, Plus, Heart, Scissors,
  Sparkles, Ruler, MessageCircle, Package, Palette, Info,
  Filter, SortAsc, TrendingDown, MapPin, ArrowRight, Grid3x3, List,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { carpetRollsApi } from '../api/carpet-rolls.api';
import { carpetCutPiecesApi } from '../api/carpet-cut-pieces.api';
import { useAuthStore } from '@core/stores/auth.store';
import { useCatalogCart } from '@modules/catalog/hooks/useCatalogCart';
import { useWishlist } from '@modules/catalog/hooks/useWishlist';
import { CatalogCartDrawer } from '@modules/catalog/components/CatalogCartDrawer';

type Tab = 'products' | 'rolls' | 'pieces';
type SortBy = 'featured' | 'newest' | 'cheapest' | 'expensive' | 'largest';
type ViewMode = 'grid' | 'list';

const VIEW_KEY = 'nafaa.carpet-catalog.view';
const SORT_KEY = 'nafaa.carpet-catalog.sort';

export default function CarpetCatalogPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const cart = useCatalogCart();
  const wishlist = useWishlist();

  const [tab, setTab] = useState<Tab>('products');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>(() => (localStorage.getItem(SORT_KEY) as SortBy) || 'featured');
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem(VIEW_KEY) as ViewMode) || 'grid');
  const [showCart, setShowCart] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const [quoteFor, setQuoteFor] = useState<any>(null);
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);

  // Debounce search
  useMemo(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const { data: productsData } = useQuery({
    queryKey: ['carpet-catalog', debouncedSearch],
    queryFn: () => productsApi.list({ search: debouncedSearch, isActive: true, limit: 500 }),
    enabled: tab === 'products',
  });
  const products = useMemo(() => {
    const list = (productsData?.items ?? []).filter((p) => ['sqft', 'sqm', 'sqyd'].includes(p.unit));
    if (showWishlistOnly) return list.filter((p) => wishlist.has(p.id));
    return list;
  }, [productsData, showWishlistOnly, wishlist]);

  const { data: rollsRaw } = useQuery({
    queryKey: ['carpet-catalog-rolls'],
    queryFn: () => carpetRollsApi.list({ inStockOnly: true, limit: 1000 }),
    enabled: tab === 'rolls',
  });
  const rolls: any[] = Array.isArray(rollsRaw) ? rollsRaw : ((rollsRaw as any)?.items ?? []);

  const { data: piecesRaw } = useQuery({
    queryKey: ['carpet-catalog-pieces'],
    queryFn: () => carpetCutPiecesApi.list({ status: 'AVAILABLE', limit: 500 }),
    enabled: tab === 'pieces',
  });
  const pieces: any[] = Array.isArray(piecesRaw) ? piecesRaw : ((piecesRaw as any)?.items ?? []);

  const shopSettings = (tenant as any)?.settings ?? {};
  const shopWhatsapp = shopSettings.shopWhatsapp || shopSettings.shopPhone || (tenant as any)?.phone;

  const sortedProducts = useMemo(() => {
    const list = [...products];
    switch (sortBy) {
      case 'newest': return list.sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime());
      case 'cheapest': return list.sort((a, b) => Number(a.price) - Number(b.price));
      case 'expensive': return list.sort((a, b) => Number(b.price) - Number(a.price));
      case 'featured':
      default:
        return list.sort((a, b) => {
          if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
    }
  }, [products, sortBy]);

  const filteredRolls = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    let list = q ? rolls.filter((r) =>
      r.rollNumber?.toLowerCase().includes(q) ||
      r.product?.name?.toLowerCase().includes(q) ||
      (r.color || '').toLowerCase().includes(q) ||
      (r.designCode || '').toLowerCase().includes(q),
    ) : [...rolls];

    list.sort((a, b) => {
      if (sortBy === 'largest') return Number(b.remainingSqft) - Number(a.remainingSqft);
      if (sortBy === 'cheapest') return Number(a.salePricePerSqft) - Number(b.salePricePerSqft);
      if (sortBy === 'expensive') return Number(b.salePricePerSqft) - Number(a.salePricePerSqft);
      return new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime();
    });
    return list;
  }, [rolls, debouncedSearch, sortBy]);

  const filteredPieces = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    let list = q ? pieces.filter((p) =>
      p.pieceCode?.toLowerCase().includes(q) ||
      p.product?.name?.toLowerCase().includes(q),
    ) : [...pieces];

    list.sort((a, b) => {
      if (sortBy === 'largest') return Number(b.totalSqft) - Number(a.totalSqft);
      if (sortBy === 'cheapest') return Number(a.salePrice) - Number(b.salePrice);
      if (sortBy === 'expensive') return Number(b.salePrice) - Number(a.salePrice);
      return new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime();
    });
    return list;
  }, [pieces, debouncedSearch, sortBy]);

  const handleAddPiece = (piece: any) => {
    cart.addItem({
      productId: piece.productId,
      name: piece.product?.name || 'Cut Piece',
      variantName: `Piece ${piece.pieceCode}`,
      image: piece.product?.images?.[0]?.url,
      price: Number(piece.salePrice || 0),
      unit: 'piece',
      quantity: 1,
      notes: `${piece.widthFt}ft × ${piece.lengthFt}ft = ${piece.totalSqft?.toFixed(2)} sqft`,
      meta: { pieceCode: piece.pieceCode, dimensions: `${piece.widthFt}×${piece.lengthFt}ft` },
    });
    toast.success(`Piece ${piece.pieceCode} added to cart`);
  };

  const setSort = (s: SortBy) => { setSortBy(s); localStorage.setItem(SORT_KEY, s); };
  const setView = (v: ViewMode) => { setViewMode(v); localStorage.setItem(VIEW_KEY, v); };

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-5 sm:p-8 shadow-2xl mb-4 sm:mb-6">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-teal-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Layers className="h-3.5 w-3.5 text-amber-300" />
              {tenant?.name || 'Carpet Store'}
            </div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold leading-tight">🧶 Premium Carpets</h1>
            <p className="mt-2 text-xs sm:text-sm text-white/85 max-w-xl">
              <strong className="text-emerald-300">{products.length}</strong> designs •{' '}
              <strong className="text-amber-300">{rolls.length}</strong> rolls •{' '}
              <strong className="text-violet-300">{pieces.length}</strong> ready pieces • Free measurement service
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {wishlist.count > 0 && (
              <button
                onClick={() => setShowWishlistOnly(!showWishlistOnly)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-extrabold backdrop-blur transition active:scale-95 ${
                  showWishlistOnly ? 'bg-rose-500 text-white shadow-lg' : 'bg-white/15 text-white border border-white/20'
                }`}
              >
                <Heart className={`h-4 w-4 ${showWishlistOnly ? 'fill-current' : ''}`} />
                {wishlist.count}
              </button>
            )}
            <button
              onClick={() => setShowCart(true)}
              className="relative inline-flex items-center gap-2 rounded-xl bg-white text-emerald-900 px-4 py-2.5 text-sm font-extrabold shadow-lg active:scale-95 transition"
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
      </section>

      {/* TABS */}
      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-1.5 mb-3 flex gap-1">
        <TabButton active={tab === 'products'} onClick={() => setTab('products')} icon={Package} label="Designs" count={products.length} color="emerald" />
        <TabButton active={tab === 'rolls'} onClick={() => setTab('rolls')} icon={Layers} label="Rolls" count={rolls.length} color="emerald" />
        <TabButton active={tab === 'pieces'} onClick={() => setTab('pieces')} icon={Scissors} label="Ready Pieces" count={pieces.length} color="violet" />
      </div>

      {/* TOOLBAR — Search + Sort + View */}
      <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 space-y-2.5">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            className="h-12 sm:h-14 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-11 text-base font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition"
            placeholder={tab === 'products' ? 'Design ka naam, brand, category...' : tab === 'rolls' ? 'Roll #, design, color, size...' : 'Piece code, product...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center active:scale-95">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 overflow-x-auto pb-1 flex-1">
            {tab === 'products' ? (
              [
                { v: 'featured' as SortBy, l: 'Featured', icon: Star },
                { v: 'newest' as SortBy, l: 'Newest', icon: Sparkles },
                { v: 'cheapest' as SortBy, l: 'Cheapest', icon: TrendingDown },
                { v: 'expensive' as SortBy, l: 'Expensive', icon: SortAsc },
              ].map((opt) => {
                const Icon = opt.icon; const active = sortBy === opt.v;
                return (
                  <button key={opt.v} onClick={() => setSort(opt.v)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-95 ${
                      active ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}>
                    <Icon className="h-3 w-3" /> {opt.l}
                  </button>
                );
              })
            ) : (
              [
                { v: 'largest' as SortBy, l: 'Largest', icon: SortAsc },
                { v: 'newest' as SortBy, l: 'Newest', icon: Sparkles },
                { v: 'cheapest' as SortBy, l: 'Cheapest', icon: TrendingDown },
                { v: 'expensive' as SortBy, l: 'Expensive', icon: Filter },
              ].map((opt) => {
                const Icon = opt.icon; const active = sortBy === opt.v;
                return (
                  <button key={opt.v} onClick={() => setSort(opt.v)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-95 ${
                      active ? (tab === 'pieces' ? 'bg-violet-600' : 'bg-emerald-600') + ' text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}>
                    <Icon className="h-3 w-3" /> {opt.l}
                  </button>
                );
              })
            )}
          </div>
          <div className="inline-flex rounded-lg border-2 border-slate-200 bg-white overflow-hidden shrink-0">
            <button onClick={() => setView('grid')}
              className={`h-8 w-8 flex items-center justify-center transition ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Grid3x3 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setView('list')}
              className={`h-8 w-8 flex items-center justify-center transition border-l border-slate-200 ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      {tab === 'products' && (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6'
          : 'space-y-2 mb-6'}>
          {sortedProducts.length === 0 ? (
            <EmptyState icon={Layers} title={showWishlistOnly ? 'Wishlist khaali hai' : 'Koi carpet design nahi'}
              hint={showWishlistOnly ? 'Heart icon click karo save karne ke liye' : search ? 'Try different search' : 'Store owner add karega'}
              className="col-span-full" />
          ) : viewMode === 'grid' ? (
            sortedProducts.map((p) => (
              <CarpetProductCard key={p.id} product={p}
                onDetail={() => setDetailProduct(p)} onQuote={() => setQuoteFor(p)} wishlist={wishlist} />
            ))
          ) : (
            sortedProducts.map((p) => (
              <ProductListRow key={p.id} product={p}
                onDetail={() => setDetailProduct(p)} onQuote={() => setQuoteFor(p)} wishlist={wishlist} />
            ))
          )}
        </div>
      )}

      {tab === 'rolls' && (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6'
          : 'space-y-2 mb-6'}>
          {filteredRolls.length === 0 ? (
            <EmptyState icon={Layers} title="Koi roll available nahi" hint="Search change karo ya inventory check karo" className="col-span-full" />
          ) : viewMode === 'grid' ? (
            filteredRolls.map((roll) => (
              <RollCard key={roll.id} roll={roll} onQuote={() => setQuoteFor({ roll })} />
            ))
          ) : (
            filteredRolls.map((roll) => (
              <RollListRow key={roll.id} roll={roll} onQuote={() => setQuoteFor({ roll })} />
            ))
          )}
        </div>
      )}

      {tab === 'pieces' && (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6'
          : 'space-y-2 mb-6'}>
          {filteredPieces.length === 0 ? (
            <EmptyState icon={Scissors} title="Koi ready piece nahi" hint="Cut pieces auto banti hain jab rolls cut karte hain" className="col-span-full" />
          ) : viewMode === 'grid' ? (
            filteredPieces.map((piece) => (
              <PieceCard key={piece.id} piece={piece} onAdd={() => handleAddPiece(piece)} />
            ))
          ) : (
            filteredPieces.map((piece) => (
              <PieceListRow key={piece.id} piece={piece} onAdd={() => handleAddPiece(piece)} />
            ))
          )}
        </div>
      )}

      {/* Mobile FAB */}
      {cart.totalItems > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-2xl hover:scale-105 active:scale-95 transition lg:hidden"
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="font-extrabold">{cart.totalItems.toFixed(0)} items</span>
        </button>
      )}

      <CatalogCartDrawer
        cart={cart}
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        shopName={tenant?.name}
        shopPhone={shopWhatsapp}
        themeColor="#0d9488"
      />

      {detailProduct && (
        <CarpetDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onQuote={() => { setQuoteFor(detailProduct); setDetailProduct(null); }}
          wishlist={wishlist}
        />
      )}

      {quoteFor && (
        <QuoteRequestModal data={quoteFor} onClose={() => setQuoteFor(null)} shopPhone={shopWhatsapp} />
      )}
    </>
  );
}

function TabButton({ active, onClick, icon: Icon, label, count, color }: any) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-600 text-white shadow',
    violet: 'bg-violet-600 text-white shadow',
  };
  return (
    <button onClick={onClick}
      className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition inline-flex items-center justify-center gap-1.5 active:scale-95 ${
        active ? colors[color] : 'text-slate-700 hover:bg-slate-50'
      }`}>
      <Icon className="h-4 w-4" />
      <span className="truncate">{label}</span>
      {count > 0 && (
        <span className={`px-1.5 rounded-md text-[10px] ${active ? 'bg-white/25' : 'bg-slate-200 text-slate-700'}`}>{count}</span>
      )}
    </button>
  );
}

function CarpetProductCard({ product, onDetail, onQuote, wishlist }: any) {
  const image = product.images?.[0]?.url;
  const inWishlist = wishlist.has(product.id);

  return (
    <div className="group rounded-2xl bg-white border-2 border-slate-200 overflow-hidden hover:border-emerald-400 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98]">
      <div className="aspect-square bg-slate-100 relative cursor-pointer overflow-hidden" onClick={onDetail}>
        {image ? (
          <img src={image} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
            <Layers className="h-12 w-12 text-emerald-400" />
          </div>
        )}
        {product.isFeatured && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold shadow inline-flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-white" /> HOT
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); wishlist.toggle(product.id); toast.success(inWishlist ? 'Wishlist se hataya' : 'Wishlist mein add'); }}
          className={`absolute top-2 right-2 h-9 w-9 rounded-full flex items-center justify-center shadow transition active:scale-90 ${
            inWishlist ? 'bg-rose-500 text-white' : 'bg-white/95 backdrop-blur text-slate-600 hover:text-rose-500'
          }`}
        >
          <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="p-3 space-y-2">
        {product.brand && (
          <div className="text-[9px] uppercase font-extrabold text-emerald-700 tracking-wider">{product.brand.name}</div>
        )}
        <h4 className="font-extrabold text-slate-900 text-sm line-clamp-2 min-h-[2.25rem]">{product.name}</h4>
        <div className="flex items-baseline justify-between">
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums leading-none">{formatPKR(Number(product.price))}</div>
          <div className="text-[10px] text-slate-500 font-bold">/{product.unit}</div>
        </div>
        <button onClick={onQuote}
          className="w-full h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1 active:scale-95 transition">
          <Ruler className="h-3.5 w-3.5" /> Quote Lein
        </button>
      </div>
    </div>
  );
}

function ProductListRow({ product, onDetail, onQuote, wishlist }: any) {
  const image = product.images?.[0]?.url;
  const inWishlist = wishlist.has(product.id);
  return (
    <div className="rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-300 transition p-3 flex items-center gap-3">
      <div className="h-16 w-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 cursor-pointer" onClick={onDetail}>
        {image ? <img src={image} alt="" loading="lazy" className="w-full h-full object-cover" /> :
          <div className="w-full h-full flex items-center justify-center"><Layers className="h-6 w-6 text-emerald-400" /></div>}
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onDetail}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="font-extrabold text-slate-900 text-sm truncate">{product.name}</div>
          {product.isFeatured && <Star className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" />}
        </div>
        {product.brand && (
          <div className="text-[10px] uppercase font-extrabold text-emerald-700">{product.brand.name}</div>
        )}
        <div className="text-base font-extrabold text-emerald-700 tabular-nums mt-0.5">
          {formatPKR(Number(product.price))} <span className="text-[10px] text-slate-500 font-bold">/{product.unit}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => wishlist.toggle(product.id)}
          className={`h-9 w-9 rounded-lg flex items-center justify-center transition active:scale-95 ${
            inWishlist ? 'bg-rose-500 text-white' : 'bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-500'
          }`}>
          <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
        </button>
        <button onClick={onQuote}
          className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold active:scale-95 transition">
          Quote
        </button>
      </div>
    </div>
  );
}

function RollCard({ roll, onQuote }: any) {
  const image = roll.product?.images?.[0]?.url;
  const availableSqft = Number(roll.remainingSqft || 0);
  const originalSqft = Number(roll.originalSqft || 0);
  const percent = originalSqft > 0 ? (availableSqft / originalSqft) * 100 : 0;

  return (
    <div className="group rounded-2xl bg-white border-2 border-emerald-200 overflow-hidden hover:border-emerald-400 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98]">
      <div className="aspect-square bg-slate-100 relative overflow-hidden">
        {image ? (
          <img src={image} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
            <Layers className="h-12 w-12 text-emerald-400" />
          </div>
        )}
        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold font-mono shadow">
          {roll.rollNumber}
        </div>
        {roll.variant?.name && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-violet-600 text-white text-[9px] font-extrabold inline-flex items-center gap-1">
            {roll.variant.colorHex && <span className="h-2 w-2 rounded-full border border-white" style={{ backgroundColor: roll.variant.colorHex }} />}
            {roll.variant.name}
          </div>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        <h4 className="font-extrabold text-slate-900 text-sm line-clamp-1">{roll.product?.name}</h4>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <div className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-1 text-center">
            <div className="text-emerald-700 font-bold">Available</div>
            <div className="font-extrabold text-emerald-800 tabular-nums">{availableSqft.toFixed(0)} sqft</div>
          </div>
          <div className="rounded bg-slate-50 px-1.5 py-1 text-center">
            <div className="text-slate-500 font-bold">Rate</div>
            <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(roll.salePricePerSqft || 0)}</div>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div className={`h-full ${percent > 50 ? 'bg-emerald-500' : percent > 20 ? 'bg-amber-500' : 'bg-rose-500'}`}
            style={{ width: `${Math.max(percent, 3)}%` }} />
        </div>
        <button onClick={onQuote}
          className="w-full h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold active:scale-95 transition">
          Cut Quote Lein
        </button>
      </div>
    </div>
  );
}

function RollListRow({ roll, onQuote }: any) {
  return (
    <div className="rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-300 transition p-3 flex items-center gap-3">
      <div className="font-mono font-extrabold text-sm text-emerald-700 min-w-[80px]">{roll.rollNumber}</div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-slate-900 text-sm truncate">{roll.product?.name}</div>
        <div className="text-[10px] text-slate-500 font-bold">
          {Number(roll.widthFt)}ft × {Number(roll.remainingLengthFt)}ft
          {roll.variant?.name && ` • ${roll.variant.name}`}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{Number(roll.remainingSqft).toFixed(0)} sqft</div>
        <div className="text-[10px] text-emerald-700 font-bold">{formatPKR(roll.salePricePerSqft || 0)}/sqft</div>
      </div>
      <button onClick={onQuote}
        className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-extrabold active:scale-95 transition">
        Quote
      </button>
    </div>
  );
}

function PieceCard({ piece, onAdd }: any) {
  return (
    <div className="group rounded-2xl bg-white border-2 border-violet-200 overflow-hidden hover:border-violet-400 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98]">
      <div className="aspect-square bg-gradient-to-br from-violet-100 to-fuchsia-100 flex flex-col items-center justify-center p-3 relative">
        <Scissors className="h-10 w-10 text-violet-500 mb-2" />
        <div className="text-xs font-mono font-extrabold text-violet-900">{piece.pieceCode}</div>
        <div className="text-[10px] font-bold text-slate-700 mt-1 text-center">
          {piece.widthFt}ft × {piece.lengthFt}ft
        </div>
        <div className="mt-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
          {piece.totalSqft?.toFixed(1)} sqft
        </div>
        {piece.variant?.colorHex && (
          <div className="absolute top-2 right-2 h-5 w-5 rounded-full border-2 border-white shadow" style={{ backgroundColor: piece.variant.colorHex }} />
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <h4 className="font-extrabold text-slate-900 text-xs line-clamp-1">{piece.product?.name}</h4>
        <div className="text-base font-extrabold text-emerald-700 tabular-nums">{formatPKR(Number(piece.salePrice || 0))}</div>
        <button onClick={onAdd}
          className="w-full h-8 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-extrabold inline-flex items-center justify-center gap-1 active:scale-95 transition">
          <Plus className="h-3 w-3" /> Add to Cart
        </button>
      </div>
    </div>
  );
}

function PieceListRow({ piece, onAdd }: any) {
  return (
    <div className="rounded-xl bg-white border-2 border-violet-200 hover:border-violet-300 transition p-3 flex items-center gap-3">
      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center shrink-0">
        <Scissors className="h-5 w-5 text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="font-mono font-extrabold text-sm text-violet-900">{piece.pieceCode}</div>
          {piece.variant?.colorHex && <span className="h-2.5 w-2.5 rounded-full border border-white shadow" style={{ backgroundColor: piece.variant.colorHex }} />}
        </div>
        <div className="text-xs font-bold text-slate-700 truncate">{piece.product?.name}</div>
        <div className="text-[10px] text-slate-500 font-bold">
          {piece.widthFt}ft × {piece.lengthFt}ft = {piece.totalSqft?.toFixed(1)} sqft
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-base font-extrabold text-emerald-700 tabular-nums">{formatPKR(Number(piece.salePrice || 0))}</div>
      </div>
      <button onClick={onAdd}
        className="h-9 w-9 rounded-lg bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center active:scale-95 transition">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint, className }: any) {
  return (
    <div className={`rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center ${className}`}>
      <Icon className="h-16 w-16 text-slate-300 mx-auto mb-3" />
      <p className="font-extrabold text-slate-700 text-lg">{title}</p>
      {hint && <p className="text-sm text-slate-500 mt-1 font-semibold">{hint}</p>}
    </div>
  );
}

function CarpetDetailModal({ product, onClose, onQuote, wishlist }: any) {
  const image = product.images?.[0]?.url;
  const inWishlist = wishlist.has(product.id);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-3xl bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[95vh] overflow-auto animate-in slide-in-from-bottom sm:zoom-in duration-200">
        <div className="grid sm:grid-cols-2">
          <div className="relative bg-slate-100 aspect-square">
            {image ? (
              <img src={image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
                <Layers className="h-32 w-32 text-emerald-400" />
              </div>
            )}
            <button onClick={onClose} className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white/95 hover:bg-white text-slate-700 flex items-center justify-center shadow-lg active:scale-95">
              <X className="h-5 w-5" />
            </button>
            <button
              onClick={() => wishlist.toggle(product.id)}
              className={`absolute top-3 left-3 h-10 w-10 rounded-full flex items-center justify-center shadow-lg transition active:scale-95 ${
                inWishlist ? 'bg-rose-500 text-white' : 'bg-white/95 backdrop-blur text-slate-700 hover:bg-white'
              }`}
            >
              <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {product.brand && (
              <div className="text-xs uppercase font-extrabold text-emerald-700">{product.brand.name}</div>
            )}
            <h2 className="text-2xl font-extrabold text-slate-900">{product.name}</h2>

            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-4">
              <div className="flex items-baseline gap-2">
                <div className="text-4xl font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(Number(product.price))}</div>
                <div className="text-sm text-emerald-700 font-extrabold">/{product.unit}</div>
              </div>
            </div>

            <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-extrabold text-blue-900">Custom Cut Available</div>
                  <div className="text-blue-800 font-semibold mt-0.5">
                    Room measurements bhijein aur exact cut piece ka quote lein. Free measurement service.
                  </div>
                </div>
              </div>
            </div>

            {product.description && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-sm text-slate-700 leading-relaxed">{product.description}</p>
              </div>
            )}

            <Button size="lg" className="w-full bg-gradient-to-r from-emerald-600 to-teal-700" onClick={onQuote}>
              <Ruler className="h-5 w-5" /> Custom Quote Lein
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuoteRequestModal({ data, onClose, shopPhone }: any) {
  const [widthFt, setWidthFt] = useState(12);
  const [lengthFt, setLengthFt] = useState(15);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [service, setService] = useState<'measurement' | 'installation' | 'both' | 'none'>('none');

  const sqft = widthFt * lengthFt;
  const isRoll = !!data.roll;
  const productName = isRoll ? data.roll.product?.name : data.name;
  const pricePerSqft = isRoll ? (data.roll.salePricePerSqft || data.roll.product?.price || 0) : Number(data?.price || 0);
  const materialCost = sqft * Number(pricePerSqft);

  const sendQuote = () => {
    if (!name.trim()) return toast.error('Naam likhein');
    if (!shopPhone) return toast.error('Shop phone configured nahi hai');

    const phoneClean = shopPhone.replace(/[^0-9]/g, '');
    const cleanPhone = phoneClean.startsWith('92') ? phoneClean : phoneClean.startsWith('0') ? '92' + phoneClean.slice(1) : '92' + phoneClean;

    const lines = [
      '📐 *CARPET QUOTE REQUEST*',
      '',
      `👤 Name: *${name}*`,
      phone ? `📞 Phone: ${phone}` : '',
      '',
      `🧶 Product: *${productName}*`,
      isRoll ? `🎯 Roll: ${data.roll.rollNumber}` : '',
      '',
      '📏 *Required Dimensions*',
      `Width: ${widthFt} ft`,
      `Length: ${lengthFt} ft`,
      `Area: *${sqft.toFixed(2)} sqft*`,
      '',
      '💰 *Estimated Cost*',
      `Rate: ${formatPKR(Number(pricePerSqft))}/sqft`,
      `Material: *${formatPKRFull(materialCost)}*`,
      service !== 'none' ? `Additional: ${service.toUpperCase()} required` : '',
      '',
      notes ? `📝 Notes: ${notes}` : '',
      '',
      'Please confirm final quote including installation & service charges. Shukriya!',
    ].filter(Boolean);

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
    toast.success('Quote request bheja!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        <div className="px-5 py-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Custom Quote</div>
            <h3 className="font-extrabold text-lg truncate">{productName}</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center active:scale-95">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-2 uppercase tracking-wider">
              <Ruler className="h-3 w-3 inline mr-1" /> Room Dimensions
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] font-bold text-slate-500 mb-1">Width (ft)</div>
                <input type="number" inputMode="decimal" value={widthFt} onChange={(e) => setWidthFt(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="h-14 w-full rounded-xl border-2 border-emerald-200 bg-emerald-50 px-3 text-xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-center" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 mb-1">Length (ft)</div>
                <input type="number" inputMode="decimal" value={lengthFt} onChange={(e) => setLengthFt(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="h-14 w-full rounded-xl border-2 border-emerald-200 bg-emerald-50 px-3 text-xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-center" />
              </div>
            </div>
            <div className="mt-2 text-center py-3 rounded-xl bg-emerald-100 border-2 border-emerald-300">
              <div className="text-xs text-emerald-700 font-bold">Total Area</div>
              <div className="text-3xl font-extrabold text-emerald-900 tabular-nums">{sqft.toFixed(2)} sqft</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-2 uppercase">Additional Services</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { v: 'none', l: 'Only Material' },
                { v: 'measurement', l: 'Free Measurement' },
                { v: 'installation', l: 'Installation' },
                { v: 'both', l: 'Both' },
              ].map((opt) => (
                <button key={opt.v} onClick={() => setService(opt.v as any)}
                  className={`py-2 rounded-lg text-xs font-extrabold transition active:scale-95 ${
                    service === opt.v ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1">Estimated Material Cost</div>
            <div className="text-2xl font-extrabold text-emerald-900 tabular-nums">{formatPKRFull(materialCost)}</div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-1">Installation & services alag se</div>
          </div>

          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aap ka naam *"
            className="h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Aap ka phone (03XX...)"
            className="h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (color, quality, delivery date, etc.)"
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />
        </div>

        <div className="border-t-2 border-slate-200 p-4 shrink-0">
          <Button className="w-full h-14 bg-gradient-to-r from-green-500 to-green-600 shadow-lg" onClick={sendQuote} disabled={!shopPhone}>
            <MessageCircle className="h-5 w-5" /> WhatsApp Bhejein
          </Button>
        </div>
      </div>
    </div>
  );
}
