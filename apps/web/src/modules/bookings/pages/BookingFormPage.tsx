import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft, User, Phone, Search, Trash2, Package,
  Calendar, Wallet, BookmarkPlus, X, DollarSign,
  Sparkles, AlertTriangle, UserPlus, Layers, Scissors, Smartphone,
  GraduationCap, CheckCircle2, Percent, Zap, ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import { bookingsApi, type CreateBookingItem } from '@modules/bookings/api/bookings.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { offlineProductsApi as productsApi } from '@core/lib/offline/offlineProducts';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { useBusinessFeatures } from '@core/hooks/useBusinessFeatures';
import { ServiceChargesPanel } from '@modules/pos/components/ServiceChargesPanel';
import { CarpetRollPicker } from '@/industries/carpet/components/pos-extensions/CarpetRollPicker';
import { CarpetCutPiecePicker } from '@/industries/carpet/components/pos-extensions/CarpetCutPiecePicker';
import { ImeiPickerModal } from '@industries/mobile/components/ImeiPickerModal';
import { VariantPicker } from '@modules/pos/components/VariantPicker';
import { useOfflineCarpetSummary } from '@industries/carpet/hooks/useOfflineCarpetSummary';
import type { ServiceChargeItem, PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { Product } from '@modules/inventory/products/api/products.api';
import type { ProductVariant } from '@modules/inventory/products/api/product-variants.api';
import type { ProductImei } from '@industries/mobile/api/imei.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA BOOKING FORM — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 Universal (jeweler, tailor, mobile, carpet, electronics)
   🌙 Dark mode complete
   🎓 Teacher modal — form usage guide
   ⌨️  ↑↓ Enter in dropdowns • Ctrl+Enter submit • Esc close
   ⚠️ Smart advance validations & suggestions
   💡 Quick 10/25/50/100% advance chips
   ═════════════════════════════════════════════════════════════ */

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);
const MOBILE_KEYWORDS = ['mobile', 'phone', 'smartphone', 'iphone', 'samsung', 'oppo', 'vivo', 'realme', 'xiaomi', 'tecno', 'infinix'];

interface CartItem extends CreateBookingItem {
  cartLineId: string;
  productName: string;
  variantName?: string;
  variantImageUrl?: string;
  variantColorHex?: string;
  unit: string;
  rollNumber?: string;
  cutPieceCode?: string;
  imeiNumber?: string;
  stockDisplay?: string;
}

