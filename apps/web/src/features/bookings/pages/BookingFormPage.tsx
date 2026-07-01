import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft, User, Phone, Search, Plus, Trash2, Package,
  Calendar, Clock, Wallet, BookmarkPlus, X, DollarSign,
  Sparkles, AlertTriangle, UserPlus, Layers, Scissors, Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { bookingsApi, type CreateBookingItem } from '@/api/bookings.api';
import { customersApi } from '@/api/customers.api';
import { offlineProductsApi as productsApi } from '@/lib/offline/offlineProducts';
import { productVariantsApi } from '@/api/product-variants.api';
import { carpetRollsApi } from '@/features/industries/carpet/api/carpet-rolls.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { ServiceChargesPanel } from '@/features/pos/components/ServiceChargesPanel';
import { CarpetRollPicker } from '@/features/pos/components/CarpetRollPicker';
import { CarpetCutPiecePicker } from '@/features/pos/components/CarpetCutPiecePicker';
import { ImeiPickerModal } from '@/features/industries/mobile/components/ImeiPickerModal';
import { VariantPicker } from '@/features/pos/components/VariantPicker';
import { useOfflineCarpetSummary } from '@/features/pos/hooks/useOfflineCarpetSummary';
import type { ServiceChargeItem, PaymentMethod } from '@/api/sales.api';
import type { Product } from '@/api/products.api';
import type { ProductVariant } from '@/api/product-variants.api';
import type { ProductImei } from '@/features/industries/mobile/api/imei.api';

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);
const MOBILE_KEYWORDS = ['mobile', 'phone', 'smartphone', 'iphone', 'samsung', 'oppo', 'vivo', 'realme', 'xiaomi', 'tecno', 'infinix'];

interface CartItem extends CreateBookingItem {
  cartLineId: string;
  productName: string;
  variantName?: string;
  variantImageUrl?: string;
  variantColorHex?: string;
  unit: string;
  // For display badges
  rollNumber?: string;
  cutPieceCode?: string;
  imeiNumber?: string;
  stockDisplay?: string;
}

