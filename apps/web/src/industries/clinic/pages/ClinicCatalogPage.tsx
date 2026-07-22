import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Stethoscope, Search, X, Star, Heart, ShoppingBag, Plus, Sparkles,
  TrendingUp, Clock, MessageCircle, ArrowRight, Info, Calendar,
  CheckCircle2, Video, Home, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { clinicServicesApi } from '../api/services.api';
import { SERVICE_CATEGORIES } from '../api/constants';
import { useAuthStore } from '@core/stores/auth.store';
import { useCatalogCart } from '@modules/catalog/hooks/useCatalogCart';
import { useWishlist } from '@modules/catalog/hooks/useWishlist';
import { CatalogCartDrawer } from '@modules/catalog/components/CatalogCartDrawer';

export default function ClinicCatalogPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const cart = useCatalogCart();
  const wishlist = useWishlist();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [showCart, setShowCart] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['clinic-catalog', categoryFilter, tagFilter],
    queryFn: () => clinicServicesApi.list({
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      featured: tagFilter === 'featured' ? true : undefined,
      popular: tagFilter === 'popular' ? true : undefined,
      discounted: tagFilter === 'discounted' ? true : undefined,
      active: true,
    }),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return services;
    const q = search.toLowerCase().trim();
    return services.filter((p: any) =>
      p.product?.name?.toLowerCase().includes(q) ||
      p.serviceCode?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  }, [services, search]);

  const featured = useMemo(() => services.filter((p: any) => p.isFeatured).slice(0, 6), [services]);
  const popular = useMemo(() => services.filter((p: any) => p.isPopular).slice(0, 6), [services]);

  const shopSettings = (tenant as any)?.settings ?? {};
  const shopWhatsapp = shopSettings.shopWhatsapp || shopSettings.shopPhone || (tenant as any)?.phone;

  const addToCart = (service: any) => {
    const p = service.product;
    cart.addItem({
      productId: service.productId,
      name: p?.name || 'Service',
      image: p?.images?.[0]?.url || service.imageUrls?.[0],
      price: Number(service.basePrice || p?.price || 0),
      unit: p?.unit || 'service',
      quantity: 1,
    });
    toast.success(p?.name + ' added');
  };

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-700 text-white p-6 sm:p-8 shadow-2xl mb-6">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Stethoscope className="h-3.5 w-3.5 text-amber-300" />
              {tenant?.name || 'Clinic'}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Medical Services 🩺</h1>
            <p className="mt-2 text-sm text-white/85 max-w-xl">
              {services.length} services • Consultations • Lab tests • Procedures • Health packages
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/clinic/appointments/new">
              <button className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 text-sm font-extrabold shadow-lg transition">
                <Calendar className="h-4 w-4" /> Book Appointment
              </button>
            </Link>
            <button
              onClick={() => setShowCart(true)}
              className="relative inline-flex items-center gap-2 rounded-xl bg-white text-cyan-900 px-4 py-2.5 text-sm font-extrabold shadow-lg"
            >
              <ShoppingBag className="h-4 w-4" /> Cart
              {cart.totalItems > 0 && (
                <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-lg ring-2 ring-white">
                  {cart.totalItems.toFixed(0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3 mb-6">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            placeholder="Search services, tests, procedures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>

        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5">Categories</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setCategoryFilter('all')} className={'shrink-0 px-3 h-9 rounded-lg text-xs font-extrabold transition ' + (categoryFilter === 'all' ? 'bg-cyan-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>
              All ({services.length})
            </button>
            {SERVICE_CATEGORIES.map((c) => (
              <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={'shrink-0 px-3 h-9 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1 ' + (categoryFilter === c.value ? 'bg-cyan-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50')}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {[
            { v: 'all', label: 'All', color: 'bg-slate-600' },
            { v: 'featured', label: '⭐ Featured', color: 'bg-amber-600' },
            { v: 'popular', label: '🔥 Popular', color: 'bg-red-600' },
            { v: 'discounted', label: '💰 Discounted', color: 'bg-emerald-600' },
          ].map((t) => (
            <button key={t.v} onClick={() => setTagFilter(t.v)} className={'px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' + (tagFilter === t.v ? t.color + ' text-white shadow' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50')}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {featured.length > 0 && !search && categoryFilter === 'all' && tagFilter === 'all' && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
              <Star className="h-4 w-4 fill-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-900 text-lg">Featured Services</h3>
              <p className="text-[11px] text-amber-700 font-bold">Doctor's recommended</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {featured.map((service: any) => (
              <ServiceCard key={service.id} service={service} compact onClick={() => addToCart(service)} onDetail={() => setDetailProduct(service)} wishlist={wishlist} />
            ))}
          </div>
        </section>
      )}

      {popular.length > 0 && !search && categoryFilter === 'all' && tagFilter === 'all' && (
        <section className="rounded-3xl bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-md">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-red-900 text-lg">Popular Services</h3>
              <p className="text-[11px] text-red-700 font-bold">Most requested</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {popular.map((service: any) => (
              <ServiceCard key={service.id} service={service} compact onClick={() => addToCart(service)} onDetail={() => setDetailProduct(service)} wishlist={wishlist} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-extrabold text-slate-900">
            {categoryFilter === 'all' ? 'All Services' : SERVICE_CATEGORIES.find((c) => c.value === categoryFilter)?.label}
          </h3>
          <div className="text-xs text-slate-500 font-bold">{filtered.length} services</div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (<div key={i} className="aspect-square rounded-2xl bg-slate-100 animate-pulse" />))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
            <Stethoscope className="h-16 w-16 text-slate-300 mx-auto mb-3" />
            <p className="font-extrabold text-slate-700">No services found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((service: any) => (
              <ServiceCard key={service.id} service={service} onClick={() => addToCart(service)} onDetail={() => setDetailProduct(service)} wishlist={wishlist} />
            ))}
          </div>
        )}
      </section>

      {cart.totalItems > 0 && (
        <button onClick={() => setShowCart(true)} className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-2xl hover:scale-105 transition-transform lg:hidden">
          <ShoppingBag className="h-5 w-5" />
          <span className="font-extrabold">{cart.totalItems.toFixed(0)}</span>
          <span className="font-extrabold tabular-nums">{formatPKR(cart.subtotal)}</span>
        </button>
      )}

      <CatalogCartDrawer cart={cart} isOpen={showCart} onClose={() => setShowCart(false)} shopName={tenant?.name} shopPhone={shopWhatsapp} themeColor="#06b6d4" />

      {detailProduct && (
        <ServiceDetailModal service={detailProduct} onClose={() => setDetailProduct(null)} onAdd={() => { addToCart(detailProduct); setDetailProduct(null); }} wishlist={wishlist} />
      )}
    </>
  );
}

function ServiceCard({ service, compact = false, onClick, onDetail, wishlist }: any) {
  const p = service.product;
  const category = SERVICE_CATEGORIES.find((c) => c.value === service.category);
  const inWishlist = wishlist.has(p?.id);
  const image = p?.images?.[0]?.url || service.imageUrls?.[0];
  const price = Number(service.basePrice || p?.price || 0);

  return (
    <div className="group relative rounded-2xl bg-white border-2 border-slate-200 overflow-hidden hover:border-cyan-400 hover:shadow-xl hover:-translate-y-0.5 transition-all">
      <div className={'aspect-square relative cursor-pointer overflow-hidden bg-gradient-to-br ' + (category?.color || 'from-cyan-100 to-blue-100')} onClick={onDetail}>
        {image ? (
          <img src={image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">{category?.emoji || '🩺'}</div>
        )}

        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
          {service.isFeatured && <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold shadow inline-flex items-center gap-0.5"><Star className="h-2 w-2 fill-white" /> FT</span>}
          {service.isPopular && <span className="px-1.5 py-0.5 rounded-md bg-red-500 text-white text-[9px] font-extrabold shadow">🔥 POP</span>}
          {service.isDiscounted && <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-extrabold shadow">💰 SALE</span>}
        </div>

        <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
          <button onClick={(e) => { e.stopPropagation(); wishlist.toggle(p?.id); }} className={'h-7 w-7 rounded-full flex items-center justify-center shadow transition ' + (inWishlist ? 'bg-rose-500 text-white' : 'bg-white/95 backdrop-blur text-slate-600 hover:text-rose-500')}>
            <Heart className={'h-3.5 w-3.5 ' + (inWishlist ? 'fill-current' : '')} />
          </button>
        </div>

        {service.durationMin && (
          <div className="absolute bottom-1.5 right-1.5">
            <span className="px-1.5 py-0.5 rounded-md bg-slate-900/80 backdrop-blur text-white text-[9px] font-extrabold shadow inline-flex items-center gap-0.5">
              <Clock className="h-2 w-2" /> {service.durationMin}m
            </span>
          </div>
        )}
      </div>

      <div className="p-2.5">
        {category && (
          <div className="text-[9px] uppercase font-extrabold text-cyan-600 truncate">{category.emoji} {category.label}</div>
        )}
        <h4 className={'font-extrabold text-slate-900 leading-tight ' + (compact ? 'text-xs line-clamp-2 min-h-[2rem]' : 'text-sm line-clamp-2 min-h-[2.25rem]')}>
          {p?.name}
        </h4>
        <div className="mt-1 flex items-end justify-between">
          <div className={'font-extrabold text-emerald-700 tabular-nums ' + (compact ? 'text-sm' : 'text-base')}>{formatPKR(price)}</div>
          <button onClick={onClick} className="h-7 w-7 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center shadow-sm transition group-hover:scale-110">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceDetailModal({ service, onClose, onAdd, wishlist }: any) {
  const p = service.product;
  const image = p?.images?.[0]?.url || service.imageUrls?.[0];
  const inWishlist = wishlist.has(p?.id);
  const category = SERVICE_CATEGORIES.find((c) => c.value === service.category);

  const priceOptions = [
    { key: 'base', price: service.basePrice, label: 'Base Price', emoji: '🩺' },
    { key: 'followUp', price: service.followUpPrice, label: 'Follow-up', emoji: '🔁' },
    { key: 'emergency', price: service.emergencyPrice, label: 'Emergency', emoji: '🚨' },
    { key: 'telemedicine', price: service.telemedicinePrice, label: 'Telemedicine', emoji: '📹' },
    { key: 'homeVisit', price: service.homeVisitPrice, label: 'Home Visit', emoji: '🏠' },
  ].filter((o) => o.price && Number(o.price) > 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[95vh] overflow-auto animate-in slide-in-from-bottom duration-300">
        <div className="relative">
          {image ? (
            <img src={image} alt="" className="w-full aspect-square object-cover" />
          ) : (
            <div className={'w-full aspect-square bg-gradient-to-br ' + (category?.color || 'from-cyan-100 to-blue-100') + ' flex items-center justify-center'}>
              <span className="text-9xl">{category?.emoji || '🩺'}</span>
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white/95 backdrop-blur hover:bg-white text-slate-700 flex items-center justify-center shadow-lg">
            <X className="h-5 w-5" />
          </button>
          <button onClick={() => wishlist.toggle(p?.id)} className={'absolute top-3 left-3 h-10 w-10 rounded-full flex items-center justify-center shadow-lg transition ' + (inWishlist ? 'bg-rose-500 text-white' : 'bg-white/95 backdrop-blur text-slate-700 hover:bg-white')}>
            <Heart className={'h-5 w-5 ' + (inWishlist ? 'fill-current' : '')} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            {category && (
              <div className="text-xs uppercase font-extrabold text-cyan-600">{category.emoji} {category.label}</div>
            )}
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{p?.name}</h2>
            <div className="mt-2 flex flex-wrap gap-1">
              {service.isFeatured && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold">⭐ Featured</span>}
              {service.isPopular && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold">🔥 Popular</span>}
              {service.requiresAppointment && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold">📅 Appointment</span>}
              {service.requiresFasting && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold">🚫 Fasting</span>}
            </div>
          </div>

          {(service.descriptionLong || p?.description) && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-sm text-slate-700 leading-relaxed">{service.descriptionLong || p?.description}</p>
            </div>
          )}

          {priceOptions.length > 1 && (
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-2">Pricing Tiers</div>
              <div className="grid grid-cols-2 gap-2">
                {priceOptions.map((opt: any) => (
                  <div key={opt.key} className="p-3 rounded-xl border-2 border-slate-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{opt.emoji}</span>
                        <span className="text-xs font-extrabold text-slate-900">{opt.label}</span>
                      </div>
                      <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(Number(opt.price))}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {service.durationMin && (
            <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-700" />
              <span className="text-sm font-extrabold text-amber-900">Duration: {service.durationMin} minutes</span>
            </div>
          )}

          {service.prepInstructions && (
            <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-blue-700 mb-1">Pre-Service Instructions</div>
              <p className="text-sm text-slate-700 leading-relaxed">{service.prepInstructions}</p>
            </div>
          )}

          {service.packageIncludes && service.packageIncludes.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-extrabold text-violet-700 mb-2">Package Includes</div>
              <div className="grid grid-cols-2 gap-1.5">
                {service.packageIncludes.map((item: string) => (
                  <div key={item} className="flex items-center gap-1.5 rounded-lg bg-violet-50 border border-violet-200 px-2 py-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 truncate">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t-2 border-slate-100">
            <Button size="lg" className="w-full bg-gradient-to-r from-cyan-600 to-blue-700" onClick={onAdd}>
              <Plus className="h-5 w-5" /> Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