const cartLineId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toLocalDateTime = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

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
  const [customerHighlight, setCustomerHighlight] = useState(0);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [productSearch, setProductSearch] = useState('');
  const [productHighlight, setProductHighlight] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [expectedPickupAt, setExpectedPickupAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [discount, setDiscount] = useState('');
  const [initialAdvance, setInitialAdvance] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [serviceCharges, setServiceCharges] = useState<ServiceChargeItem[]>([]);
  const [showTeacher, setShowTeacher] = useState(false);

  const customerInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

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

  const isCarpetProduct = useCallback(
    (p: Product) => isCarpetBusiness && CARPET_UNITS.has(p.unit),
    [isCarpetBusiness],
  );

  const productNeedsImei = useCallback(
    (p: Product) => {
      if (!features?.imei) return false;
      const name = p.name.toLowerCase();
      const category = (p.category?.name || '').toLowerCase();
      return MOBILE_KEYWORDS.some((kw) => name.includes(kw) || category.includes(kw));
    },
    [features?.imei],
  );

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

  useEffect(() => setCustomerHighlight(0), [customerSearch]);
  useEffect(() => setProductHighlight(0), [productSearch]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Totals
  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);
  const lineDiscountTotal = useMemo(() => cart.reduce((sum, i) => sum + (i.lineDiscount ?? 0), 0), [cart]);
  const totalDiscount = (Number(discount) || 0) + lineDiscountTotal;
  const svcTotal = useMemo(() => serviceCharges.reduce((s, c) => s + Number(c.amount || 0), 0), [serviceCharges]);
  const total = Math.max(subtotal - totalDiscount + svcTotal, 0);
  const advance = Number(initialAdvance) || 0;
  const balance = Math.max(total - advance, 0);
  const advancePercent = total > 0 ? (advance / total) * 100 : 0;

  const totalCost = useMemo(() => cart.reduce((s, i) => s + (i.costPrice ?? 0) * i.quantity, 0), [cart]);
  const grossProfit = total - totalCost - svcTotal;
  const profitMargin = total > 0 ? (grossProfit / total) * 100 : 0;

  // Validations
  const validations = useMemo(() => {
    const issues: string[] = [];
    const warnings: string[] = [];

    if (advance > total && total > 0) issues.push('Advance total se zyada nahi ho sakti');
    if (Number(discount) > subtotal) issues.push('Discount subtotal se zyada nahi ho sakta');

    if (expectedPickupAt) {
      const pickup = new Date(expectedPickupAt);
      if (pickup.getTime() < Date.now()) warnings.push('Pickup date maazi (past) me hai');
    }
    if (expiresAt && expectedPickupAt) {
      if (new Date(expiresAt) < new Date(expectedPickupAt)) {
        warnings.push('Expire date pickup ke pehle nahi honi chahiye');
      }
    }
    if (cart.length > 0 && advance === 0 && expectedPickupAt === '') {
      warnings.push('Tip: advance ya pickup date me se ek zaroor rakho');
    }
    if (grossProfit < 0 && total > 0 && totalCost > 0) {
      warnings.push(`⚠️ Loss booking: cost ${formatPKR(totalCost)} > sale ${formatPKR(total)}`);
    }

    return { issues, warnings };
  }, [advance, total, discount, subtotal, expectedPickupAt, expiresAt, cart.length, grossProfit, totalCost]);

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

    if (isCarpet) {
      const summary = carpetSummaryMap.get(product.id);
      if (!summary || summary.totalSqft <= 0) {
        toast.error(`${product.name}: koi active roll nahi hai`);
        return;
      }
      if (product.hasVariants) {
        try {
          const variants = await productVariantsApi.list(product.id);
          const active = variants.filter((v) => v.isActive);
          if (active.length === 0) return toast.error('No active variants for this carpet');
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

    if (product.hasVariants) {
      try {
        const variants = await productVariantsApi.list(product.id);
        const active = variants.filter((v) => v.isActive);
        if (active.length === 0) return toast.error('No active variants');
        setVariantPicker({ product, variants });
        return;
      } catch {
        toast.error('Failed to load variants');
        return;
      }
    }

    if (productNeedsImei(product)) {
      setImeiPicker({ product });
      return;
    }

    if (product.stock <= 0) {
      toast.error(`${product.name}: stock nahi hai`);
      return;
    }
    addStandardItem(product, null);
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    if (!variantPicker) return;
    const { product } = variantPicker;

    if (isCarpetProduct(product)) {
      setCarpetRollPicker({ product, variant });
      setVariantPicker(null);
      return;
    }
    if (productNeedsImei(product)) {
      setImeiPicker({ product, variant });
      setVariantPicker(null);
      return;
    }
    if (variant.stock <= 0) {
      toast.error('Variant ka stock nahi hai');
      return;
    }
    addStandardItem(product, variant);
    setVariantPicker(null);
  };

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

  const handleCarpetRollConfirm = (data: any) => {
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

  const applyAdvancePercent = (pct: number) => {
    if (total <= 0) return toast.error('Pehle items add karo');
    setInitialAdvance(String(Math.round(total * pct) / 1));
  };

  const setPickupPreset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(12, 0, 0, 0);
    setExpectedPickupAt(toLocalDateTime(d));
  };

  const handleSubmit = () => {
    if (!customerId) return toast.error('Pehle customer select karein');
    if (cart.length === 0) return toast.error('Kam se kam 1 item add karein');
    if (!currentShopId) return toast.error('Shop select karein');
    if (validations.issues.length > 0) return toast.error(validations.issues[0]);

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

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (showCustomerAdd) return setShowCustomerAdd(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showCustomerAdd, customerId, cart, currentShopId, validations.issues.length]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = (showTeacher || showCustomerAdd) ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher, showCustomerAdd]);

  // Keyboard nav — customer dropdown
  const onCustomerKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filteredCustomers.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCustomerHighlight((h) => Math.min(h + 1, filteredCustomers.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCustomerHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const c = filteredCustomers[customerHighlight];
      if (c) {
        setCustomerId(c.id);
        setCustomerSearch('');
        setTimeout(() => productInputRef.current?.focus(), 100);
      }
    }
  };

  // Keyboard nav — product dropdown
  const onProductKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!productSearch || !filteredProducts.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setProductHighlight((h) => Math.min(h + 1, filteredProducts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setProductHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = filteredProducts[productHighlight];
      if (p) {
        addProductToCart(p);
        setProductSearch('');
      }
    }
  };

  const carpetProductsWithPieces = useMemo(() => {
    if (!isCarpetBusiness) return [];
    return products.filter(isCarpetProduct);
  }, [products, isCarpetBusiness, isCarpetProduct]);

  const hasIssues = validations.issues.length > 0;

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

      {showTeacher && <BookingFormTeacher onClose={() => setShowTeacher(false)} />}

      {showCustomerAdd && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCustomerAdd(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
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
                autoFocus
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

      <div className="space-y-5 pb-20">
        {/* Back link */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link
            to="/bookings"
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Bookings
          </Link>
          <button
            onClick={() => setShowTeacher(true)}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 border-2 border-amber-300 dark:border-amber-500/40 px-3 py-1.5 rounded-xl transition"
          >
            <GraduationCap className="h-3.5 w-3.5" /> Guide
          </button>
        </div>

        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-900 text-white p-6 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/25">
                <BookmarkPlus className="h-3.5 w-3.5 text-amber-300" />
                New Booking
                {isCarpetBusiness && <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/30 text-[10px] font-extrabold uppercase">🧶 Carpet</span>}
                {isMobileBusiness && <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-500/30 text-[10px] font-extrabold uppercase">📱 Mobile</span>}
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold">Create Booking / Advance</h1>
              <p className="mt-2 text-sm text-white/80 max-w-lg">
                Customer advance de raha hai — items reserve honge, delivery pe sale complete hogi
              </p>
            </div>

            {isCarpetBusiness && carpetProductsWithPieces.length > 0 && (
              <button
                onClick={() => setCutPiecePicker({ product: carpetProductsWithPieces[0] })}
                className="h-10 px-4 rounded-xl bg-violet-500/30 hover:bg-violet-500/50 backdrop-blur text-white text-sm font-extrabold inline-flex items-center gap-2 border border-violet-300/40 shadow-md transition"
              >
                <Scissors className="h-4 w-4" /> Cut Pieces
              </button>
            )}
          </div>

          <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
            <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd><span className="text-white/60">Submit</span>
            <span className="text-white/30 mx-1">•</span>
            <Kbd>↑</Kbd><Kbd>↓</Kbd><Kbd>Enter</Kbd><span className="text-white/60">Dropdown nav</span>
            <span className="text-white/30 mx-1">•</span>
            <Kbd>Esc</Kbd><span className="text-white/60">Close</span>
          </div>
        </section>

        {/* Issues banner */}
        {(hasIssues || validations.warnings.length > 0) && (
          <div className={`rounded-2xl border-2 p-3 ${
            hasIssues
              ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40'
              : 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40'
          }`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${hasIssues ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`} />
              <div className="text-xs font-bold space-y-0.5">
                {validations.issues.map((m, i) => (
                  <div key={`e${i}`} className="text-rose-800 dark:text-rose-200">❌ {m}</div>
                ))}
                {validations.warnings.map((m, i) => (
                  <div key={`w${i}`} className="text-amber-800 dark:text-amber-200">⚠️ {m}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid xl:grid-cols-[1fr_400px] gap-5">
          {/* LEFT */}
          <div className="space-y-5">
            {/* Customer */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Customer <span className="text-rose-500">*</span>
                </h3>
                <button
                  onClick={() => setShowCustomerAdd(true)}
                  className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1"
                >
                  <UserPlus className="h-3 w-3" /> Quick Add
                </button>
              </div>

              {selectedCustomer ? (
                <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-300 dark:border-blue-500/40 p-3 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center font-extrabold text-lg shadow">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 dark:text-white">{selectedCustomer.name}</div>
                    {selectedCustomer.phone && (
                      <div className="text-xs text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {selectedCustomer.phone}
                      </div>
                    )}
                    {selectedCustomer.balance > 0 && (
                      <div className="text-xs font-extrabold text-amber-700 dark:text-amber-300 mt-0.5">
                        Existing udhaar: {formatPKR(selectedCustomer.balance)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setCustomerId(''); setCustomerSearch(''); setTimeout(() => customerInputRef.current?.focus(), 50); }}
                    className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-300 hover:text-rose-600 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={customerInputRef}
                      className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                      placeholder="Search customer by name or phone... (↑↓ Enter)"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onKeyDown={onCustomerKey}
                      autoFocus
                    />
                  </div>
                  {filteredCustomers.length > 0 && (
                    <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                      {filteredCustomers.map((c, idx) => (
                        <button
                          key={c.id}
                          onClick={() => { setCustomerId(c.id); setCustomerSearch(''); }}
                          onMouseEnter={() => setCustomerHighlight(idx)}
                          className={`w-full px-3 py-2 text-left flex items-center gap-2 transition ${
                            idx === customerHighlight
                              ? 'bg-blue-100 dark:bg-blue-500/20'
                              : 'hover:bg-blue-50 dark:hover:bg-blue-500/10'
                          }`}
                        >
                          <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center font-extrabold text-xs">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate text-slate-900 dark:text-white">{c.name}</div>
                            {c.phone && <div className="text-[10px] text-slate-500 dark:text-slate-400">{c.phone}</div>}
                          </div>
                          {c.balance > 0 && (
                            <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/20 px-1.5 py-0.5 rounded">
                              {formatPKR(c.balance)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {customerSearch && filteredCustomers.length === 0 && (
                    <button
                      onClick={() => {
                        setNewCustomer({ name: customerSearch, phone: '' });
                        setShowCustomerAdd(true);
                      }}
                      className="mt-2 w-full h-10 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-500/40 bg-blue-50/50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-extrabold inline-flex items-center justify-center gap-2 transition"
                    >
                      <UserPlus className="h-4 w-4" /> "{customerSearch}" ko add karo
                    </button>
                  )}
                </div>
              )}
            </Card>

            {/* Products */}
            <Card>
              <h3 className="font-extrabold text-slate-900 dark:text-white mb-3 inline-flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Items to Reserve <span className="text-rose-500">*</span>
                {cart.length > 0 && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold">
                    {cart.length} item{cart.length !== 1 ? 's' : ''}
                  </span>
                )}
              </h3>

              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={productInputRef}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400"
                  placeholder="Search product by name or SKU... (↑↓ Enter)"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onKeyDown={onProductKey}
                />
              </div>

              {productSearch && filteredProducts.length > 0 && (
                <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                  {filteredProducts.map((p, idx) => {
                    const isCarpet = isCarpetProduct(p);
                    const carpetData = isCarpet ? carpetSummaryMap.get(p.id) : undefined;
                    const carpetSqft = carpetData?.totalSqft ?? 0;
                    const rollCount = carpetData?.rollCount ?? 0;
                    const outOfStock = isCarpet ? carpetSqft <= 0 : p.stock <= 0;
                    const needsImei = productNeedsImei(p);

                    return (
                      <button
                        key={p.id}
                        onClick={() => { addProductToCart(p); setProductSearch(''); }}
                        onMouseEnter={() => setProductHighlight(idx)}
                        disabled={outOfStock}
                        className={`w-full px-3 py-2 text-left flex items-center gap-2 transition ${
                          outOfStock ? 'opacity-50 cursor-not-allowed' : ''
                        } ${
                          idx === productHighlight && !outOfStock
                            ? 'bg-emerald-100 dark:bg-emerald-500/20'
                            : 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                        }`}
                      >
                        <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                          {p.images?.[0]?.url ? (
                            <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate flex items-center gap-1 text-slate-900 dark:text-white">
                            {p.name}
                            {isCarpet && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded">
                                <Layers className="h-2 w-2" /> ROLLS
                              </span>
                            )}
                            {needsImei && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded">
                                <Smartphone className="h-2 w-2" /> IMEI
                              </span>
                            )}
                            {p.hasVariants && !isCarpet && (
                              <span className="text-[9px] font-extrabold bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 px-1 py-0.5 rounded">VAR</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {formatPKR(p.price)}
                            {isCarpet ? (
                              <span className={carpetSqft > 0 ? 'text-emerald-700 dark:text-emerald-400 ml-1 font-bold' : 'text-rose-700 dark:text-rose-400 ml-1 font-bold'}>
                                • {carpetSqft.toFixed(0)} {p.unit} ({rollCount} rolls)
                              </span>
                            ) : (
                              <span className={p.stock > 0 ? 'text-slate-600 dark:text-slate-400 ml-1' : 'text-rose-700 dark:text-rose-400 ml-1 font-bold'}>
                                • Stock: {p.stock} {p.unit}
                              </span>
                            )}
                          </div>
                        </div>
                        {outOfStock && (
                          <span className="text-[9px] font-extrabold bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded">
                            OUT
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {cart.length === 0 ? (
                <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                  <ShoppingCart className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Koi item nahi</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Search karo aur item add karo</p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {cart.map((item) => (
                    <div
                      key={item.cartLineId}
                      className={`rounded-xl border-2 p-3 hover:shadow-sm transition ${
                        item.rollId ? 'border-emerald-200 dark:border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-500/5' :
                        item.cutPieceId ? 'border-violet-200 dark:border-violet-500/40 bg-violet-50/30 dark:bg-violet-500/5' :
                        item.imeiId ? 'border-blue-200 dark:border-blue-500/40 bg-blue-50/30 dark:bg-blue-500/5' :
                        'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                          {item.variantImageUrl ? (
                            <img src={item.variantImageUrl} alt={item.productName} className="h-full w-full object-cover" />
                          ) : item.variantColorHex ? (
                            <div className="h-full w-full" style={{ backgroundColor: item.variantColorHex }} />
                          ) : (
                            <Package className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{item.productName}</div>
                          {item.variantName && (
                            <div className="text-[10px] font-extrabold text-violet-700 dark:text-violet-300">{item.variantName}</div>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.rollNumber && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[9px] font-extrabold">
                                <Layers className="h-2 w-2" />
                                {item.rollNumber}
                                {item.cutWidthFt && item.cutLengthFt && (
                                  <span className="opacity-80">• {item.cutWidthFt}×{item.cutLengthFt}ft</span>
                                )}
                              </span>
                            )}
                            {item.cutPieceCode && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-100 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300 text-[9px] font-extrabold">
                                <Scissors className="h-2 w-2" /> {item.cutPieceCode}
                              </span>
                            )}
                            {item.imeiNumber && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 text-[9px] font-extrabold font-mono">
                                <Smartphone className="h-2 w-2" /> {item.imeiNumber}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div>
                              <label className="text-[9px] uppercase font-extrabold text-slate-600 dark:text-slate-400 block mb-0.5">
                                Qty ({item.unit}) {(item.rollId || item.cutPieceId || item.imeiId) && '🔒'}
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.cartLineId, { quantity: Number(e.target.value) || 0 })}
                                disabled={!!(item.rollId || item.cutPieceId || item.imeiId)}
                                className="h-8 w-full rounded-md border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 disabled:bg-slate-50 dark:disabled:bg-slate-800/60 disabled:text-slate-500"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-extrabold text-slate-600 dark:text-slate-400 block mb-0.5">
                                Rate (PKR){item.rollId && ' /sqft'}
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => updateItem(item.cartLineId, { price: Number(e.target.value) || 0 })}
                                className="h-8 w-full rounded-md border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-extrabold text-slate-600 dark:text-slate-400 block mb-0.5">Discount</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.lineDiscount ?? 0}
                                onChange={(e) => updateItem(item.cartLineId, { lineDiscount: Number(e.target.value) || 0 })}
                                className="h-8 w-full rounded-md border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {formatPKR(item.price * item.quantity - (item.lineDiscount ?? 0))}
                          </div>
                          <button
                            onClick={() => removeItem(item.cartLineId)}
                            className="mt-1 h-7 w-7 rounded-lg bg-rose-50 dark:bg-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center transition"
                            title="Remove item"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Timeline */}
            <Card>
              <h3 className="font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Timeline
              </h3>

              {/* Pickup presets */}
              <div className="flex gap-1.5 flex-wrap mb-3">
                <PresetChip label="Aaj" onClick={() => setPickupPreset(0)} />
                <PresetChip label="Kal" onClick={() => setPickupPreset(1)} />
                <PresetChip label="3 din" onClick={() => setPickupPreset(3)} />
                <PresetChip label="1 hafta" onClick={() => setPickupPreset(7)} />
                <PresetChip label="15 din" onClick={() => setPickupPreset(15)} />
                <PresetChip label="1 mahina" onClick={() => setPickupPreset(30)} />
                {expectedPickupAt && (
                  <button
                    onClick={() => setExpectedPickupAt('')}
                    className="h-7 px-2.5 rounded-lg bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold inline-flex items-center gap-1 transition"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

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
            </Card>

            {/* Service charges */}
            {isCarpetBusiness && (
              <Card>
                <h3 className="font-extrabold text-slate-900 dark:text-white mb-3 inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Service Charges
                </h3>
                <ServiceChargesPanel charges={serviceCharges} onChange={setServiceCharges} />
              </Card>
            )}

            {/* Notes */}
            <Card>
              <h3 className="font-extrabold text-slate-900 dark:text-white mb-3">Notes</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-300 mb-1 block">
                    Customer Note (receipt pe dikhega)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder='"Yeh maal special order hai, kal delivery"'
                    className="w-full rounded-lg border-2 border-amber-200 dark:border-amber-500/40 bg-amber-50/40 dark:bg-amber-500/10 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-700 dark:text-slate-300 mb-1 block">
                    Internal Note (team-only, receipt pe nahi)
                  </label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={2}
                    placeholder='"VIP customer, priority handle karna"'
                    className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT — Summary */}
          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            {/* Totals */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-blue-900 dark:from-slate-950 dark:to-blue-950 text-white p-5 shadow-xl border border-white/10">
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

                {/* Profit hint */}
                {total > 0 && totalCost > 0 && (
                  <div className={`mt-2 pt-2 border-t border-white/10 flex justify-between text-[11px] font-bold ${
                    grossProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}>
                    <span>Profit ({profitMargin.toFixed(1)}%)</span>
                    <span className="tabular-nums">{formatPKR(grossProfit)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-white/15">
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
            <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-2 border-emerald-300 dark:border-emerald-500/40 p-5 shadow-sm">
              <div className="text-xs uppercase tracking-wider font-extrabold text-emerald-700 dark:text-emerald-300 mb-3 inline-flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                Advance Payment (Optional)
              </div>

              {/* Percent chips */}
              <div className="flex gap-1.5 flex-wrap mb-3">
                {[0.10, 0.25, 0.50, 1.0].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => applyAdvancePercent(pct)}
                    disabled={total <= 0}
                    className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border-2 border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold inline-flex items-center gap-1 disabled:opacity-40 transition"
                  >
                    <Percent className="h-2.5 w-2.5" /> {(pct * 100).toFixed(0)}%
                  </button>
                ))}
                {advance > 0 && (
                  <button
                    onClick={() => setInitialAdvance('')}
                    className="h-8 px-2.5 rounded-lg bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold inline-flex items-center gap-1 transition"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <Input
                  label="Advance Amount"
                  type="number"
                  value={initialAdvance}
                  onChange={(e) => setInitialAdvance(e.target.value)}
                  placeholder="0"
                  hint={total > 0 ? `${advancePercent.toFixed(1)}% • Balance: ${formatPKR(balance)}` : 'Pehle items add karo'}
                />
                {advance > 0 && (
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="h-10 w-full rounded-lg border-2 border-emerald-200 dark:border-emerald-500/40 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="CASH">💵 Cash</option>
                      <option value="CARD">💳 Card</option>
                      <option value="JAZZCASH">📱 JazzCash</option>
                      <option value="EASYPAISA">📱 EasyPaisa</option>
                      <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Quick summary */}
            <div className="rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-700 p-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Advance</div>
                  <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {formatPKR(advance)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Balance</div>
                  <div className="text-lg font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">
                    {formatPKR(balance)}
                  </div>
                </div>
              </div>

              {/* Advance progress bar */}
              {total > 0 && (
                <div className="mt-3">
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-300"
                      style={{ width: `${Math.min(advancePercent, 100)}%` }}
                    />
                  </div>
                  <div className="text-center text-[9px] font-extrabold text-slate-500 dark:text-slate-400 mt-1">
                    {advancePercent.toFixed(1)}% paid
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              loading={createBookingMutation.isPending}
              disabled={!customerId || cart.length === 0 || hasIssues}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-lg shadow-blue-500/30 text-base py-3 font-extrabold"
            >
              <BookmarkPlus className="h-5 w-5" />
              Create Booking · {formatPKR(total)}
            </Button>

            <div className="text-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <Kbd small>Ctrl</Kbd>+<Kbd small>Enter</Kbd> se bhi submit ho jayega
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ═════════════════════════════════════════════════════════════
   Helpers
   ═════════════════════════════════════════════════════════════ */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
      {children}
    </div>
  );
}

function PresetChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-7 px-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border-2 border-amber-200 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold transition"
    >
      {label}
    </button>
  );
}

function Kbd({ children, small }: { children: React.ReactNode; small?: boolean }) {
  return (
    <kbd
      className={`px-1.5 py-0.5 rounded font-mono font-bold shadow-sm ${
        small
          ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] border border-slate-300 dark:border-slate-600'
          : 'bg-white/15 border border-white/25 text-white text-[9px]'
      }`}
    >
      {children}
    </kbd>
  );
}

function BookingFormTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-blue-200 dark:border-blue-500/30 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/15 dark:to-indigo-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Booking Form — Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Booking form 4 steps:</strong> Customer → Items → Timeline → Advance. Har step optional
            hai except customer aur items.
          </p>

          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300 mb-2">
              💡 Pro Tips
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Tip><strong>↑↓ Enter</strong> — dropdown me tez selection</Tip>
              <Tip><strong>Percent chips</strong> — 10/25/50/100% advance ek click me</Tip>
              <Tip><strong>Timeline presets</strong> — "Kal", "1 hafta", "1 mahina"</Tip>
              <Tip><strong>Ctrl+Enter</strong> — form submit shortcut</Tip>
              <Tip><strong>Customer nahi mila</strong> — search me naam type karo, "Add" button dikhega</Tip>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 mb-2">
              🔒 Locked Items
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Tip><strong>Carpet roll cut</strong> — qty locked (roll piece se calculate hoti hai)</Tip>
              <Tip><strong>IMEI mobile</strong> — qty always 1 (specific piece reserved)</Tip>
              <Tip><strong>Cut piece</strong> — qty locked (physical piece hai)</Tip>
              <Tip>Rate aur discount har waqt edit ho sakti hai</Tip>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            💰 <strong>Advance = customer ka paisa aap ke paas</strong>. Delivery pe baqi milega. Cancel
            hone pe refund entry ban jati hai — sab record ho jata hai.
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 font-extrabold shadow-lg shadow-blue-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </Button>
        </div>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Zap className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}
