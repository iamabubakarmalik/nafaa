import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wheat, Search, X, Plus, Trash2, User, UserPlus,
  Package, ArrowLeft, Sparkles, DollarSign, Camera,
  CheckCircle2, ChevronDown, Sprout, Tractor, Leaf,
  Beef, Bug, FlaskConical, Droplets, Wrench, Landmark,
  ShieldAlert, Calendar, Ruler, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { agriProductsApi } from '../api/products.api';
import { farmersApi } from '../api/farmers.api';
import { useSharedPosCart, cartLineId } from '@modules/pos/hooks/useSharedPosCart';
import { FbrModeIndicator } from '@integrations/fbr/components/FbrModeIndicator';

const CATEGORY_ICONS: Record<string, any> = {
  SEEDS: Sprout, FERTILIZER: FlaskConical, PESTICIDE: Bug, HERBICIDE: Leaf,
  FUNGICIDE: Leaf, INSECTICIDE: Bug, ANIMAL_FEED: Beef, POULTRY_FEED: Beef,
  CATTLE_FEED: Beef, FISH_FEED: Beef, VETERINARY_MEDICINE: FlaskConical,
  FARM_TOOLS: Wrench, IRRIGATION: Droplets, MACHINERY_PART: Wrench,
  ORGANIC_INPUT: Leaf, OTHER: Package,
};

const CATEGORY_COLORS: Record<string, string> = {
  SEEDS: 'bg-green-100 text-green-700 border-green-300',
  FERTILIZER: 'bg-blue-100 text-blue-700 border-blue-300',
  PESTICIDE: 'bg-red-100 text-red-700 border-red-300',
  HERBICIDE: 'bg-lime-100 text-lime-700 border-lime-300',
  FUNGICIDE: 'bg-amber-100 text-amber-700 border-amber-300',
  INSECTICIDE: 'bg-rose-100 text-rose-700 border-rose-300',
  ANIMAL_FEED: 'bg-violet-100 text-violet-700 border-violet-300',
  POULTRY_FEED: 'bg-orange-100 text-orange-700 border-orange-300',
  CATTLE_FEED: 'bg-pink-100 text-pink-700 border-pink-300',
  FISH_FEED: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  VETERINARY_MEDICINE: 'bg-teal-100 text-teal-700 border-teal-300',
  FARM_TOOLS: 'bg-slate-100 text-slate-700 border-slate-300',
  IRRIGATION: 'bg-sky-100 text-sky-700 border-sky-300',
  MACHINERY_PART: 'bg-slate-100 text-slate-700 border-slate-300',
  ORGANIC_INPUT: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  OTHER: 'bg-slate-100 text-slate-700 border-slate-300',
};

const CATEGORY_LABELS: Record<string, string> = {
  SEEDS: '🌱 Seeds', FERTILIZER: '🧪 Fertilizer', PESTICIDE: '💊 Pesticide',
  HERBICIDE: '🌿 Herbicide', FUNGICIDE: '🍄 Fungicide', INSECTICIDE: '🐛 Insecticide',
  ANIMAL_FEED: '🐄 Animal Feed', POULTRY_FEED: '🐔 Poultry Feed',
  CATTLE_FEED: '🐮 Cattle Feed', FISH_FEED: '🐟 Fish Feed',
  VETERINARY_MEDICINE: '💉 Vet Medicine', FARM_TOOLS: '🔧 Farm Tools',
  IRRIGATION: '💧 Irrigation', MACHINERY_PART: '⚙️ Machinery',
  ORGANIC_INPUT: '🍃 Organic', OTHER: '📦 Other',
};

const SEASONS = [
  { value: '', label: 'All Seasons' },
  { value: 'KHARIF', label: '🌧️ Kharif' },
  { value: 'RABI', label: '❄️ Rabi' },
  { value: 'ZAID', label: '☀️ Zaid' },
  { value: 'ALL_SEASON', label: '🌍 All' },
];