const cartLineId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function BookingFormPage() {
  const navigate = useNavigate();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const { businessType, features } = useBusinessFeatures();

  const isCarpetBusiness = useMemo(() => {
    const type = (businessType ?? '').toUpperCase();
    return type === 'CARPET' || type === 'FLOORING' || features?.lengthWidthCalc === true;
  }, [businessType, features]);

  const isMobileBusiness = useMemo(() => {
    const type = (businessType ?? '').toUpperCase();
    return type === 'MOBILE' || type === 'PHONE' || type === 'ELECTRONICS' || features?.imei === true;
  }, [businessType, features]);

  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [expectedPickupAt, setExpectedPickupAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [discount, setDiscount] = useState('');
  const [initialAdvance, setInitialAdvance] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [serviceCharges, setServiceCharges] = useState<ServiceChargeItem[]>([]);

  // Pickers
  const [variantPicker, setVariantPicker] = useState<{ product: Product; variants: ProductVariant[] } | null>(null);
  const [carpetRollPicker, setCarpetRollPicker] = useState<{ product: Product; variant?: ProductVariant } | null>(null);
  const [cutPiecePicker, setCutPiecePicker] = useState<{ product: Product; variant?: ProductVariant } | null>(null);
  const [imeiPicker, setImeiPicker] = useState<{ product: Product; variant?: ProductVariant } | null>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-for-booking'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }).then((r) => r.items),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-for-booking'],
    queryFn: () => productsApi.list({ page: 1, limit: 500 }),
  });

  const products = productsData?.items ?? [];

  // Carpet stock summary — same as POS
  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const { data: carpetSummary = [] } = useOfflineCarpetSummary(
    productIds,
    isCarpetBusiness && productIds.length > 0,
  );
  const carpetSummaryMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of carpetSummary) map.set(s.productId, s);
    return map;
  }, [carpetSummary]);

  const isCarpetProduct = (p: Product) => isCarpetBusiness && CARPET_UNITS.has(p.unit);

  const productNeedsImei = (p: Product) => {
    if (!features?.imei) return false;
    const name = p.name.toLowerCase();
    const category = (p.category?.name || '').toLowerCase();
    return MOBILE_KEYWORDS.some((kw) => name.includes(kw) || category.includes(kw));
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 10);
    const q = customerSearch.toLowerCase();
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q))
      .slice(0, 10);
  }, [customers, customerSearch]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 20);
    const q = productSearch.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
      .slice(0, 20);
  }, [products, productSearch]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Totals
  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);
  const lineDiscountTotal = useMemo(() => cart.reduce((sum, i) => sum + (i.lineDiscount ?? 0), 0), [cart]);
  const totalDiscount = (Number(discount) || 0) + lineDiscountTotal;
  const svcTotal = useMemo(() => serviceCharges.reduce((s, c) => s + Number(c.amount || 0), 0), [serviceCharges]);
  const total = Math.max(subtotal - totalDiscount + svcTotal, 0);
  const advance = Number(initialAdvance) || 0;
  const balance = Math.max(total - advance, 0);

  const createCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (c) => {
      toast.success(`${c.name} added`);
      setCustomerId(c.id);
      setShowCustomerAdd(false);
      setNewCustomer({ name: '', phone: '' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Add failed'),
  });

  const createBookingMutation = useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: (b) => {
      toast.success(`Booking ${b.bookingNumber} created`);
      navigate(`/bookings/${b.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Booking failed'),
  });

  // ─── Smart product-to-picker routing ───────────────────
  const addProductToCart = async (product: Product) => {
    const isCarpet = isCarpetProduct(product);

    // Carpet product: check stock summary, then open roll picker
    if (isCarpet) {
      const summary = carpetSummaryMap.get(product.id);
      if (!summary || summary.totalSqft <= 0) {
        toast.error(`${product.name}: koi active roll nahi hai`);
        return;
      }

      // If has variants → pick variant first
      if (product.hasVariants) {
        try {
          const variants = await productVariantsApi.list(product.id);
          const active = variants.filter((v) => v.isActive);
          if (active.length === 0) {
            toast.error('No active variants for this carpet');
            return;
          }
          setVariantPicker({ product, variants });
          return;
        } catch {
          toast.error('Failed to load variants');
          return;
        }
      }

      setCarpetRollPicker({ product });
      return;
    }

    // Non-carpet with variants
    if (product.hasVariants) {
      try {
        const variants = await productVariantsApi.list(product.id);
        const active = variants.filter((v) => v.isActive);
        if (active.length === 0) {
          toast.error('No active variants');
          return;
        }
        setVariantPicker({ product, variants });
        return;
      } catch {
        toast.error('Failed to load variants');
        return;
      }
    }

    // Mobile / IMEI-required product
    if (productNeedsImei(product)) {
      setImeiPicker({ product });
      return;
    }

    // Standard product with stock check
    if (product.stock <= 0) {
      toast.error(`${product.name}: stock nahi hai`);
      return;
    }
    addStandardItem(product, null);
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    if (!variantPicker) return;
    const { product } = variantPicker;

    // Carpet variant → open roll picker
    if (isCarpetProduct(product)) {
      setCarpetRollPicker({ product, variant });
      setVariantPicker(null);
      return;
    }

    // Mobile variant → open IMEI picker
    if (productNeedsImei(product)) {
      setImeiPicker({ product, variant });
      setVariantPicker(null);
      return;
    }

    // Standard variant
    if (variant.stock <= 0) {
      toast.error('Variant ka stock nahi hai');
      return;
    }
    addStandardItem(product, variant);
    setVariantPicker(null);
  };

  // ─── Add handlers for each item type ───────────────────
  const addStandardItem = (product: Product, variant: ProductVariant | null) => {
    setCart((prev) => [
      ...prev,
      {
        cartLineId: cartLineId(),
        productId: product.id,
        variantId: variant?.id,
        productName: product.name,
        variantName: variant?.name,
        variantImageUrl: variant?.imageUrl ?? undefined,
        variantColorHex: variant?.colorHex ?? undefined,
        quantity: 1,
        price: variant?.price ?? product.price,
        costPrice: variant?.costPrice ?? product.costPrice ?? 0,
        lineDiscount: 0,
        unit: variant?.unit ?? product.unit,
        stockDisplay: `Stock: ${variant?.stock ?? product.stock} ${variant?.unit ?? product.unit}`,
      },
    ]);
    toast.success(`${product.name} added`);
  };

  const handleCarpetRollConfirm = (data: {
    roll: any;
    customerWidthFt: number;
    lengthFt: number;
    lengthInch?: number;
    lengthReal?: number;
    cutSqft: number;
    pricePerSqft: number;
    totalPrice: number;
    createLeftover: boolean;
    isCustomRate?: boolean;
    originalRate?: number;
  }) => {
    if (!carpetRollPicker) return;
    const { product, variant } = carpetRollPicker;
    const { roll } = data;

    const lenInchPart = (data.lengthInch ?? 0) > 0 ? ` ${data.lengthInch}in` : '';
    let note = `Cut from ${roll.rollNumber}: ${data.customerWidthFt}ft × ${data.lengthFt}ft${lenInchPart} = ${data.cutSqft.toFixed(2)} sqft`;
    if (data.isCustomRate && data.originalRate && data.originalRate !== data.pricePerSqft) {
      note += ` @ Rs ${data.pricePerSqft.toFixed(2)}/sqft`;
    }

    setCart((prev) => [
      ...prev,
      {
        cartLineId: cartLineId(),
        productId: product.id,
        variantId: variant?.id,
        rollId: roll.id,
        productName: product.name,
        variantName: variant?.name,
        variantImageUrl: variant?.imageUrl ?? undefined,
        variantColorHex: variant?.colorHex ?? undefined,
        rollNumber: roll.rollNumber,
        cutWidthFt: data.customerWidthFt,
        cutLengthFt: data.lengthFt,
        cutLengthInch: data.lengthInch ?? 0,
        cutSqft: data.cutSqft,
        quantity: data.cutSqft,
        price: data.pricePerSqft,
        costPrice: roll.costPerSqft ?? 0,
        lineDiscount: 0,
        unit: product.unit,
        note,
      },
    ]);

    toast.success(`${roll.rollNumber} se ${data.cutSqft.toFixed(2)} sqft reserved`);
    setCarpetRollPicker(null);
  };

  const handleCutPieceSelect = (piece: any) => {
    if (!cutPiecePicker) return;
    const { product, variant } = cutPiecePicker;

    setCart((prev) => [
      ...prev,
      {
        cartLineId: cartLineId(),
        productId: product.id,
        variantId: variant?.id,
        cutPieceId: piece.id,
        productName: product.name,
        variantName: variant?.name,
        variantImageUrl: variant?.imageUrl ?? undefined,
        variantColorHex: variant?.colorHex ?? undefined,
        cutPieceCode: piece.pieceCode,
        quantity: piece.totalSqft,
        price: piece.salePrice / Math.max(piece.totalSqft, 0.01),
        costPrice: 0,
        lineDiscount: 0,
        unit: product.unit,
        note: `Cut piece ${piece.pieceCode} • ${piece.widthFt}ft × ${piece.lengthFt}ft`,
      },
    ]);

    toast.success(`Cut piece ${piece.pieceCode} reserved`);
    setCutPiecePicker(null);
  };

  const handleImeiSelect = (imei: ProductImei) => {
    if (!imeiPicker) return;
    const { product, variant } = imeiPicker;

    setCart((prev) => [
      ...prev,
      {
        cartLineId: cartLineId(),
        productId: product.id,
        variantId: variant?.id,
        imeiId: imei.id,
        productName: product.name,
        variantName: variant?.name,
        variantImageUrl: variant?.imageUrl ?? undefined,
        variantColorHex: variant?.colorHex ?? undefined,
        imeiNumber: imei.imei1,
        quantity: 1,
        price: variant?.price ?? product.price,
        costPrice: imei.costPrice ?? variant?.costPrice ?? product.costPrice ?? 0,
        lineDiscount: 0,
        unit: variant?.unit ?? product.unit,
        note: `IMEI: ${imei.imei1}`,
      },
    ]);

    toast.success(`IMEI ${imei.imei1} reserved`);
    setImeiPicker(null);
  };

  const updateItem = (id: string, patch: Partial<CartItem>) => {
    setCart((prev) => prev.map((i) => (i.cartLineId === id ? { ...i, ...patch } : i)));
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((i) => i.cartLineId !== id));
  };

  const handleSubmit = () => {
    if (!customerId) {
      toast.error('Pehle customer select karein');
      return;
    }
    if (cart.length === 0) {
      toast.error('Kam se kam 1 item add karein');
      return;
    }
    if (!currentShopId) {
      toast.error('Shop select karein');
      return;
    }
    if (advance > total) {
      toast.error('Advance total se zyada nahi ho sakti');
      return;
    }

    createBookingMutation.mutate({
      shopId: currentShopId,
      customerId,
      expectedPickupAt: expectedPickupAt ? new Date(expectedPickupAt).toISOString() : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      discount: Number(discount) || 0,
      initialAdvance: advance,
      paymentMethod,
      serviceCharges: serviceCharges.length > 0 ? serviceCharges : undefined,
      notes: notes.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
      items: cart.map((c) => ({
        productId: c.productId,
        variantId: c.variantId,
        imeiId: c.imeiId,
        rollId: c.rollId,
        cutPieceId: c.cutPieceId,
        quantity: c.quantity,
        price: c.price,
        costPrice: c.costPrice,
        lineDiscount: c.lineDiscount,
        cutWidthFt: c.cutWidthFt,
        cutLengthFt: c.cutLengthFt,
        cutLengthInch: c.cutLengthInch,
        cutSqft: c.cutSqft,
        note: c.note,
        internalNote: c.internalNote,
      })),
    });
  };

  // Get carpet-eligible products (for "Quick Cut Pieces" button)
  const carpetProductsWithPieces = useMemo(() => {
    if (!isCarpetBusiness) return [];
    return products.filter(isCarpetProduct);
  }, [products, isCarpetBusiness]);

  return (
    <>
      {/* ═══ PICKERS ═══ */}
      {variantPicker && (
        <VariantPicker
          product={variantPicker.product}
          variants={variantPicker.variants}
          onSelect={handleVariantSelect}
          onClose={() => setVariantPicker(null)}
          ignoreStock={isCarpetProduct(variantPicker.product)}
        />
      )}

      {carpetRollPicker && (
        <CarpetRollPicker
          product={carpetRollPicker.product}
          variant={carpetRollPicker.variant}
          onConfirm={handleCarpetRollConfirm}
          onClose={() => setCarpetRollPicker(null)}
        />
      )}

      {cutPiecePicker && (
        <CarpetCutPiecePicker
          product={cutPiecePicker.product}
          variant={cutPiecePicker.variant}
          onSelect={handleCutPieceSelect}
          onClose={() => setCutPiecePicker(null)}
        />
      )}

      {imeiPicker && (
        <ImeiPickerModal
          productId={imeiPicker.product.id}
          productName={imeiPicker.product.name}
          variantId={imeiPicker.variant?.id}
          variantName={imeiPicker.variant?.name}
          excludeIds={cart.filter((c) => c.imeiId).map((c) => c.imeiId!)}
          onSelect={handleImeiSelect}
          onClose={() => setImeiPicker(null)}
        />
      )}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 flex items-center justify-between">
              <h3 className="font-extrabold text-lg inline-flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> Quick Add Customer
              </h3>
              <button onClick={() => setShowCustomerAdd(false)} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <Input
                label="Name *"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer name"
              />
              <Input
                label="Phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XXXXXXXXX"
              />
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  if (!newCustomer.name.trim()) return toast.error('Name zaroori hai');
                  createCustomerMutation.mutate({
                    name: newCustomer.name.trim(),
                    phone: newCustomer.phone.trim() || undefined,
                  });
                }}
                loading={createCustomerMutation.isPending}
              >
                Add Customer
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link to="/bookings" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 font-bold">
            <ArrowLeft className="h-4 w-4" /> Back to Bookings
          </Link>
        </div>

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-white p-6 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold">
                <BookmarkPlus className="h-3.5 w-3.5 text-amber-300" />
                New Booking
                {isCarpetBusiness && <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/30 text-[10px] font-extrabold uppercase">🧶 Carpet</span>}
                {isMobileBusiness && <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-500/30 text-[10px] font-extrabold uppercase">📱 Mobile</span>}
              </div>
              <h1 className="mt-3 text-3xl font-extrabold">Create Booking / Advance</h1>
              <p className="mt-2 text-sm text-white/80">
                Customer advance de raha hai — items reserve honge, delivery pe sale complete hogi
              </p>
            </div>

            {/* Quick Cut Pieces button (carpet only) */}
            {isCarpetBusiness && carpetProductsWithPieces.length > 0 && (
              <button
                onClick={() => setCutPiecePicker({ product: carpetProductsWithPieces[0] })}
                className="h-10 px-4 rounded-xl bg-violet-500/30 hover:bg-violet-500/50 backdrop-blur text-white text-sm font-extrabold inline-flex items-center gap-2 border border-violet-300/40 shadow-md transition"
              >
                <Scissors className="h-4 w-4" /> Cut Pieces
              </button>
            )}
          </div>
        </section>

        <div className="grid xl:grid-cols-[1fr_400px] gap-5">
          {/* LEFT: Form */}
          <div className="space-y-5">
            {/* Customer */}
            <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-slate-900 inline-flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Customer *
                </h3>
                <button
                  onClick={() => setShowCustomerAdd(true)}
                  className="text-xs font-extrabold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  <UserPlus className="h-3 w-3" /> Quick Add
                </button>
              </div>

              {selectedCustomer ? (
                <div className="rounded-2xl bg-blue-50 border-2 border-blue-300 p-3 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center font-extrabold text-lg shadow">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900">{selectedCustomer.name}</div>
                    {selectedCustomer.phone && (
                      <div className="text-xs text-slate-600 inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {selectedCustomer.phone}
                      </div>
                    )}
                    {selectedCustomer.balance > 0 && (
                      <div className="text-xs font-extrabold text-amber-700 mt-0.5">
                        Existing udhaar: {formatPKR(selectedCustomer.balance)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setCustomerId(''); setCustomerSearch(''); }}
                    className="h-8 w-8 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center border border-slate-200 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold focus:outline-none focus:border-blue-500"
                      placeholder="Search customer by name or phone..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                  </div>
                  {filteredCustomers.length > 0 && (
                    <div className="mt-2 rounded-xl border border-slate-200 max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setCustomerId(c.id)}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2"
                        >
                          <div className="h-8 w-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-extrabold text-xs">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate">{c.name}</div>
                            {c.phone && <div className="text-[10px] text-slate-500">{c.phone}</div>}
                          </div>
                          {c.balance > 0 && (
                            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                              Rs {formatPKR(c.balance)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Products */}
            <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
              <h3 className="font-extrabold text-slate-900 mb-3 inline-flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" />
                Items to Reserve
              </h3>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                  placeholder="Search product by name or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
              {productSearch && filteredProducts.length > 0 && (
                <div className="mt-2 rounded-xl border border-slate-200 max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const isCarpet = isCarpetProduct(p);
                    const carpetData = isCarpet ? carpetSummaryMap.get(p.id) : undefined;
                    const carpetSqft = carpetData?.totalSqft ?? 0;
                    const rollCount = carpetData?.rollCount ?? 0;
                    const outOfStock = isCarpet ? carpetSqft <= 0 : p.stock <= 0;
                    const needsImei = productNeedsImei(p);

                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          addProductToCart(p);
                          setProductSearch('');
                        }}
                        disabled={outOfStock}
                        className={`w-full px-3 py-2 text-left hover:bg-emerald-50 flex items-center gap-2 ${
                          outOfStock ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <div className="h-9 w-9 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                          {p.images?.[0]?.url ? (
                            <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate flex items-center gap-1">
                            {p.name}
                            {isCarpet && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded">
                                <Layers className="h-2 w-2" /> ROLLS
                              </span>
                            )}
                            {needsImei && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold bg-blue-100 text-blue-700 px-1 py-0.5 rounded">
                                <Smartphone className="h-2 w-2" /> IMEI
                              </span>
                            )}
                            {p.hasVariants && !isCarpet && (
                              <span className="text-[9px] font-extrabold bg-violet-100 text-violet-700 px-1 py-0.5 rounded">VAR</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {formatPKR(p.price)}
                            {isCarpet ? (
                              <span className={carpetSqft > 0 ? 'text-emerald-700 ml-1 font-bold' : 'text-rose-700 ml-1 font-bold'}>
                                • {carpetSqft.toFixed(0)} {p.unit} ({rollCount} rolls)
                              </span>
                            ) : (
                              <span className={p.stock > 0 ? 'text-slate-600 ml-1' : 'text-rose-700 ml-1 font-bold'}>
                                • Stock: {p.stock} {p.unit}
                              </span>
                            )}
                          </div>
                        </div>
                        {outOfStock && (
                          <span className="text-[9px] font-extrabold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                            OUT
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {cart.length === 0 ? (
                <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-500">Koi item nahi</p>
                  <p className="text-xs text-slate-400 mt-1">Search karo aur item add karo</p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {cart.map((item) => (
                    <div
                      key={item.cartLineId}
                      className={`rounded-xl border-2 p-3 hover:shadow-sm transition ${
                        item.rollId ? 'border-emerald-200 bg-emerald-50/30' :
                        item.cutPieceId ? 'border-violet-200 bg-violet-50/30' :
                        item.imeiId ? 'border-blue-200 bg-blue-50/30' :
                        'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                          {item.variantImageUrl ? (
                            <img src={item.variantImageUrl} alt={item.productName} className="h-full w-full object-cover" />
                          ) : item.variantColorHex ? (
                            <div className="h-full w-full" style={{ backgroundColor: item.variantColorHex }} />
                          ) : (
                            <Package className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm text-slate-900 truncate">{item.productName}</div>
                          {item.variantName && (
                            <div className="text-[10px] font-extrabold text-violet-700">{item.variantName}</div>
                          )}
                          {/* Type badges */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.rollNumber && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-extrabold">
                                <Layers className="h-2 w-2" />
                                {item.rollNumber}
                                {item.cutWidthFt && item.cutLengthFt && (
                                  <span className="opacity-80">• {item.cutWidthFt}×{item.cutLengthFt}ft</span>
                                )}
                              </span>
                            )}
                            {item.cutPieceCode && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[9px] font-extrabold">
                                <Scissors className="h-2 w-2" /> {item.cutPieceCode}
                              </span>
                            )}
                            {item.imeiNumber && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[9px] font-extrabold font-mono">
                                <Smartphone className="h-2 w-2" /> {item.imeiNumber}
                              </span>
                            )}
                          </div>
                          {/* Editable fields — locked qty for reserved items */}
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div>
                              <label className="text-[9px] uppercase font-extrabold text-slate-600 block mb-0.5">
                                Qty ({item.unit}) {(item.rollId || item.cutPieceId || item.imeiId) && '🔒'}
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.cartLineId, { quantity: Number(e.target.value) || 0 })}
                                disabled={!!(item.rollId || item.cutPieceId || item.imeiId)}
                                className="h-8 w-full rounded-md border-2 border-slate-200 px-2 text-xs font-extrabold focus:outline-none focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-500"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-extrabold text-slate-600 block mb-0.5">
                                Rate (PKR) {item.rollId && '/ sqft'}
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => updateItem(item.cartLineId, { price: Number(e.target.value) || 0 })}
                                className="h-8 w-full rounded-md border-2 border-slate-200 px-2 text-xs font-extrabold focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-extrabold text-slate-600 block mb-0.5">Discount</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.lineDiscount ?? 0}
                                onChange={(e) => updateItem(item.cartLineId, { lineDiscount: Number(e.target.value) || 0 })}
                                className="h-8 w-full rounded-md border-2 border-slate-200 px-2 text-xs font-extrabold focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-emerald-700 tabular-nums">
                            {formatPKR(item.price * item.quantity - (item.lineDiscount ?? 0))}
                          </div>
                          <button
                            onClick={() => removeItem(item.cartLineId)}
                            className="mt-1 h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
              <h3 className="font-extrabold text-slate-900 inline-flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600" />
                Timeline
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Expected Pickup"
                  type="datetime-local"
                  value={expectedPickupAt}
                  onChange={(e) => setExpectedPickupAt(e.target.value)}
                  hint="Kab customer aae ga"
                />
                <Input
                  label="Auto-Cancel After"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  hint="Booking expire hone ki tareekh"
                />
              </div>
            </div>

            {/* Service charges */}
            {isCarpetBusiness && (
              <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
                <h3 className="font-extrabold text-slate-900 mb-3 inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Service Charges
                </h3>
                <ServiceChargesPanel charges={serviceCharges} onChange={setServiceCharges} />
              </div>
            )}

            {/* Notes */}
            <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
              <h3 className="font-extrabold text-slate-900">Notes</h3>
              <div>
                <label className="text-[10px] font-extrabold uppercase text-amber-700 mb-1 block">
                  Customer Note (receipt pe)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder='"Yeh maal special order hai, kal delivery"'
                  className="w-full rounded-lg border-2 border-amber-200 bg-amber-50/40 px-3 py-2 text-sm font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-700 mb-1 block">
                  Internal Note (team-only)
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                  placeholder='"VIP customer, priority handle karna"'
                  className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Summary + Advance */}
          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            {/* Totals */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-blue-900 text-white p-5 shadow-xl">
              <div className="text-xs uppercase tracking-wider font-extrabold text-white/70 mb-3 inline-flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Booking Summary
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Subtotal</span>
                  <span className="font-bold tabular-nums">{formatPKR(subtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Discount</span>
                    <span className="font-bold tabular-nums">-{formatPKR(totalDiscount)}</span>
                  </div>
                )}
                {svcTotal > 0 && (
                  <div className="flex justify-between text-orange-300">
                    <span>Service Charges</span>
                    <span className="font-bold tabular-nums">+{formatPKR(svcTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-white/15 text-lg">
                  <span className="font-bold">TOTAL</span>
                  <span className="font-extrabold tabular-nums">{formatPKR(total)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/15 space-y-3">
                <Input
                  label="Global Discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>

            {/* Advance payment */}
            <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 p-5 shadow-sm">
              <div className="text-xs uppercase tracking-wider font-extrabold text-emerald-700 mb-3 inline-flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                Advance Payment (Optional)
              </div>
              <div className="space-y-3">
                <Input
                  label="Advance Amount"
                  type="number"
                  value={initialAdvance}
                  onChange={(e) => setInitialAdvance(e.target.value)}
                  placeholder="0"
                  hint={`Balance due after advance: ${formatPKR(balance)}`}
                />
                {advance > 0 && (
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="h-10 w-full rounded-lg border-2 border-emerald-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="JAZZCASH">JazzCash</option>
                      <option value="EASYPAISA">EasyPaisa</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Quick summary */}
            <div className="rounded-2xl bg-white border-2 border-slate-200 p-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Advance</div>
                  <div className="text-lg font-extrabold text-emerald-700 tabular-nums">
                    {formatPKR(advance)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Balance</div>
                  <div className="text-lg font-extrabold text-amber-700 tabular-nums">
                    {formatPKR(balance)}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              loading={createBookingMutation.isPending}
              disabled={!customerId || cart.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-lg shadow-blue-500/30 text-base py-3"
            >
              <BookmarkPlus className="h-5 w-5" />
              Create Booking {formatPKR(total)}
            </Button>
          </aside>
        </div>
      </div>
    </>
  );
}
