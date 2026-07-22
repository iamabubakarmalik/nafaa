import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Smartphone, Search, X, Star, ShieldCheck, Award, Calculator,
  ShoppingBag, Plus, Heart, Battery, Camera, HardDrive, Cpu,
  Wifi, TrendingUp, Sparkles, Package, MessageCircle, Filter,
  ChevronDown, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { useAuthStore } from '@core/stores/auth.store';
import { useCatalogCart } from '@modules/catalog/hooks/useCatalogCart';
import { useWishlist } from '@modules/catalog/hooks/useWishlist';
import { CatalogCartDrawer } from '@modules/catalog/components/CatalogCartDrawer';

const PRICE_RANGES = [
  { label: 'Under 20K', min: 0, max: 20000 },
  { label: '20K - 50K', min: 20000, max: 50000 },
  { label: '50K - 100K', min: 50000, max: 100000 },
  { label: '100K - 200K', min: 100000, max: 200000 },
  { label: 'Above 200K', min: 200000, max: Infinity },
];

export default function MobileCatalogPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const cart = useCatalogCart();
  const wishlist = useWishlist();

  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<number | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const [emiCalculator, setEmiCalculator] = useState<any>(null);
  const [compareList, setCompareList] = useState<string[]>([]);

  const { data: productsData } = useQuery({
    queryKey: ['mobile-catalog', search, brandFilter, categoryFilter],
    queryFn: () => productsApi.list({
      search,
      categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
      brandId: brandFilter !== 'all' ? brandFilter : undefined,
      isActive: true,
      limit: 200,
    }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list(),
  });

  const products = useMemo(() => {
    let list = productsData?.items ?? [];
    if (priceRange !== null) {
      const range = PRICE_RANGES[priceRange];
      list = list.filter((p) => Number(p.price) >= range.min && Number(p.price) < range.max);
    }
    return list;
  }, [productsData?.items, priceRange]);

  const featured = useMemo(() => products.filter((p) => p.isFeatured).slice(0, 8), [products]);

  const shopSettings = (tenant as any)?.settings ?? {};
  const shopWhatsapp = shopSettings.shopWhatsapp || shopSettings.shopPhone || (tenant as any)?.phone;

  const handleAdd = (p: any) => {
    cart.addItem({
      productId: p.id,
      name: p.name,
      image: p.images?.[0]?.url,
      price: Number(p.price),
      unit: p.unit || 'unit',
      quantity: 1,
    });
    toast.success(`${p.name} added to cart`);
  };

  const toggleCompare = (id: string) => {
    setCompareList((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        toast.error('Max 3 phones to compare');
        return prev;
      }
      return [...prev, id];
    });
  };

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-white p-6 sm:p-8 shadow-2xl mb-6">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Smartphone className="h-3.5 w-3.5 text-amber-300" />
              {tenant?.name || 'Mobile Store'}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Explore Our Phones</h1>
            <p className="mt-2 text-sm text-white/85 max-w-xl">
              {products.length} mobiles • PTA approved • EMI available • Warranty guaranteed
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {compareList.length > 0 && (
              <button
                onClick={() => toast.info('Comparison view coming soon!')}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500/30 border-2 border-amber-300/40 px-4 py-2.5 text-sm font-extrabold backdrop-blur"
              >
                <Filter className="h-4 w-4" />
                Compare ({compareList.length})
              </button>
            )}
            <button
              onClick={() => setShowCart(true)}
              className="relative inline-flex items-center gap-2 rounded-xl bg-white text-blue-900 px-4 py-2.5 text-sm font-extrabold shadow-lg"
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

      {/* FILTERS */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="Search by name, model, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Brand tabs */}
        {brands.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setBrandFilter('all')}
              className={[
                'shrink-0 px-3 h-9 rounded-lg text-xs font-extrabold transition',
                brandFilter === 'all' ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              ].join(' ')}
            >
              All Brands
            </button>
            {brands.slice(0, 10).map((b) => (
              <button
                key={b.id}
                onClick={() => setBrandFilter(b.id)}
                className={[
                  'shrink-0 px-3 h-9 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 border transition',
                  brandFilter === b.id ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                ].join(' ')}
              >
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt="" className="h-4 w-4 rounded object-cover" />
                ) : (
                  <span className="h-4 w-4 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-extrabold">
                    {b.name.charAt(0)}
                  </span>
                )}
                {b.name}
              </button>
            ))}
          </div>
        )}

        {/* Price range */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setPriceRange(null)}
            className={[
              'shrink-0 px-3 h-8 rounded-lg text-xs font-extrabold transition',
              priceRange === null ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            ].join(' ')}
          >
            All Prices
          </button>
          {PRICE_RANGES.map((r, i) => (
            <button
              key={i}
              onClick={() => setPriceRange(i)}
              className={[
                'shrink-0 px-3 h-8 rounded-lg text-xs font-extrabold transition',
                priceRange === i ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              ].join(' ')}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      {featured.length > 0 && !search && brandFilter === 'all' && priceRange === null && (
        <section className="rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Star className="h-4 w-4 fill-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-blue-900 text-lg">Featured Phones</h3>
              <p className="text-[11px] text-blue-700 font-bold">Top picks for you</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {featured.map((p) => (
              <PhoneCard
                key={p.id}
                product={p}
                onAdd={() => handleAdd(p)}
                onDetail={() => setDetailProduct(p)}
                onEmi={() => setEmiCalculator(p)}
                onCompare={() => toggleCompare(p.id)}
                inCompare={compareList.includes(p.id)}
                wishlist={wishlist}
              />
            ))}
          </div>
        </section>
      )}

      {/* ALL PHONES */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-extrabold text-slate-900">All Phones</h3>
          <div className="text-xs text-slate-500 font-bold">{products.length} items</div>
        </div>
        {products.length === 0 ? (
          <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
            <Smartphone className="h-16 w-16 text-slate-300 mx-auto mb-3" />
            <p className="font-extrabold text-slate-700">No phones match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((p) => (
              <PhoneCard
                key={p.id}
                product={p}
                onAdd={() => handleAdd(p)}
                onDetail={() => setDetailProduct(p)}
                onEmi={() => setEmiCalculator(p)}
                onCompare={() => toggleCompare(p.id)}
                inCompare={compareList.includes(p.id)}
                wishlist={wishlist}
              />
            ))}
          </div>
        )}
      </section>

      {cart.totalItems > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl hover:scale-105 transition-transform lg:hidden"
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
        themeColor="#2563eb"
      />

      {detailProduct && (
        <PhoneDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onAdd={() => { handleAdd(detailProduct); setDetailProduct(null); }}
          onEmi={() => setEmiCalculator(detailProduct)}
          wishlist={wishlist}
        />
      )}

      {emiCalculator && (
        <EmiCalculatorModal
          product={emiCalculator}
          onClose={() => setEmiCalculator(null)}
          shopPhone={shopWhatsapp}
        />
      )}
    </>
  );
}

function PhoneCard({ product, onAdd, onDetail, onEmi, onCompare, inCompare, wishlist }: any) {
  const image = product.images?.[0]?.url;
  const inWishlist = wishlist.has(product.id);
  const monthlyEmi = Math.round(Number(product.price) / 12);

  return (
    <div className="group relative rounded-2xl bg-white border-2 border-slate-200 overflow-hidden hover:border-blue-400 hover:shadow-xl hover:-translate-y-0.5 transition-all">
      {product.isFeatured && (
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold shadow inline-flex items-center gap-1">
          <Star className="h-2 w-2 fill-white" /> FEATURED
        </div>
      )}

      <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 cursor-pointer overflow-hidden" onClick={onDetail}>
        {image ? (
          <img src={image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Smartphone className="h-16 w-16 text-slate-400" />
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); wishlist.toggle(product.id); }}
          className={[
            'h-8 w-8 rounded-full flex items-center justify-center shadow transition',
            inWishlist ? 'bg-rose-500 text-white' : 'bg-white/95 backdrop-blur text-slate-600 hover:text-rose-500',
          ].join(' ')}
        >
          <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onCompare(); }}
          className={[
            'h-8 w-8 rounded-full flex items-center justify-center shadow transition',
            inCompare ? 'bg-amber-500 text-white' : 'bg-white/95 backdrop-blur text-slate-600 hover:text-amber-600',
          ].join(' ')}
          title="Compare"
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 space-y-1.5">
        {product.brand && (
          <div className="text-[9px] uppercase font-extrabold text-blue-700 tracking-wider">{product.brand.name}</div>
        )}
        <h4 className="font-extrabold text-slate-900 text-sm line-clamp-2 min-h-[2.25rem]">{product.name}</h4>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-lg font-extrabold text-emerald-700 tabular-nums leading-none">{formatPKR(Number(product.price))}</div>
            <div className="text-[10px] text-slate-500 font-bold mt-0.5">
              or <button onClick={(e) => { e.stopPropagation(); onEmi(); }} className="text-blue-700 font-extrabold hover:underline">EMI {formatPKR(monthlyEmi)}/mo</button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1 pt-1">
          <button
            onClick={onDetail}
            className="h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-extrabold flex items-center justify-center gap-1"
          >
            View
          </button>
          <button
            onClick={onAdd}
            className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold flex items-center justify-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function PhoneDetailModal({ product, onClose, onAdd, onEmi, wishlist }: any) {
  const image = product.images?.[0]?.url;
  const inWishlist = wishlist.has(product.id);
  const monthlyEmi = Math.round(Number(product.price) / 12);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-3xl bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[95vh] overflow-auto animate-in slide-in-from-bottom duration-300">
        <div className="grid sm:grid-cols-2">
          <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 aspect-square">
            {image ? (
              <img src={image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Smartphone className="h-32 w-32 text-slate-400" />
              </div>
            )}
            <button onClick={onClose} className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white/95 backdrop-blur hover:bg-white text-slate-700 flex items-center justify-center shadow-lg">
              <X className="h-5 w-5" />
            </button>
            <button
              onClick={() => wishlist.toggle(product.id)}
              className={[
                'absolute top-3 left-3 h-10 w-10 rounded-full flex items-center justify-center shadow-lg transition',
                inWishlist ? 'bg-rose-500 text-white' : 'bg-white/95 backdrop-blur text-slate-700 hover:bg-white',
              ].join(' ')}
            >
              <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {product.brand && (
              <div className="text-xs uppercase font-extrabold text-blue-700 tracking-wider">{product.brand.name}</div>
            )}
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">{product.name}</h2>
              {product.shortDescription && (
                <p className="text-sm text-slate-600 font-semibold mt-1">{product.shortDescription}</p>
              )}
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-4">
              <div className="flex items-baseline gap-2">
                <div className="text-4xl font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(Number(product.price))}</div>
              </div>
              <button
                onClick={onEmi}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-extrabold transition"
              >
                <Calculator className="h-3 w-3" />
                EMI from {formatPKR(monthlyEmi)}/month
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-center">
                <ShieldCheck className="h-4 w-4 text-emerald-700 mx-auto mb-1" />
                <div className="font-extrabold text-emerald-900 text-[10px]">PTA</div>
                <div className="text-[9px] text-emerald-700 font-bold">Approved</div>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-center">
                <Award className="h-4 w-4 text-blue-700 mx-auto mb-1" />
                <div className="font-extrabold text-blue-900 text-[10px]">Warranty</div>
                <div className="text-[9px] text-blue-700 font-bold">Included</div>
              </div>
              <div className="rounded-lg bg-violet-50 border border-violet-200 p-2 text-center">
                <Package className="h-4 w-4 text-violet-700 mx-auto mb-1" />
                <div className="font-extrabold text-violet-900 text-[10px]">Box Pack</div>
                <div className="text-[9px] text-violet-700 font-bold">Sealed</div>
              </div>
            </div>

            {product.description && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-sm text-slate-700 leading-relaxed">{product.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-slate-100">
              <Button variant="secondary" onClick={onEmi}>
                <Calculator className="h-4 w-4" /> EMI Plan
              </Button>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-700" onClick={onAdd}>
                <Plus className="h-4 w-4" /> Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmiCalculatorModal({ product, onClose, shopPhone }: any) {
  const [downPct, setDownPct] = useState(30);
  const [tenure, setTenure] = useState(12);
  const [processingFee, setProcessingFee] = useState(3);

  const price = Number(product.price);
  const downPayment = Math.round(price * downPct / 100);
  const financeAmount = price - downPayment;
  const totalWithFee = financeAmount + Math.round(financeAmount * processingFee / 100);
  const monthlyEmi = Math.round(totalWithFee / tenure);
  const totalCost = downPayment + (monthlyEmi * tenure);

  const inquireEmi = () => {
    if (!shopPhone) return toast.error('Shop phone not configured');
    const phone = shopPhone.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;

    const lines = [
      '💰 *EMI INQUIRY*',
      '',
      `📱 Product: *${product.name}*`,
      `💵 Price: ${formatPKRFull(price)}`,
      '',
      '📊 *EMI Plan*',
      `Down Payment: ${formatPKR(downPayment)} (${downPct}%)`,
      `Finance Amount: ${formatPKR(financeAmount)}`,
      `Processing Fee: ${processingFee}%`,
      `Tenure: ${tenure} months`,
      `Monthly Installment: *${formatPKR(monthlyEmi)}*`,
      `Total Cost: ${formatPKRFull(totalCost)}`,
      '',
      'Please confirm this EMI plan is available. Shukriya!',
    ];
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg">EMI Calculator</h3>
              <p className="text-xs text-white/85 font-semibold truncate">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <div className="text-[10px] uppercase font-extrabold text-slate-600">Phone Price</div>
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{formatPKRFull(price)}</div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-extrabold text-slate-700">Down Payment</label>
              <span className="text-xs font-extrabold text-blue-700 tabular-nums">{downPct}% = {formatPKR(downPayment)}</span>
            </div>
            <input type="range" min="10" max="70" step="5" value={downPct} onChange={(e) => setDownPct(Number(e.target.value))}
              className="w-full accent-blue-600" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-extrabold text-slate-700">Tenure</label>
              <span className="text-xs font-extrabold text-blue-700">{tenure} months</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {[3, 6, 12, 18, 24].map((t) => (
                <button
                  key={t}
                  onClick={() => setTenure(t)}
                  className={[
                    'py-1.5 rounded-lg text-xs font-extrabold transition',
                    tenure === t ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  ].join(' ')}
                >
                  {t}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">Processing Fee</label>
            <div className="flex gap-1">
              {[0, 2, 3, 5].map((f) => (
                <button
                  key={f}
                  onClick={() => setProcessingFee(f)}
                  className={[
                    'flex-1 py-1.5 rounded-lg text-xs font-extrabold transition',
                    processingFee === f ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  ].join(' ')}
                >
                  {f}%
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 space-y-1.5">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Your Monthly EMI</div>
            <div className="text-4xl font-extrabold tabular-nums">{formatPKR(monthlyEmi)}</div>
            <div className="text-[10px] text-white/80 font-semibold pt-2 border-t border-white/20 space-y-0.5">
              <div className="flex justify-between"><span>Down payment:</span><span className="font-bold">{formatPKR(downPayment)}</span></div>
              <div className="flex justify-between"><span>Finance amount:</span><span className="font-bold">{formatPKR(financeAmount)}</span></div>
              <div className="flex justify-between"><span>Total cost:</span><span className="font-bold">{formatPKR(totalCost)}</span></div>
            </div>
          </div>

          <Button
            className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600"
            onClick={inquireEmi}
            disabled={!shopPhone}
          >
            <MessageCircle className="h-4 w-4" /> Inquire via WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