export default function AgriPosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [seasonFilter, setSeasonFilter] = useState('');
  const [organicOnly, setOrganicOnly] = useState(false);
  const [showFarmerAdd, setShowFarmerAdd] = useState(false);
  const [newFarmer, setNewFarmer] = useState({ fullName: '', phone: '', cnic: '', village: '' });
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null);
  const [showFarmerPicker, setShowFarmerPicker] = useState(false);
  const [farmerSearch, setFarmerSearch] = useState('');
  const [cropTarget, setCropTarget] = useState('');
  const [landAcres, setLandAcres] = useState('');

  const {
    cart, setCart, customerId, setCustomerId,
    paymentMethod, setPaymentMethod, paidAmount, setPaidAmount,
    saleMode, setSaleMode, globalDiscount, setGlobalDiscount,
    subtotal, total, totalItems, effectivePaid, credit, clearCart,
  } = useSharedPosCart();

  const { data: productsData } = useQuery({
    queryKey: ['products-for-agri-pos', search],
    queryFn: () => productsApi.list({ page: 1, limit: 200, search: search || undefined }),
  });
  const products = productsData?.items ?? [];

  const { data: agriProfiles = [] } = useQuery({
    queryKey: ['agri-products-all-pos'],
    queryFn: () => agriProductsApi.list({}),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });
  const customers = customersData?.items ?? [];

  const { data: farmers = [] } = useQuery({
    queryKey: ['farmers-for-agri-pos', farmerSearch],
    queryFn: () => farmersApi.list({ search: farmerSearch || undefined }),
    enabled: showFarmerPicker,
  });

  // Merge products with agri profiles
  const enrichedProducts = useMemo(() => {
    return products.map((p) => {
      const profile = agriProfiles.find((ap: any) => ap.productId === p.id);
      return { ...p, agriProfile: profile };
    });
  }, [products, agriProfiles]);

  const filteredProducts = useMemo(() => {
    let list = enrichedProducts;
    if (categoryFilter !== 'all') {
      list = list.filter((p: any) => p.agriProfile?.category === categoryFilter);
    }
    if (seasonFilter) {
      list = list.filter((p: any) => p.agriProfile?.season === seasonFilter);
    }
    if (organicOnly) {
      list = list.filter((p: any) => p.agriProfile?.isOrganic);
    }
    return list;
  }, [enrichedProducts, categoryFilter, seasonFilter, organicOnly]);

  const categoriesWithCount = useMemo(() => {
    const counts: Record<string, number> = {};
    enrichedProducts.forEach((p: any) => {
      const cat = p.agriProfile?.category || 'OTHER';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [enrichedProducts]);

  const addToCart = (product: any) => {
    if (product.stock <= 0) return toast.error('Out of stock');

    // Warn if restricted
    if (product.agriProfile?.isRestricted) {
      if (!confirm('⚠️ Ye restricted product hai. Buyer ke paas license honi chahiye. Continue?')) return;
    }

    const existing = cart.find((c) => c.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return toast.error('Stock limit');
      setCart((prev) => prev.map((c) =>
        c.cartLineId === existing.cartLineId ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart((prev) => [...prev, {
        cartLineId: cartLineId(),
        productId: product.id,
        name: product.name,
        variantImage: product.images?.[0]?.url,
        basePrice: product.price,
        wholesalePrice: product.wholesalePrice,
        stock: product.stock,
        quantity: 1,
        unit: product.unit,
        category: product.category,
        useWholesale: false,
        lineDiscount: 0,
        note: product.agriProfile?.applicationRate
          ? `Rate: ${product.agriProfile.applicationRate}${cropTarget ? ` | Crop: ${cropTarget}` : ''}`
          : cropTarget ? `Crop: ${cropTarget}` : undefined,
      }]);
    }
    toast.success(`${product.name} added`);
  };

  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);
    if (!code.trim()) return;
    try {
      const product = await productsApi.byBarcode(code.trim());
      addToCart(product);
    } catch {
      toast.error(`Barcode "${code}" not found`);
    }
  };

  const addFarmerMutation = useMutation({
    mutationFn: farmersApi.create,
    onSuccess: (farmer: any) => {
      toast.success(`Farmer ${farmer.fullName} added`);
      setSelectedFarmer(farmer);
      setCustomerId(farmer.customerId || '');
      setShowFarmerAdd(false);
      setNewFarmer({ fullName: '', phone: '', cnic: '', village: '' });
      queryClient.invalidateQueries({ queryKey: ['farmers-for-agri-pos'] });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: () => {
      if (!currentShopId) throw new Error('Shop required');
      const noteBase = selectedFarmer ? `Farmer: ${selectedFarmer.farmerNumber || selectedFarmer.fullName}` : '';
      const noteFull = [noteBase, cropTarget && `Crop: ${cropTarget}`, landAcres && `Land: ${landAcres} acres`]
        .filter(Boolean).join(' | ');

      return offlineSalesApi.create({
        shopId: currentShopId,
        customerId: customerId || undefined,
        paymentMethod,
        paidAmount: effectivePaid,
        discount: Number(globalDiscount) || 0,
        note: noteFull || undefined,
        items: cart.map((c) => ({
          productId: c.productId,
          quantity: c.quantity,
          priceOverride: c.priceOverride,
          lineDiscount: c.lineDiscount,
          useWholesale: c.useWholesale,
          note: c.note,
        })),
      });
    },
    onSuccess: (sale) => {
      window.open(`/sales/${sale.id}/receipt?auto=1`, '_blank');
      clearCart();
      setSelectedFarmer(null);
      setCropTarget('');
      setLandAcres('');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Sale failed'),
  });

  const handleCheckout = () => {
    if (cart.length === 0) return toast.error('Cart empty');
    if (!currentShopId) return toast.error('Select shop first');
    if (credit > 0 && !customerId) return toast.error('Customer required for udhaar');
    checkoutMutation.mutate();
  };

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcodeScan} onClose={() => setScannerOpen(false)} />}

      {showFarmerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-lime-600 to-green-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tractor className="h-5 w-5" />
                <h3 className="font-extrabold">Quick Add Farmer</h3>
              </div>
              <button onClick={() => setShowFarmerAdd(false)} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input autoFocus value={newFarmer.fullName} onChange={(e) => setNewFarmer({ ...newFarmer, fullName: e.target.value })}
                placeholder="Farmer name *"
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-lime-500" />
              <input value={newFarmer.phone} onChange={(e) => setNewFarmer({ ...newFarmer, phone: e.target.value })}
                placeholder="Phone (03XX...)"
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-lime-500" />
              <input value={newFarmer.cnic} onChange={(e) => setNewFarmer({ ...newFarmer, cnic: e.target.value })}
                placeholder="CNIC (optional)"
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-lime-500" />
              <input value={newFarmer.village} onChange={(e) => setNewFarmer({ ...newFarmer, village: e.target.value })}
                placeholder="Village / Area"
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-lime-500" />
              <Button size="lg" className="w-full bg-gradient-to-r from-lime-600 to-green-700"
                onClick={() => {
                  if (!newFarmer.fullName.trim()) return toast.error('Name required');
                  addFarmerMutation.mutate(newFarmer);
                }}
                loading={addFarmerMutation.isPending}>
                Register Farmer
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_460px] gap-4 h-[calc(100dvh-7rem)]">
        {/* PRODUCT SIDE */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-lime-900 to-green-800 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-lime-400/20 blur-2xl" />
            <div className="relative px-5 py-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold border border-white/20">
                <Wheat className="h-3 w-3 text-amber-300" />
                Agri POS
              </div>
              <h2 className="mt-2 text-2xl font-extrabold">Seeds, Fertilizer, Feed & More</h2>
              <p className="text-xs text-white/80 font-semibold mt-1">
                Farmer register karo, crop select karo, bulk rate lagao
              </p>
            </div>
          </div>

          <div className="shrink-0 px-4 py-3 bg-slate-50/80 border-b border-slate-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search seed, fertilizer, pesticide..."
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-lime-500" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button onClick={() => setScannerOpen(true)}
                className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white flex items-center justify-center shadow-lg">
                <Camera className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}
                className="h-9 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-lime-500">
                {SEASONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button onClick={() => setOrganicOnly(!organicOnly)}
                className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 border-2 ${
                  organicOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'
                }`}>
                <Leaf className="h-3 w-3" />
                Organic Only
              </button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setCategoryFilter('all')}
                className={`shrink-0 px-3 h-9 rounded-lg text-xs font-extrabold transition ${
                  categoryFilter === 'all' ? 'bg-lime-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
                }`}>
                <Sparkles className="h-3 w-3 inline mr-1" />
                All ({enrichedProducts.length})
              </button>
              {categoriesWithCount.map(([cat, count]) => {
                const Icon = CATEGORY_ICONS[cat] || Package;
                return (
                  <button key={cat} onClick={() => setCategoryFilter(cat)}
                    className={`shrink-0 px-3 h-9 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 border-2 transition ${
                      categoryFilter === cat ? CATEGORY_COLORS[cat] + ' shadow' : 'bg-white border-slate-200 text-slate-700'
                    }`}>
                    <Icon className="h-3 w-3" />
                    {CATEGORY_LABELS[cat]?.split(' ')[1] || cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                <Wheat className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700">No products</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {filteredProducts.map((p: any) => {
                  const cat = p.agriProfile?.category || 'OTHER';
                  const Icon = CATEGORY_ICONS[cat] || Package;
                  return (
                    <button key={p.id} onClick={() => addToCart(p)}
                      disabled={p.stock <= 0}
                      className={`group text-left rounded-2xl border-2 overflow-hidden transition bg-white ${
                        p.stock <= 0 ? 'opacity-40 cursor-not-allowed border-slate-200'
                          : 'border-slate-200 hover:border-lime-400 hover:shadow-md hover:-translate-y-0.5'
                      }`}>
                      <div className="aspect-square bg-lime-50 overflow-hidden relative">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon className="h-10 w-10 text-lime-400" />
                          </div>
                        )}
                        <div className="absolute top-1 left-1 flex gap-1 flex-wrap">
                          {p.agriProfile?.isOrganic && (
                            <div className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold inline-flex items-center gap-0.5">
                              <Leaf className="h-2 w-2" /> ORG
                            </div>
                          )}
                          {p.agriProfile?.isRestricted && (
                            <div className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-extrabold animate-pulse">
                              LIC
                            </div>
                          )}
                        </div>
                        {p.stock <= 0 && (
                          <div className="absolute inset-x-0 bottom-0 py-1 bg-rose-600 text-white text-center text-[10px] font-extrabold">
                            OUT OF STOCK
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="font-extrabold text-slate-900 text-xs line-clamp-2 leading-tight min-h-[2rem]">{p.name}</div>
                        {p.agriProfile?.npkRatio && (
                          <div className="text-[9px] font-bold text-blue-700 mt-0.5">NPK: {p.agriProfile.npkRatio}</div>
                        )}
                        <div className="mt-1 flex items-baseline justify-between">
                          <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.price)}</div>
                          <div className="text-[9px] font-bold text-slate-500">{p.stock} {p.unit}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* CART SIDE */}
        <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-lime-900 to-green-800 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                  <Wheat className="h-2.5 w-2.5" />
                  Agri Cart
                </div>
                <div className="text-2xl font-extrabold tabular-nums mt-1">{totalItems.toFixed(0)} items</div>
                <div className="text-xs text-white/80 font-semibold">{formatPKRFull(total)}</div>
              </div>
              {cart.length > 0 && (
                <button onClick={() => { if (confirm('Clear cart?')) clearCart(); }}
                  className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-rose-500/40 text-white text-xs font-extrabold border border-white/20">
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Farmer */}
            <div className="p-3 border-b border-slate-100 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Tractor className="h-3 w-3 text-lime-600" />
                  Farmer / Customer
                </label>
                <button onClick={() => setShowFarmerAdd(true)}
                  className="text-xs font-extrabold text-lime-600 hover:text-lime-700 inline-flex items-center gap-1">
                  <UserPlus className="h-3 w-3" />
                  Register
                </button>
              </div>

              {selectedFarmer ? (
                <div className="rounded-xl bg-lime-50 border-2 border-lime-300 p-2.5 flex items-center gap-2">
                  <Tractor className="h-4 w-4 text-lime-700 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{selectedFarmer.fullName}</div>
                    <div className="text-[10px] text-slate-600 font-bold">
                      {selectedFarmer.farmerNumber || 'No #'}
                      {selectedFarmer.village && ` • ${selectedFarmer.village}`}
                    </div>
                  </div>
                  <button onClick={() => { setSelectedFarmer(null); setCustomerId(''); }}
                    className="text-[10px] font-extrabold text-rose-600 hover:underline">
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <button onClick={() => setShowFarmerPicker(!showFarmerPicker)}
                    className="w-full h-10 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-xs font-extrabold text-slate-600 hover:border-lime-400 inline-flex items-center justify-center gap-1">
                    <Search className="h-3.5 w-3.5" />
                    Search Registered Farmer
                  </button>
                  {showFarmerPicker && (
                    <div className="rounded-xl border-2 border-lime-300 bg-lime-50/50 p-2 space-y-1">
                      <input autoFocus value={farmerSearch} onChange={(e) => setFarmerSearch(e.target.value)}
                        placeholder="Search farmer..."
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-lime-500" />
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {farmers.map((f: any) => (
                          <button key={f.id} onClick={() => {
                            setSelectedFarmer(f);
                            setCustomerId(f.customerId || '');
                            setShowFarmerPicker(false);
                          }} className="w-full px-2 py-1.5 flex items-center gap-2 rounded hover:bg-white text-left">
                            <Tractor className="h-3 w-3 text-slate-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-extrabold truncate">{f.fullName}</div>
                              <div className="text-[9px] text-slate-500">{f.phone} • {f.village || '—'}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                    className="h-10 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-lime-500 appearance-none">
                    <option value="">Walk-in Customer (No Farmer Record)</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}{c.phone ? ` • ${c.phone}` : ''}</option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {/* Crop context */}
            {(selectedFarmer || customerId) && cart.length > 0 && (
              <div className="p-3 border-b border-slate-100 bg-green-50/50 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase font-extrabold text-green-700 mb-0.5 block">Target Crop</label>
                  <div className="relative">
                    <Sprout className="h-3 w-3 text-green-500 absolute left-2 top-1/2 -translate-y-1/2" />
                    <input value={cropTarget} onChange={(e) => setCropTarget(e.target.value)}
                      placeholder="e.g. Wheat, Rice"
                      className="h-9 w-full rounded-lg border border-green-300 bg-white pl-7 pr-2 text-xs font-bold focus:outline-none focus:border-green-500" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-extrabold text-green-700 mb-0.5 block">Land Area</label>
                  <div className="relative">
                    <Ruler className="h-3 w-3 text-green-500 absolute left-2 top-1/2 -translate-y-1/2" />
                    <input type="number" step="0.1" value={landAcres} onChange={(e) => setLandAcres(e.target.value)}
                      placeholder="Acres"
                      className="h-9 w-full rounded-lg border border-green-300 bg-white pl-7 pr-2 text-xs font-extrabold tabular-nums focus:outline-none focus:border-green-500" />
                  </div>
                </div>
              </div>
            )}

            {/* Cart items */}
            <div className="p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <Wheat className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">Cart empty</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Click products or scan barcode</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.cartLineId} className="rounded-xl border-2 border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm text-slate-900 truncate">{item.name}</div>
                        {item.note && (
                          <div className="mt-1 text-[10px] font-bold text-lime-700 bg-lime-50 rounded px-1.5 py-0.5 inline-block">
                            {item.note}
                          </div>
                        )}
                      </div>
                      <button onClick={() => setCart((prev) => prev.filter((c) => c.cartLineId !== item.cartLineId))}
                        className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center bg-slate-100 rounded-lg overflow-hidden">
                        <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: Math.max(0.01, c.quantity - 1) } : c))}
                          className="h-7 w-7 hover:bg-slate-200 font-extrabold">−</button>
                        <span className="h-7 w-12 flex items-center justify-center text-xs font-extrabold tabular-nums">{item.quantity}</span>
                        <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: Math.min(c.stock, c.quantity + 1) } : c))}
                          className="h-7 w-7 bg-lime-600 text-white hover:bg-lime-700 font-extrabold">+</button>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-emerald-700 tabular-nums">
                          {formatPKR(item.basePrice * item.quantity)}
                        </div>
                        <div className="text-[9px] text-slate-500 font-bold">
                          {formatPKR(item.basePrice)}/{item.unit}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {cart.length > 0 && (
            <div className="shrink-0 border-t-2 border-slate-200 bg-slate-50/50 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input type="number" placeholder="Bulk discount" value={globalDiscount} onChange={(e) => setGlobalDiscount(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-bold tabular-nums" />
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="JAZZCASH">JazzCash</option>
                  <option value="EASYPAISA">EasyPaisa</option>
                  <option value="BANK_TRANSFER">Bank</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {(['FULL_PAYMENT', 'PARTIAL_CREDIT', 'FULL_CREDIT'] as const).map((m) => (
                  <button key={m} onClick={() => setSaleMode(m)}
                    className={`py-2 rounded-lg text-[10px] font-extrabold transition ${
                      saleMode === m ? 'bg-lime-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
                    }`}>
                    {m === 'FULL_PAYMENT' ? 'Full Pay' : m === 'PARTIAL_CREDIT' ? 'Partial' : 'Udhaar'}
                  </button>
                ))}
              </div>

              {saleMode === 'PARTIAL_CREDIT' && (
                <input type="number" placeholder="Paid amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                  className="h-10 w-full rounded-lg border-2 border-amber-300 bg-amber-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
              )}

              <div className="rounded-xl bg-gradient-to-br from-slate-950 to-lime-900 text-white p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
                {Number(globalDiscount) > 0 && (
                  <div className="flex justify-between text-rose-300"><span>Bulk Discount</span><span className="font-bold tabular-nums">-{formatPKR(Number(globalDiscount))}</span></div>
                )}
                <div className="pt-1 mt-1 border-t border-white/20 flex justify-between items-center">
                  <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                  <FbrModeIndicator saleTotal={total} className="mb-2" />
                  <span className="text-2xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
                </div>
                {credit > 0 && (
                  <div className="flex justify-between text-amber-300 pt-1 border-t border-white/20 mt-1">
                    <span className="font-extrabold">Udhaar</span>
                    <span className="font-extrabold tabular-nums">{formatPKR(credit)}</span>
                  </div>
                )}
              </div>

              <Button size="lg" className="w-full bg-gradient-to-r from-lime-600 to-green-700"
                onClick={handleCheckout} loading={checkoutMutation.isPending} disabled={!currentShopId}>
                <CheckCircle2 className="h-5 w-5" />
                Complete Sale
              </Button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
