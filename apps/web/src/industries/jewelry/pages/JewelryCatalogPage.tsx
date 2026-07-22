import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Gem, Search, X, Star, Heart, ShoppingBag, Plus, MessageCircle,
  TrendingUp, Sparkles, Award, Crown, Package, Calculator, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { useAuthStore } from '@core/stores/auth.store';
import { useCatalogCart } from '@modules/catalog/hooks/useCatalogCart';
import { useWishlist } from '@modules/catalog/hooks/useWishlist';
import { CatalogCartDrawer } from '@modules/catalog/components/CatalogCartDrawer';

const KARATS = [
  { value: '24', label: '24K', color: '#eab308' },
  { value: '22', label: '22K', color: '#f59e0b' },
  { value: '21', label: '21K', color: '#f97316' },
  { value: '18', label: '18K', color: '#fbbf24' },
];

export default function JewelryCatalogPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const cart = useCatalogCart();
  const wishlist = useWishlist();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [karatFilter, setKaratFilter] = useState<string>('all');
  const [showCart, setShowCart] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const [appointmentFor, setAppointmentFor] = useState<any>(null);

  const { data: productsData } = useQuery({
    queryKey: ['jewelry-catalog', search, categoryFilter],
    queryFn: () => productsApi.list({
      search,
      categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
      isActive: true,
      limit: 200,
    }),
  });

  const products = productsData?.items ?? [];

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const featured = useMemo(() => products.filter((p: any) => p.isFeatured).slice(0, 8), [products]);
  const bridal = useMemo(() =>
    products.filter((p: any) => p.name.toLowerCase().includes('bridal') || p.category?.name?.toLowerCase().includes('bridal')).slice(0, 6),
    [products]
  );

  const shopSettings = (tenant as any)?.settings ?? {};
  const shopWhatsapp = shopSettings.shopWhatsapp || shopSettings.shopPhone || (tenant as any)?.phone;

  const handleAdd = (p: any) => {
    cart.addItem({
      productId: p.id,
      name: p.name,
      image: p.images?.[0]?.url,
      price: Number(p.price),
      unit: p.unit || 'piece',
      quantity: 1,
    });
    toast.success(`${p.name} added`);
  };

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-700 text-white p-6 sm:p-8 shadow-2xl mb-6">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-yellow-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Gem className="h-3.5 w-3.5 text-amber-300" />
              {tenant?.name || 'Jewelry Store'}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Exquisite Jewelry</h1>
            <p className="mt-2 text-sm text-white/85 max-w-xl">
              {products.length} designs • BIS certified • Custom orders available • Book showroom appointment
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowCart(true)}
              className="relative inline-flex items-center gap-2 rounded-xl bg-white text-amber-900 px-4 py-2.5 text-sm font-extrabold shadow-lg"
            >
              <ShoppingBag className="h-4 w-4" />
              Wishlist
              {cart.totalItems > 0 && (
                <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-lg ring-2 ring-white">
                  {cart.totalItems.toFixed(0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* SEARCH + FILTERS */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3 mb-6">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            placeholder="Search rings, necklaces, bangles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoryFilter('all')}
              className={[
                'shrink-0 px-3 h-9 rounded-lg text-xs font-extrabold transition',
                categoryFilter === 'all' ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              ].join(' ')}
            >
              All Categories
            </button>
            {categories.slice(0, 12).map((c: any) => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.id)}
                className={[
                  'shrink-0 px-3 h-9 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 border transition',
                  categoryFilter === c.id ? 'text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-50',
                ].join(' ')}
                style={{
                  backgroundColor: categoryFilter === c.id ? (c.color || '#eab308') : '#fff',
                  borderColor: categoryFilter === c.id ? (c.color || '#eab308') : '#e2e8f0',
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color || '#eab308' }} />
                {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setKaratFilter('all')}
            className={[
              'shrink-0 px-3 h-8 rounded-lg text-xs font-extrabold transition',
              karatFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            ].join(' ')}
          >
            All Purity
          </button>
          {KARATS.map((k) => (
            <button
              key={k.value}
              onClick={() => setKaratFilter(k.value)}
              className={[
                'shrink-0 px-3 h-8 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1',
                karatFilter === k.value ? 'text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              ].join(' ')}
              style={{ backgroundColor: karatFilter === k.value ? k.color : undefined }}
            >
              <Gem className="h-3 w-3" />
              {k.label}
            </button>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      {featured.length > 0 && !search && categoryFilter === 'all' && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white flex items-center justify-center shadow-md">
              <Crown className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-900 text-lg">Signature Collection</h3>
              <p className="text-[11px] text-amber-700 font-bold">Handcrafted premium pieces</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {featured.map((p: any) => (
              <JewelryCard
                key={p.id}
                product={p}
                onDetail={() => setDetailProduct(p)}
                onAppointment={() => setAppointmentFor(p)}
                onAdd={() => handleAdd(p)}
                wishlist={wishlist}
              />
            ))}
          </div>
        </section>
      )}

      {/* BRIDAL */}
      {bridal.length > 0 && !search && (
        <section className="rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-md">
              <Heart className="h-4 w-4 fill-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-rose-900 text-lg">Bridal Collection</h3>
              <p className="text-[11px] text-rose-700 font-bold">Special occasion pieces</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {bridal.map((p: any) => (
              <JewelryCard
                key={p.id}
                product={p}
                onDetail={() => setDetailProduct(p)}
                onAppointment={() => setAppointmentFor(p)}
                onAdd={() => handleAdd(p)}
                wishlist={wishlist}
              />
            ))}
          </div>
        </section>
      )}

      {/* ALL */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-extrabold text-slate-900">All Designs</h3>
          <div className="text-xs text-slate-500 font-bold">{products.length} pieces</div>
        </div>
        {products.length === 0 ? (
          <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
            <Gem className="h-16 w-16 text-slate-300 mx-auto mb-3" />
            <p className="font-extrabold text-slate-700">No jewelry pieces</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((p: any) => (
              <JewelryCard
                key={p.id}
                product={p}
                onDetail={() => setDetailProduct(p)}
                onAppointment={() => setAppointmentFor(p)}
                onAdd={() => handleAdd(p)}
                wishlist={wishlist}
              />
            ))}
          </div>
        )}
      </section>

      {cart.totalItems > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-br from-amber-600 to-yellow-700 text-white shadow-2xl hover:scale-105 lg:hidden"
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="font-extrabold">{cart.totalItems.toFixed(0)}</span>
        </button>
      )}

      <CatalogCartDrawer
        cart={cart}
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        shopName={tenant?.name}
        shopPhone={shopWhatsapp}
        themeColor="#d97706"
      />

      {detailProduct && (
        <JewelryDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onAppointment={() => { setAppointmentFor(detailProduct); setDetailProduct(null); }}
          onAdd={() => { handleAdd(detailProduct); setDetailProduct(null); }}
          wishlist={wishlist}
        />
      )}

      {appointmentFor && (
        <AppointmentModal
          product={appointmentFor}
          onClose={() => setAppointmentFor(null)}
          shopPhone={shopWhatsapp}
          shopName={tenant?.name}
        />
      )}
    </>
  );
}

function JewelryCard({ product, onDetail, onAppointment, onAdd, wishlist }: any) {
  const image = product.images?.[0]?.url;
  const inWishlist = wishlist.has(product.id);

  return (
    <div className="group rounded-2xl bg-white border-2 border-slate-200 overflow-hidden hover:border-amber-400 hover:shadow-xl hover:-translate-y-0.5 transition-all">
      <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 relative cursor-pointer overflow-hidden" onClick={onDetail}>
        {image ? (
          <img src={image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-100">
            <Gem className="h-16 w-16 text-amber-500" />
          </div>
        )}
        {product.isFeatured && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 text-white text-[9px] font-extrabold shadow inline-flex items-center gap-1">
            <Crown className="h-2.5 w-2.5" /> SIGNATURE
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); wishlist.toggle(product.id); }}
          className={[
            'absolute top-2 right-2 h-8 w-8 rounded-full flex items-center justify-center shadow transition',
            inWishlist ? 'bg-rose-500 text-white' : 'bg-white/95 backdrop-blur text-slate-600 hover:text-rose-500',
          ].join(' ')}
        >
          <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="p-3 space-y-1.5">
        {product.brand && (
          <div className="text-[9px] uppercase font-extrabold text-amber-700 tracking-wider">{product.brand.name}</div>
        )}
        <h4 className="font-extrabold text-slate-900 text-sm line-clamp-2 min-h-[2.25rem]">{product.name}</h4>
        <div className="flex items-baseline justify-between">
          <div className="text-base font-extrabold text-amber-700 tabular-nums">{formatPKR(Number(product.price))}</div>
        </div>
        <div className="grid grid-cols-2 gap-1 pt-1">
          <button
            onClick={onAppointment}
            className="h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-extrabold"
          >
            Try On
          </button>
          <button
            onClick={onAdd}
            className="h-8 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-extrabold inline-flex items-center justify-center gap-1"
          >
            <Heart className="h-3 w-3" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

function JewelryDetailModal({ product, onClose, onAppointment, onAdd, wishlist }: any) {
  const image = product.images?.[0]?.url;
  const inWishlist = wishlist.has(product.id);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-3xl bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[95vh] overflow-auto">
        <div className="grid sm:grid-cols-2">
          <div className="relative bg-gradient-to-br from-amber-50 to-yellow-100 aspect-square">
            {image ? (
              <img src={image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Gem className="h-32 w-32 text-amber-500" />
              </div>
            )}
            <button onClick={onClose} className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white/95 backdrop-blur text-slate-700 flex items-center justify-center shadow-lg">
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
              <div className="text-xs uppercase font-extrabold text-amber-700 tracking-wider">{product.brand.name}</div>
            )}
            <h2 className="text-2xl font-extrabold text-slate-900">{product.name}</h2>

            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 p-4">
              <div className="text-[10px] uppercase font-extrabold text-amber-700 mb-1">Price</div>
              <div className="text-4xl font-extrabold text-amber-700 tabular-nums">{formatPKRFull(Number(product.price))}</div>
              <div className="text-[10px] text-amber-700 font-semibold mt-1">Prices update daily with metal rate</div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-center">
                <Award className="h-4 w-4 text-emerald-700 mx-auto mb-1" />
                <div className="font-extrabold text-emerald-900 text-[10px]">BIS</div>
                <div className="text-[9px] text-emerald-700 font-bold">Certified</div>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-center">
                <Sparkles className="h-4 w-4 text-blue-700 mx-auto mb-1" />
                <div className="font-extrabold text-blue-900 text-[10px]">Hallmark</div>
                <div className="text-[9px] text-blue-700 font-bold">Purity</div>
              </div>
              <div className="rounded-lg bg-violet-50 border border-violet-200 p-2 text-center">
                <Info className="h-4 w-4 text-violet-700 mx-auto mb-1" />
                <div className="font-extrabold text-violet-900 text-[10px]">Custom</div>
                <div className="text-[9px] text-violet-700 font-bold">Order</div>
              </div>
            </div>

            {product.description && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-sm text-slate-700 leading-relaxed">{product.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-slate-100">
              <Button variant="secondary" onClick={onAdd}>
                <Heart className="h-4 w-4" /> Save
              </Button>
              <Button className="bg-gradient-to-r from-amber-600 to-yellow-700" onClick={onAppointment}>
                <Star className="h-4 w-4" /> Book Try-On
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentModal({ product, onClose, shopPhone, shopName }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [notes, setNotes] = useState('');

  const bookAppointment = () => {
    if (!name.trim() || !phone.trim()) return toast.error('Name and phone required');
    if (!shopPhone) return toast.error('Shop phone not configured');

    const phoneClean = shopPhone.replace(/[^0-9]/g, '');
    const cleanPhone = phoneClean.startsWith('92') ? phoneClean : phoneClean.startsWith('0') ? '92' + phoneClean.slice(1) : '92' + phoneClean;

    const lines = [
      '💎 *SHOWROOM APPOINTMENT*',
      '',
      `👤 Name: *${name}*`,
      `📞 Phone: ${phone}`,
      '',
      `💍 Interested in: *${product.name}*`,
      `💰 Price: ${formatPKRFull(Number(product.price))}`,
      '',
      '📅 *Preferred Time*',
      preferredDate ? `Date: ${preferredDate}` : 'Date: Flexible',
      preferredTime ? `Time: ${preferredTime}` : 'Time: Flexible',
      '',
      notes ? `📝 Notes: ${notes}` : '',
      '',
      'Please confirm my showroom visit for try-on. Shukriya!',
      shopName ? `— To ${shopName}` : '',
    ].filter(Boolean);

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
    toast.success('Appointment request sent!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-amber-600 to-yellow-700 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-white/70">Book Showroom Visit</div>
            <h3 className="font-extrabold text-lg">{product.name}</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name *"
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Your phone *"
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] font-bold text-slate-500 mb-1">Preferred Date</div>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 mb-1">Preferred Time</div>
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special requests, size, customization..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none"
          />

          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-green-500 to-green-600"
            onClick={bookAppointment}
            disabled={!shopPhone}
          >
            <MessageCircle className="h-4 w-4" /> Book via WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
