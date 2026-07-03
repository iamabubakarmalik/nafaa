import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Modal, Image, Platform,
  KeyboardAvoidingView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ArrowLeft, BookmarkPlus, User, Search, X, Plus, Trash2, Package,
  Calendar, Clock, Wallet, Sparkles, UserPlus, Phone, ChevronDown,
  Banknote, CreditCard, Smartphone, Building2, Zap, DollarSign,
  Layers, Scissors, MessageSquare, EyeOff, Wrench, CheckCircle2,
  Ruler, Tag, StickyNote, ShoppingCart, AlertCircle,
} from 'lucide-react-native';
import { bookingsApi, type CreateBookingItem } from '@/api/bookings.api';
import { customersApi, type Customer } from '@/api/customers.api';
import { productsApi, type Product } from '@/api/products.api';
import { productVariantsApi, type ProductVariant } from '@/api/product-variants.api';
import { imeiApi, type ProductImei } from '@/api/imei.api';
import type { ServiceChargeItem, PaymentMethod } from '@/api/sales.api';
import { useAuthStore } from '@/store/auth.store';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { useCarpetSummary } from '@/hooks/useCarpetSummary';
import { VariantPicker } from '@/components/pos/VariantPicker';
import { CarpetRollPicker } from '@/components/pos/CarpetRollPicker';
import { CarpetCutPiecePicker } from '@/components/pos/CarpetCutPiecePicker';
import { ImeiPickerModal } from '@/components/industries/ImeiPickerModal';
import { ServiceChargesSheet } from '@/components/pos/ServiceChargesSheet';
import { NotesEditor } from '@/components/pos/NotesEditor';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);
const MOBILE_KEYWORDS = ['mobile', 'phone', 'smartphone', 'iphone', 'samsung', 'oppo', 'vivo', 'realme', 'xiaomi', 'tecno', 'infinix'];

interface CartLine extends CreateBookingItem {
  cartLineId: string;
  productName: string;
  variantName?: string;
  variantImage?: string;
  variantColorHex?: string;
  unit: string;
  rollNumber?: string;
  cutPieceCode?: string;
  imeiNumber?: string;
  wholesalePrice?: number | null;
}

const newLineId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const paymentMethods: Array<{ key: PaymentMethod; label: string; icon: any; color: string }> = [
  { key: 'CASH', label: 'Cash', icon: Banknote, color: '#16a34a' },
  { key: 'CARD', label: 'Card', icon: CreditCard, color: '#2563eb' },
  { key: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, color: '#f97316' },
  { key: 'EASYPAISA', label: 'EasyPaisa', icon: Zap, color: '#22c55e' },
  { key: 'BANK_TRANSFER', label: 'Bank', icon: Building2, color: '#8b5cf6' },
];

export default function NewBookingScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();
  const { tenant } = useAuthStore();
  const { features, businessType } = useBusinessFeatures();

  const isCarpetBusiness = useMemo(() => {
    const t = (businessType ?? '').toUpperCase();
    return t === 'CARPET' || t === 'FLOORING' || features?.lengthWidthCalc === true;
  }, [businessType, features]);

  // ─── STATE ─────────────────────────
  const [customerId, setCustomerId] = useState('');
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  const [expectedPickupAt, setExpectedPickupAt] = useState<Date | null>(null);
  const [showPickupPicker, setShowPickupPicker] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [showExpiresPicker, setShowExpiresPicker] = useState(false);

  const [discount, setDiscount] = useState('');
  const [initialAdvance, setInitialAdvance] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [serviceCharges, setServiceCharges] = useState<ServiceChargeItem[]>([]);

  const [servicesSheetOpen, setServicesSheetOpen] = useState(false);
  const [notesEditorFor, setNotesEditorFor] = useState<string | null>(null);
  const [variantPicker, setVariantPicker] = useState<{ product: Product; variants: ProductVariant[] } | null>(null);
  const [rollPicker, setRollPicker] = useState<{ product: Product; variant?: ProductVariant } | null>(null);
  const [cutPiecePicker, setCutPiecePicker] = useState<{ product?: Product; variant?: ProductVariant } | null>(null);
  const [imeiPickerData, setImeiPickerData] = useState<{ product: Product; variant?: ProductVariant } | null>(null);

  // ─── QUERIES ─────────────────────────
  const { data: customersData } = useQuery({
    queryKey: ['customers-for-booking'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });
  const customers = customersData?.items ?? [];

  const { data: productsData } = useQuery({
    queryKey: ['products-for-booking', productSearch],
    queryFn: () => productsApi.list({ search: productSearch || undefined, limit: 100 }),
    enabled: productSearchOpen,
  });
  const products = productsData?.items ?? [];

  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const { data: carpetSummary = [] } = useCarpetSummary(
    productIds,
    isCarpetBusiness && productIds.length > 0 && productSearchOpen,
  );
  const carpetSummaryMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of carpetSummary) map.set(s.productId, s);
    return map;
  }, [carpetSummary]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // ─── HELPERS ─────────────────────────
  const isCarpetProduct = (p: Product) => isCarpetBusiness && CARPET_UNITS.has(p.unit);
  const productNeedsImei = (p: Product) => {
    if (!features.imei) return false;
    const name = p.name.toLowerCase();
    const category = (p.category?.name || '').toLowerCase();
    return MOBILE_KEYWORDS.some((kw) => name.includes(kw) || category.includes(kw));
  };

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return customers.slice(0, 20);
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q),
    ).slice(0, 20);
  }, [customers, customerSearch]);

  // ─── TOTALS ─────────────────────────
  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cart],
  );
  const lineDiscountTotal = useMemo(
    () => cart.reduce((sum, i) => sum + (i.lineDiscount ?? 0), 0),
    [cart],
  );
  const totalDiscount = (Number(discount) || 0) + lineDiscountTotal;
  const svcTotal = useMemo(
    () => serviceCharges.reduce((s, c) => s + Number(c.amount || 0), 0),
    [serviceCharges],
  );
  const total = Math.max(subtotal - totalDiscount + svcTotal, 0);
  const advance = Number(initialAdvance) || 0;
  const balance = Math.max(total - advance, 0);

  // ─── MUTATIONS ─────────────────────────
  const createCustomerMutation = useMutation({
    mutationFn: () =>
      customersApi.create({
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim() || undefined,
      }),
    onSuccess: (c) => {
      Toast.show({ type: 'success', text1: `${c.name} added` });
      setCustomerId(c.id);
      setShowCustomerAdd(false);
      setNewCustomer({ name: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['customers-for-booking'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const createBookingMutation = useMutation({
    mutationFn: () =>
      bookingsApi.create({
        shopId: tenant?.id ?? '', // fallback — backend will validate
        customerId,
        expectedPickupAt: expectedPickupAt ? expectedPickupAt.toISOString() : undefined,
        expiresAt: expiresAt ? expiresAt.toISOString() : undefined,
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
          useWholesale: c.useWholesale,
          cutWidthFt: c.cutWidthFt,
          cutLengthFt: c.cutLengthFt,
          cutLengthInch: c.cutLengthInch,
          cutSqft: c.cutSqft,
          note: c.note,
          internalNote: c.internalNote,
        })),
      }),
    onSuccess: (booking) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: `Booking ${booking.bookingNumber} created` });
      queryClient.invalidateQueries({ queryKey: ['bookings-list'] });
      queryClient.invalidateQueries({ queryKey: ['bookings-summary'] });
      router.replace(`/bookings/${booking.id}`);
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message?.[0] || e?.response?.data?.message || 'Failed',
      });
    },
  });

  // ─── ADD ITEM HANDLERS ─────────────────────────
  const addProductToCart = async (product: Product) => {
    if (isCarpetProduct(product)) {
      const summary = carpetSummaryMap.get(product.id);
      if (!summary || summary.totalSqft <= 0) {
        Toast.show({ type: 'error', text1: `${product.name}: koi active roll nahi` });
        return;
      }
      if (product.hasVariants) {
        try {
          const variants = await productVariantsApi.list(product.id);
          const active = variants.filter((v) => v.isActive);
          if (active.length === 0) {
            Toast.show({ type: 'error', text1: 'No active variants' });
            return;
          }
          setVariantPicker({ product, variants });
          setProductSearchOpen(false);
          return;
        } catch {
          Toast.show({ type: 'error', text1: 'Failed to load variants' });
          return;
        }
      }
      setRollPicker({ product });
      setProductSearchOpen(false);
      return;
    }

    if (product.stock <= 0) {
      Toast.show({ type: 'error', text1: `${product.name} stock nahi hai` });
      return;
    }

    if (product.hasVariants) {
      try {
        const variants = await productVariantsApi.list(product.id);
        const active = variants.filter((v) => v.isActive);
        if (active.length === 0) {
          Toast.show({ type: 'error', text1: 'No active variants' });
          return;
        }
        setVariantPicker({ product, variants });
        setProductSearchOpen(false);
        return;
      } catch {
        Toast.show({ type: 'error', text1: 'Failed to load variants' });
        return;
      }
    }

    if (productNeedsImei(product)) {
      setImeiPickerData({ product });
      setProductSearchOpen(false);
      return;
    }

    addStandardItem(product, null);
    setProductSearchOpen(false);
  };

  const addStandardItem = (product: Product, variant: ProductVariant | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => [
      ...prev,
      {
        cartLineId: newLineId(),
        productId: product.id,
        variantId: variant?.id,
        productName: product.name,
        variantName: variant?.name,
        variantImage: variant?.imageUrl ?? undefined,
        variantColorHex: variant?.colorHex ?? undefined,
        quantity: 1,
        price: variant?.price ?? product.price,
        costPrice: variant?.costPrice ?? product.costPrice ?? 0,
        lineDiscount: 0,
        unit: variant?.unit ?? product.unit,
        wholesalePrice: variant?.wholesalePrice ?? product.wholesalePrice,
      },
    ]);
    Toast.show({ type: 'success', text1: `${product.name} added` });
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    if (!variantPicker) return;
    const { product } = variantPicker;

    if (isCarpetProduct(product)) {
      setRollPicker({ product, variant });
      setVariantPicker(null);
      return;
    }
    if (productNeedsImei(product)) {
      setImeiPickerData({ product, variant });
      setVariantPicker(null);
      return;
    }
    addStandardItem(product, variant);
    setVariantPicker(null);
  };

  const handleRollConfirm = (data: any) => {
    if (!rollPicker) return;
    const { product, variant } = rollPicker;
    const { roll } = data;

    const lenInchPart = (data.lengthInch ?? 0) > 0 ? ` ${data.lengthInch}in` : '';
    const note = `Cut from ${roll.rollNumber}: ${data.customerWidthFt}ft × ${data.lengthFt}ft${lenInchPart} = ${data.cutSqft.toFixed(2)} sqft`;

    setCart((prev) => [
      ...prev,
      {
        cartLineId: newLineId(),
        productId: product.id,
        variantId: variant?.id,
        rollId: roll.id,
        rollNumber: roll.rollNumber,
        productName: product.name,
        variantName: variant?.name,
        variantColorHex: variant?.colorHex ?? undefined,
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
    Toast.show({ type: 'success', text1: `${roll.rollNumber} reserved` });
    setRollPicker(null);
  };

  const handleCutPieceSelect = (piece: any) => {
    setCart((prev) => [
      ...prev,
      {
        cartLineId: newLineId(),
        productId: piece.productId,
        variantId: piece.variantId ?? undefined,
        cutPieceId: piece.id,
        cutPieceCode: piece.pieceCode,
        productName: piece.product?.name || 'Cut Piece',
        variantName: piece.variant?.name,
        variantColorHex: piece.variant?.colorHex ?? undefined,
        quantity: piece.totalSqft,
        price: piece.salePrice / Math.max(piece.totalSqft, 0.01),
        costPrice: 0,
        lineDiscount: 0,
        unit: 'sqft',
        note: `Cut piece ${piece.pieceCode} • ${piece.widthFt}ft × ${piece.lengthFt}ft`,
      },
    ]);
    Toast.show({ type: 'success', text1: `Cut piece ${piece.pieceCode} reserved` });
    setCutPiecePicker(null);
  };

  const handleImeiSelect = (imei: ProductImei) => {
    if (!imeiPickerData) return;
    const { product, variant } = imeiPickerData;
    setCart((prev) => [
      ...prev,
      {
        cartLineId: newLineId(),
        productId: product.id,
        variantId: variant?.id,
        imeiId: imei.id,
        imeiNumber: imei.imei1,
        productName: product.name,
        variantName: variant?.name,
        variantColorHex: variant?.colorHex ?? undefined,
        quantity: 1,
        price: variant?.price ?? product.price,
        costPrice: imei.costPrice ?? variant?.costPrice ?? product.costPrice ?? 0,
        lineDiscount: 0,
        unit: variant?.unit ?? product.unit,
        note: `IMEI: ${imei.imei1}`,
      },
    ]);
    Toast.show({ type: 'success', text1: `IMEI reserved` });
    setImeiPickerData(null);
  };

  const updateLine = (id: string, patch: Partial<CartLine>) => {
    setCart((prev) => prev.map((l) => (l.cartLineId === id ? { ...l, ...patch } : l)));
  };

  const removeLine = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => prev.filter((l) => l.cartLineId !== id));
  };

  const handleSubmit = () => {
    if (!customerId) {
      Toast.show({ type: 'error', text1: 'Customer select karein' });
      return;
    }
    if (cart.length === 0) {
      Toast.show({ type: 'error', text1: '1 item add karein' });
      return;
    }
    if (advance > total) {
      Toast.show({ type: 'error', text1: 'Advance total se zyada nahi ho sakti' });
      return;
    }
    createBookingMutation.mutate();
  };

  const activeNoteItem = cart.find((c) => c.cartLineId === notesEditorFor);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#2563eb" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            New Booking
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            Advance / Reservation
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View className="rounded-3xl p-5 mb-4" style={{ backgroundColor: '#1e40af' }}>
            <View className="flex-row items-center gap-2 mb-2">
              <BookmarkPlus size={14} color="rgba(255,255,255,0.8)" />
              <Text className="text-xs uppercase tracking-wider text-white/80 font-extrabold">
                Create Booking / Advance
              </Text>
            </View>
            <Text className="text-white text-lg font-extrabold">
              Items reserve honge, delivery pe sale complete
            </Text>
          </View>

          {/* Customer */}
          <View className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 p-4 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <User size={14} color="#2563eb" />
                <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                  Customer *
                </Text>
              </View>
              <Pressable
                onPress={() => setShowCustomerAdd(true)}
                className="flex-row items-center gap-1"
              >
                <UserPlus size={11} color="#2563eb" />
                <Text className="text-[11px] font-extrabold text-blue-600">Quick Add</Text>
              </Pressable>
            </View>

            {selectedCustomer ? (
              <View className="rounded-xl bg-blue-50 border-2 border-blue-300 p-3 flex-row items-center gap-3">
                <View className="h-11 w-11 rounded-2xl bg-blue-600 items-center justify-center">
                  <Text className="text-white font-extrabold text-lg">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="font-extrabold text-neutral-900" numberOfLines={1}>
                    {selectedCustomer.name}
                  </Text>
                  {selectedCustomer.phone && (
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <Phone size={10} color="#64748b" />
                      <Text className="text-xs text-neutral-600">{selectedCustomer.phone}</Text>
                    </View>
                  )}
                  {selectedCustomer.balance > 0 && (
                    <Text className="text-[10px] font-extrabold text-amber-700 mt-0.5">
                      Existing udhaar: {formatPKRFull(selectedCustomer.balance)}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => setCustomerId('')}
                  hitSlop={8}
                  className="h-8 w-8 rounded-lg bg-white items-center justify-center"
                >
                  <X size={14} color="#dc2626" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setCustomerPickerOpen(true)}
                className="rounded-xl border-2 border-dashed border-blue-300 p-4 items-center flex-row justify-center gap-2 active:opacity-70"
              >
                <User size={18} color="#2563eb" />
                <Text className="text-blue-700 font-extrabold">Select Customer</Text>
              </Pressable>
            )}
          </View>

          {/* Items */}
          <View className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 p-4 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <Package size={14} color="#16a34a" />
                <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                  Items to Reserve
                </Text>
              </View>
              <View className="flex-row gap-2">
                {isCarpetBusiness && (
                  <Pressable
                    onPress={() => setCutPiecePicker({})}
                    className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-100"
                  >
                    <Scissors size={11} color="#8b5cf6" />
                    <Text className="text-[11px] font-extrabold text-violet-700">Cuts</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => {
                    setProductSearchOpen(true);
                    setProductSearch('');
                  }}
                  className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100"
                >
                  <Plus size={11} color="#16a34a" />
                  <Text className="text-[11px] font-extrabold text-emerald-700">Add</Text>
                </Pressable>
              </View>
            </View>

            {cart.length === 0 ? (
              <Pressable
                onPress={() => {
                  setProductSearchOpen(true);
                  setProductSearch('');
                }}
                className="rounded-xl border-2 border-dashed border-neutral-200 p-8 items-center active:opacity-70"
              >
                <Package size={32} color="#d1d5db" />
                <Text className="mt-2 text-sm font-bold text-neutral-500">Koi item nahi</Text>
                <Text className="text-xs text-neutral-400 mt-1">Tap to add products</Text>
              </Pressable>
            ) : (
              <View className="gap-2">
                {cart.map((item) => {
                  const isLocked = !!(item.rollId || item.cutPieceId || item.imeiId);
                  const hasNote = !!(item.note?.trim() || item.internalNote?.trim());
                  return (
                    <View
                      key={item.cartLineId}
                      className="rounded-xl border-2 p-3"
                      style={{
                        borderColor: item.rollId
                          ? '#86efac'
                          : item.cutPieceId
                          ? '#c4b5fd'
                          : item.imeiId
                          ? '#93c5fd'
                          : '#e5e7eb',
                        backgroundColor: item.rollId
                          ? '#f0fdf4'
                          : item.cutPieceId
                          ? '#faf5ff'
                          : item.imeiId
                          ? '#eff6ff'
                          : '#ffffff',
                      }}
                    >
                      <View className="flex-row items-start gap-2">
                        <View
                          className="h-10 w-10 rounded-xl bg-neutral-100 items-center justify-center overflow-hidden shrink-0"
                        >
                          {item.variantImage ? (
                            <Image source={{ uri: item.variantImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          ) : item.variantColorHex ? (
                            <View style={{ width: '100%', height: '100%', backgroundColor: item.variantColorHex }} />
                          ) : (
                            <Package size={16} color="#9ca3af" />
                          )}
                        </View>
                        <View className="flex-1 min-w-0">
                          <Text className="text-sm font-extrabold text-neutral-900" numberOfLines={1}>
                            {item.productName}
                          </Text>
                          {item.variantName && (
                            <Text className="text-[10px] font-bold text-violet-700">{item.variantName}</Text>
                          )}
                          <View className="flex-row flex-wrap gap-1 mt-0.5">
                            {item.rollNumber && (
                              <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100">
                                <Layers size={8} color="#16a34a" />
                                <Text className="text-[9px] font-extrabold text-emerald-700">
                                  {item.rollNumber}
                                </Text>
                              </View>
                            )}
                            {item.cutPieceCode && (
                              <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-100">
                                <Scissors size={8} color="#8b5cf6" />
                                <Text className="text-[9px] font-extrabold text-violet-700">
                                  {item.cutPieceCode}
                                </Text>
                              </View>
                            )}
                            {item.imeiNumber && (
                              <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100">
                                <Smartphone size={8} color="#2563eb" />
                                <Text className="text-[9px] font-extrabold text-blue-700 font-mono">
                                  {item.imeiNumber}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View className="items-end">
                          <Text className="text-sm font-extrabold text-emerald-700">
                            {formatPKRFull(item.price * item.quantity - (item.lineDiscount ?? 0))}
                          </Text>
                          <View className="flex-row gap-1 mt-1">
                            <Pressable
                              onPress={() => setNotesEditorFor(item.cartLineId)}
                              className="h-6 w-6 rounded-md items-center justify-center"
                              style={{ backgroundColor: hasNote ? '#f59e0b' : '#fef3c7' }}
                            >
                              <StickyNote size={10} color={hasNote ? '#ffffff' : '#b45309'} />
                            </Pressable>
                            <Pressable
                              onPress={() => removeLine(item.cartLineId)}
                              className="h-6 w-6 rounded-md bg-rose-50 items-center justify-center"
                            >
                              <X size={10} color="#dc2626" />
                            </Pressable>
                          </View>
                        </View>
                      </View>

                      <View className="flex-row gap-2 mt-2">
                        <View className="flex-1">
                          <Text className="text-[9px] font-extrabold uppercase text-neutral-500 mb-0.5">
                            Qty ({item.unit}) {isLocked && '🔒'}
                          </Text>
                          <TextInput
                            value={String(item.quantity)}
                            onChangeText={(t) =>
                              updateLine(item.cartLineId, { quantity: Number(t) || 0 })
                            }
                            editable={!isLocked}
                            keyboardType="decimal-pad"
                            className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm font-bold text-neutral-900"
                            style={{ opacity: isLocked ? 0.6 : 1 }}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[9px] font-extrabold uppercase text-neutral-500 mb-0.5">
                            Rate
                          </Text>
                          <TextInput
                            value={String(item.price)}
                            onChangeText={(t) =>
                              updateLine(item.cartLineId, { price: Number(t) || 0 })
                            }
                            keyboardType="decimal-pad"
                            className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm font-bold text-neutral-900"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[9px] font-extrabold uppercase text-neutral-500 mb-0.5">
                            Discount
                          </Text>
                          <TextInput
                            value={String(item.lineDiscount ?? 0)}
                            onChangeText={(t) =>
                              updateLine(item.cartLineId, { lineDiscount: Number(t) || 0 })
                            }
                            keyboardType="decimal-pad"
                            className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm font-bold text-neutral-900"
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Service charges (carpet only) */}
          {isCarpetBusiness && (
            <Pressable
              onPress={() => setServicesSheetOpen(true)}
              className="rounded-2xl border-2 p-3 mb-3 flex-row items-center gap-3"
              style={{
                borderColor: serviceCharges.length > 0 ? '#f59e0b' : '#e5e7eb',
                backgroundColor: serviceCharges.length > 0 ? '#fef3c7' : '#ffffff',
              }}
            >
              <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#d97706' }}>
                <Wrench size={20} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="font-extrabold text-amber-900 text-sm">
                  Service Charges {serviceCharges.length > 0 && `(${serviceCharges.length})`}
                </Text>
                <Text className="text-[11px] text-amber-700 mt-0.5">
                  {svcTotal > 0
                    ? `+${formatPKRFull(svcTotal)}`
                    : 'Glue, installation, delivery...'}
                </Text>
              </View>
              <ChevronDown size={16} color="#b45309" />
            </Pressable>
          )}

          {/* Timeline */}
          <View className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 p-4 mb-3">
            <View className="flex-row items-center gap-2 mb-3">
              <Calendar size={14} color="#f59e0b" />
              <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                Timeline
              </Text>
            </View>
            <View className="gap-2">
              <Pressable
                onPress={() => setShowPickupPicker(true)}
                className="rounded-xl border-2 border-neutral-200 p-3 flex-row items-center gap-2"
              >
                <Clock size={16} color="#f59e0b" />
                <View className="flex-1">
                  <Text className="text-[10px] uppercase font-extrabold text-neutral-500">
                    Expected Pickup
                  </Text>
                  <Text className="text-sm font-bold text-neutral-900 mt-0.5">
                    {expectedPickupAt ? expectedPickupAt.toLocaleString('en-PK') : 'Not set'}
                  </Text>
                </View>
                {expectedPickupAt && (
                  <Pressable onPress={() => setExpectedPickupAt(null)} hitSlop={8}>
                    <X size={14} color="#9ca3af" />
                  </Pressable>
                )}
              </Pressable>
              <Pressable
                onPress={() => setShowExpiresPicker(true)}
                className="rounded-xl border-2 border-neutral-200 p-3 flex-row items-center gap-2"
              >
                <AlertCircle size={16} color="#dc2626" />
                <View className="flex-1">
                  <Text className="text-[10px] uppercase font-extrabold text-neutral-500">
                    Auto-Cancel After
                  </Text>
                  <Text className="text-sm font-bold text-neutral-900 mt-0.5">
                    {expiresAt ? expiresAt.toLocaleString('en-PK') : 'No deadline'}
                  </Text>
                </View>
                {expiresAt && (
                  <Pressable onPress={() => setExpiresAt(null)} hitSlop={8}>
                    <X size={14} color="#9ca3af" />
                  </Pressable>
                )}
              </Pressable>
            </View>
          </View>

          {/* Notes */}
          <View className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 p-4 mb-3 gap-3">
            <View className="flex-row items-center gap-2">
              <StickyNote size={14} color="#f59e0b" />
              <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                Booking Notes
              </Text>
            </View>
            <View>
              <View className="flex-row items-center gap-1 mb-1">
                <MessageSquare size={11} color="#b45309" />
                <Text className="text-[10px] font-extrabold uppercase text-amber-700">
                  Customer Note (receipt pe)
                </Text>
              </View>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
                placeholder='"Yeh maal special order hai, kal delivery"'
                placeholderTextColor="#a78bfa"
                className="min-h-[60px] rounded-lg border-2 border-amber-200 bg-amber-50/40 p-2 text-sm font-bold text-neutral-900"
                textAlignVertical="top"
              />
            </View>
            <View>
              <View className="flex-row items-center gap-1 mb-1">
                <EyeOff size={11} color="#475569" />
                <Text className="text-[10px] font-extrabold uppercase text-slate-700">
                  Internal Note (team-only)
                </Text>
              </View>
              <TextInput
                value={internalNotes}
                onChangeText={setInternalNotes}
                multiline
                numberOfLines={2}
                placeholder='"VIP customer, priority handle karna"'
                placeholderTextColor="#94a3b8"
                className="min-h-[60px] rounded-lg border-2 border-slate-200 bg-slate-50 p-2 text-sm font-bold text-neutral-900"
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Totals + Advance */}
          <View className="rounded-3xl p-5 mb-3" style={{ backgroundColor: '#1e40af' }}>
            <View className="flex-row items-center gap-2 mb-3">
              <DollarSign size={14} color="rgba(255,255,255,0.8)" />
              <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                Booking Summary
              </Text>
            </View>
            <View className="gap-1.5">
              <View className="flex-row justify-between">
                <Text className="text-white/80 text-sm">Subtotal</Text>
                <Text className="text-white font-bold">{formatPKRFull(subtotal)}</Text>
              </View>
              {totalDiscount > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-amber-300 text-sm">Discount</Text>
                  <Text className="text-amber-300 font-bold">-{formatPKRFull(totalDiscount)}</Text>
                </View>
              )}
              {svcTotal > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-orange-300 text-sm">Service Charges</Text>
                  <Text className="text-orange-300 font-bold">+{formatPKRFull(svcTotal)}</Text>
                </View>
              )}
              <View className="flex-row justify-between pt-2 border-t border-white/20">
                <Text className="text-white text-lg font-extrabold">TOTAL</Text>
                <Text className="text-white text-2xl font-extrabold">{formatPKRFull(total)}</Text>
              </View>
            </View>
            <View className="mt-3">
              <Text className="text-[10px] font-extrabold uppercase text-white/70 mb-1">
                Global Discount (PKR)
              </Text>
              <TextInput
                value={discount}
                onChangeText={setDiscount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.5)"
                className="h-11 rounded-xl bg-white/15 border border-white/25 px-3 text-base font-bold text-white"
              />
            </View>
          </View>

          {/* Advance Payment */}
          <View
            className="rounded-3xl p-5 mb-3 border-2"
            style={{ backgroundColor: '#dcfce7', borderColor: '#86efac' }}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <Wallet size={14} color="#15803d" />
              <Text className="text-[10px] uppercase tracking-wider text-emerald-700 font-extrabold">
                Advance Payment (Optional)
              </Text>
            </View>
            <TextInput
              value={initialAdvance}
              onChangeText={setInitialAdvance}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#86efac"
              className="h-14 rounded-2xl bg-white border-2 border-emerald-200 px-4 text-2xl font-extrabold text-emerald-900"
            />
            <Text className="text-[11px] text-emerald-700 font-bold mt-2">
              Balance due after advance: {formatPKRFull(balance)}
            </Text>
            {advance > 0 && (
              <>
                <Text className="text-[10px] font-extrabold uppercase text-emerald-700 mt-3 mb-1">
                  Payment Method
                </Text>
                <View className="flex-row flex-wrap -m-1">
                  {paymentMethods.map((m) => {
                    const Icon = m.icon;
                    const active = paymentMethod === m.key;
                    return (
                      <View key={m.key} className="w-1/3 p-1">
                        <Pressable
                          onPress={() => {
                            Haptics.selectionAsync();
                            setPaymentMethod(m.key);
                          }}
                          className="h-14 rounded-xl items-center justify-center gap-1 border-2"
                          style={{
                            backgroundColor: active ? m.color : '#ffffff',
                            borderColor: active ? m.color : '#e5e7eb',
                          }}
                        >
                          <Icon size={16} color={active ? '#ffffff' : m.color} />
                          <Text
                            className="text-[10px] font-bold"
                            style={{ color: active ? '#ffffff' : '#374151' }}
                          >
                            {m.label}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View className="px-5 py-4 border-t border-neutral-200 bg-white dark:bg-neutral-900">
          <Pressable
            onPress={handleSubmit}
            disabled={createBookingMutation.isPending || !customerId || cart.length === 0}
            className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
            style={{
              backgroundColor:
                createBookingMutation.isPending || !customerId || cart.length === 0
                  ? '#9ca3af'
                  : '#2563eb',
              shadowColor: '#2563eb',
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            {createBookingMutation.isPending ? (
              <Text className="text-white font-extrabold text-base">Creating...</Text>
            ) : (
              <>
                <BookmarkPlus size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  Create Booking {formatPKRFull(total)}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Date Time Pickers */}
      {showPickupPicker && (
        <DateTimePicker
          value={expectedPickupAt || new Date(Date.now() + 24 * 60 * 60 * 1000)}
          mode="datetime"
          minimumDate={new Date()}
          onChange={(_, date) => {
            setShowPickupPicker(false);
            if (date) setExpectedPickupAt(date);
          }}
        />
      )}
      {showExpiresPicker && (
        <DateTimePicker
          value={expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
          mode="datetime"
          minimumDate={new Date()}
          onChange={(_, date) => {
            setShowExpiresPicker(false);
            if (date) setExpiresAt(date);
          }}
        />
      )}

      {/* Customer Picker Modal */}
      <Modal
        visible={customerPickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCustomerPickerOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
            <Text className="flex-1 text-xl font-bold text-neutral-900">Select Customer</Text>
            <Pressable
              onPress={() => setCustomerPickerOpen(false)}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <View className="px-5 py-3">
            <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
              <Search size={18} color="#9ca3af" />
              <TextInput
                value={customerSearch}
                onChangeText={setCustomerSearch}
                placeholder="Search name or phone..."
                placeholderTextColor="#9ca3af"
                autoFocus
                className="flex-1 text-base text-neutral-900"
              />
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
            {filteredCustomers.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  setCustomerId(c.id);
                  setCustomerPickerOpen(false);
                  setCustomerSearch('');
                }}
                className="flex-row items-center gap-3 p-3 rounded-2xl bg-white border border-neutral-200 mb-2 active:opacity-70"
              >
                <View className="h-10 w-10 rounded-xl bg-violet-100 items-center justify-center">
                  <Text className="text-violet-700 font-extrabold">
                    {c.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="font-bold text-neutral-900" numberOfLines={1}>{c.name}</Text>
                  {c.phone && <Text className="text-xs text-neutral-500 mt-0.5">{c.phone}</Text>}
                </View>
                {c.balance > 0 && (
                  <View className="bg-amber-100 px-2 py-1 rounded-lg">
                    <Text className="text-[10px] text-amber-700 font-extrabold">
                      {formatPKRFull(c.balance)}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Quick Add Customer */}
      <Modal
        visible={showCustomerAdd}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowCustomerAdd(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl bg-violet-600 items-center justify-center">
              <UserPlus size={20} color="#ffffff" />
            </View>
            <Text className="flex-1 text-base font-bold text-neutral-900">Quick Add Customer</Text>
            <Pressable
              onPress={() => setShowCustomerAdd(false)}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <View className="p-5 gap-3">
            <View>
              <Text className="text-xs font-bold uppercase text-neutral-500 mb-1.5">Name *</Text>
              <View className="rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12 justify-center">
                <TextInput
                  autoFocus
                  value={newCustomer.name}
                  onChangeText={(t) => setNewCustomer({ ...newCustomer, name: t })}
                  placeholder="Customer name"
                  placeholderTextColor="#9ca3af"
                  className="text-base text-neutral-900"
                />
              </View>
            </View>
            <View>
              <Text className="text-xs font-bold uppercase text-neutral-500 mb-1.5">Phone</Text>
              <View className="rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12 justify-center">
                <TextInput
                  value={newCustomer.phone}
                  onChangeText={(t) => setNewCustomer({ ...newCustomer, phone: t })}
                  placeholder="03XXXXXXXXX"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  className="text-base text-neutral-900"
                />
              </View>
            </View>
            <Pressable
              onPress={() => {
                if (!newCustomer.name.trim()) {
                  Toast.show({ type: 'error', text1: 'Name required' });
                  return;
                }
                createCustomerMutation.mutate();
              }}
              disabled={createCustomerMutation.isPending}
              className="h-12 rounded-2xl items-center justify-center flex-row gap-2 mt-2"
              style={{ backgroundColor: '#8b5cf6' }}
            >
              <UserPlus size={18} color="#ffffff" />
              <Text className="text-white font-extrabold text-base">
                {createCustomerMutation.isPending ? 'Adding...' : 'Add Customer'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Product Search Modal */}
      <Modal
        visible={productSearchOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setProductSearchOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
            <Text className="flex-1 text-xl font-bold text-neutral-900">Add Product</Text>
            <Pressable
              onPress={() => setProductSearchOpen(false)}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <View className="px-5 py-3">
            <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
              <Search size={18} color="#9ca3af" />
              <TextInput
                value={productSearch}
                onChangeText={setProductSearch}
                placeholder="Search product..."
                placeholderTextColor="#9ca3af"
                autoFocus
                className="flex-1 text-base text-neutral-900"
              />
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
            {products.map((p) => {
              const isCarpet = isCarpetProduct(p);
              const carpetData = isCarpet ? carpetSummaryMap.get(p.id) : undefined;
              const carpetSqft = carpetData?.totalSqft ?? 0;
              const rollCount = carpetData?.rollCount ?? 0;
              const outOfStock = isCarpet ? carpetSqft <= 0 : p.stock <= 0;
              const needsImei = productNeedsImei(p);

              return (
                <Pressable
                  key={p.id}
                  onPress={() => addProductToCart(p)}
                  disabled={outOfStock}
                  className="flex-row items-center gap-3 p-3 rounded-2xl bg-white border border-neutral-200 mb-2 active:opacity-70"
                  style={{ opacity: outOfStock ? 0.5 : 1 }}
                >
                  <View className="h-11 w-11 rounded-xl bg-neutral-100 items-center justify-center overflow-hidden">
                    {p.images?.[0]?.url ? (
                      <Image source={{ uri: p.images[0].url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <Package size={18} color="#9ca3af" />
                    )}
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-1 flex-wrap">
                      <Text className="font-bold text-neutral-900" numberOfLines={1}>{p.name}</Text>
                      {isCarpet && (
                        <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100">
                          <Layers size={8} color="#16a34a" />
                          <Text className="text-[9px] font-extrabold text-emerald-700">ROLLS</Text>
                        </View>
                      )}
                      {needsImei && !isCarpet && (
                        <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100">
                          <Smartphone size={8} color="#2563eb" />
                          <Text className="text-[9px] font-extrabold text-blue-700">IMEI</Text>
                        </View>
                      )}
                      {p.hasVariants && !isCarpet && !needsImei && (
                        <View className="px-1.5 py-0.5 rounded bg-violet-100">
                          <Text className="text-[9px] font-extrabold text-violet-700">VAR</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-neutral-500 mt-0.5">
                      {formatPKRFull(p.price)}
                      {isCarpet ? (
                        <Text className={carpetSqft > 0 ? ' text-emerald-700' : ' text-rose-700'}>
                          {' '}• {carpetSqft.toFixed(0)} sqft ({rollCount})
                        </Text>
                      ) : (
                        <Text> • Stock: {p.stock} {p.unit}</Text>
                      )}
                    </Text>
                  </View>
                  {outOfStock && (
                    <View className="bg-rose-100 px-2 py-1 rounded-lg">
                      <Text className="text-[9px] font-extrabold text-rose-700">OUT</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Pickers */}
      <VariantPicker
        visible={!!variantPicker}
        product={variantPicker?.product ?? null}
        variants={variantPicker?.variants ?? []}
        onSelect={handleVariantSelect}
        onClose={() => setVariantPicker(null)}
      />
      <CarpetRollPicker
        visible={!!rollPicker}
        productId={rollPicker?.product.id || ''}
        productName={rollPicker?.product.name || ''}
        variantId={rollPicker?.variant?.id}
        variantName={rollPicker?.variant?.name}
        onConfirm={handleRollConfirm}
        onClose={() => setRollPicker(null)}
      />
      <CarpetCutPiecePicker
        visible={!!cutPiecePicker}
        productId={cutPiecePicker?.product?.id}
        productName={cutPiecePicker?.product?.name}
        variantId={cutPiecePicker?.variant?.id}
        onSelect={handleCutPieceSelect}
        onClose={() => setCutPiecePicker(null)}
      />
      <ImeiPickerModal
        visible={!!imeiPickerData}
        productId={imeiPickerData?.product.id || ''}
        productName={imeiPickerData?.product.name || ''}
        variantId={imeiPickerData?.variant?.id}
        variantName={imeiPickerData?.variant?.name}
        excludeIds={cart.filter((c) => c.imeiId).map((c) => c.imeiId!)}
        onSelect={handleImeiSelect}
        onClose={() => setImeiPickerData(null)}
      />
      <ServiceChargesSheet
        visible={servicesSheetOpen}
        charges={serviceCharges}
        onChange={setServiceCharges}
        onClose={() => setServicesSheetOpen(false)}
      />
      <NotesEditor
        visible={!!notesEditorFor}
        productName={activeNoteItem?.productName || ''}
        note={activeNoteItem?.note ?? ''}
        internalNote={activeNoteItem?.internalNote ?? ''}
        onChange={(patch) => {
          if (notesEditorFor) updateLine(notesEditorFor, patch);
        }}
        onClose={() => setNotesEditorFor(null)}
      />
    </SafeAreaView>
  );
}
