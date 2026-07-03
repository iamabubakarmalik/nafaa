import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal,
  TextInput, KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, ArrowRightLeft, Plus, Building2, Trash2, Minus, Search,
  CheckCircle2, XCircle, Clock, Truck, X, Package, Layers, Sparkles,
  AlertCircle, Calendar, Eye, FileText, User, ChevronRight, Filter,
} from 'lucide-react-native';
import { transfersApi, type TransferStatus, type StockTransfer } from '@/api/transfers.api';
import { shopsApi } from '@/api/shops.api';
import { productsApi, type Product } from '@/api/products.api';
import type { CarpetRoll } from '@/api/carpet-rolls.api';
import { TransferRollPickerMobile } from '@/components/pos/TransferRollPickerMobile';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const statusConfig: Record<TransferStatus, {
  label: string; color: string; bg: string; icon: any;
}> = {
  PENDING:    { label: 'Pending',    color: '#d97706', bg: '#fef3c7', icon: Clock },
  IN_TRANSIT: { label: 'In Transit', color: '#2563eb', bg: '#dbeafe', icon: Truck },
  RECEIVED:   { label: 'Received',   color: '#16a34a', bg: '#dcfce7', icon: CheckCircle2 },
  CANCELLED:  { label: 'Cancelled',  color: '#dc2626', bg: '#fee2e2', icon: XCircle },
};

interface CartLine {
  productId: string;
  productName: string;
  unit: string;
  stock: number;
  quantity: number;
  isCarpet: boolean;
  rolls: CarpetRoll[];
  notes?: string;
}

type StatusFilter = 'all' | TransferStatus;

export default function TransfersScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();
  const { features } = useBusinessFeatures();

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [viewTransfer, setViewTransfer] = useState<StockTransfer | null>(null);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [rollPickerProduct, setRollPickerProduct] = useState<Product | null>(null);

  // Form state
  const [fromShopId, setFromShopId] = useState('');
  const [toShopId, setToShopId] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  // ─── QUERIES ───
  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: async () => {
      try {
        const r = await shopsApi.list();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['transfers-products'],
    queryFn: async () => {
      try {
        return await productsApi.list({ limit: 500 });
      } catch {
        return { items: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };
      }
    },
    enabled: productPickerOpen,
  });

  const { data: transfers = [], refetch } = useQuery({
    queryKey: ['transfers'],
    queryFn: async () => {
      try {
        const r = await transfersApi.list();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const products = productsData?.items ?? [];

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return products.slice(0, 30);
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q),
    ).slice(0, 30);
  }, [products, productSearch]);

  // ─── FILTERED LIST ───
  const filtered = useMemo(() => {
    let result = [...transfers];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (t) =>
          t.transferNumber.toLowerCase().includes(q) ||
          t.fromShop?.name?.toLowerCase().includes(q) ||
          t.toShop?.name?.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }
    return result;
  }, [transfers, search, statusFilter]);

  const stats = useMemo(() => ({
    total: transfers.length,
    pending: transfers.filter((t) => t.status === 'PENDING').length,
    inTransit: transfers.filter((t) => t.status === 'IN_TRANSIT').length,
    received: transfers.filter((t) => t.status === 'RECEIVED').length,
  }), [transfers]);

  // ─── MUTATIONS ───
  const createMutation = useMutation({
    mutationFn: () => {
      // Build payload — carpet items expand to per-roll rows
      const payloadItems = cart.flatMap((line) => {
        if (line.isCarpet) {
          return line.rolls.map((roll) => ({
            productId: line.productId,
            variantId: roll.variantId ?? undefined,
            carpetRollId: roll.id,
            quantity: Number(roll.remainingSqft),
            notes: line.notes,
          }));
        }
        return [{
          productId: line.productId,
          quantity: line.quantity,
          notes: line.notes,
        }];
      });

      return transfersApi.create({
        fromShopId,
        toShopId,
        notes: notes.trim() || undefined,
        items: payloadItems,
      });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Transfer created!', text2: 'Stock marked IN_TRANSIT' });
      resetForm();
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-product-summary'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const receiveMutation = useMutation({
    mutationFn: transfersApi.receive,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Transfer received!' });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      setViewTransfer(null);
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const cancelMutation = useMutation({
    mutationFn: transfersApi.cancel,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Cancelled — stock returned' });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      setViewTransfer(null);
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  // ─── HELPERS ───
  const resetForm = () => {
    setFromShopId('');
    setToShopId('');
    setNotes('');
    setCart([]);
    setProductSearch('');
  };

  const isCarpetProduct = (p: Product) =>
    (features?.lengthWidthCalc === true) && CARPET_UNITS.has(p.unit);

  const addProductToCart = (product: Product) => {
    if (!fromShopId) {
      Toast.show({ type: 'error', text1: 'Pehle source shop select karein' });
      return;
    }

    const isCarpet = isCarpetProduct(product);

    if (isCarpet) {
      const existing = cart.find((l) => l.productId === product.id);
      if (existing) {
        Toast.show({
          type: 'info',
          text1: 'Carpet product already added',
          text2: 'Add more rolls from cart line',
        });
        return;
      }
      setRollPickerProduct(product);
      setProductPickerOpen(false);
      setProductSearch('');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          Toast.show({ type: 'error', text1: 'Stock limit reached' });
          return prev;
        }
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          stock: product.stock,
          quantity: 1,
          isCarpet: false,
          rolls: [],
        },
      ];
    });
    setProductPickerOpen(false);
    setProductSearch('');
  };

  const handleRollsSelected = (rolls: CarpetRoll[]) => {
    if (!rollPickerProduct) return;
    const totalSqft = rolls.reduce((s, r) => s + Number(r.remainingSqft), 0);

    setCart((prev) => {
      const existing = prev.find((i) => i.productId === rollPickerProduct.id);
      if (existing) {
        const existingIds = new Set(existing.rolls.map((r) => r.id));
        const newRolls = rolls.filter((r) => !existingIds.has(r.id));
        const combined = [...existing.rolls, ...newRolls];
        const newTotal = combined.reduce((s, r) => s + Number(r.remainingSqft), 0);
        return prev.map((i) =>
          i.productId === rollPickerProduct.id
            ? { ...i, rolls: combined, quantity: newTotal }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: rollPickerProduct.id,
          productName: rollPickerProduct.name,
          unit: rollPickerProduct.unit,
          quantity: totalSqft,
          isCarpet: true,
          rolls,
          stock: totalSqft,
        },
      ];
    });

    Toast.show({
      type: 'success',
      text1: `${rolls.length} roll${rolls.length !== 1 ? 's' : ''} added`,
      text2: `${totalSqft.toFixed(2)} sqft`,
    });
    setRollPickerProduct(null);
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty < 0.01) return;
    setCart((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(qty, l.stock) } : l)),
    );
  };

  const removeLine = (productId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  };

  const removeRollFromLine = (productId: string, rollId: string) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          const newRolls = l.rolls.filter((r) => r.id !== rollId);
          const newTotal = newRolls.reduce((s, r) => s + Number(r.remainingSqft), 0);
          return { ...l, rolls: newRolls, quantity: newTotal };
        })
        .filter((l) => !l.isCarpet || l.rolls.length > 0),
    );
  };

  const openAddMoreRolls = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setRollPickerProduct(product);
    }
  };

  const excludedRollIds = useMemo(
    () =>
      cart
        .filter((l) => l.isCarpet && l.productId === rollPickerProduct?.id)
        .flatMap((l) => l.rolls.map((r) => r.id)),
    [cart, rollPickerProduct],
  );

  const handleCreate = () => {
    if (!fromShopId) return Toast.show({ type: 'error', text1: 'Source shop select karein' });
    if (!toShopId) return Toast.show({ type: 'error', text1: 'Destination shop select karein' });
    if (fromShopId === toShopId) return Toast.show({ type: 'error', text1: 'Source aur destination same nahi ho sakte' });
    if (cart.length === 0) return Toast.show({ type: 'error', text1: 'At least 1 product add karein' });

    const invalidCarpet = cart.find((l) => l.isCarpet && l.rolls.length === 0);
    if (invalidCarpet) {
      return Toast.show({ type: 'error', text1: `${invalidCarpet.productName}: Carpet mein rolls select karein` });
    }

    createMutation.mutate();
  };

  const handleReceive = (id: string, num: string) => {
    Alert.alert('Receive Transfer?', `${num} ko receive karna chahte hain?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Receive', onPress: () => receiveMutation.mutate(id) },
    ]);
  };

  const handleCancel = (id: string, num: string) => {
    Alert.alert(
      'Cancel Transfer?',
      `${num} cancel karne se stock source shop ko wapis mil jayega.`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes Cancel', style: 'destructive', onPress: () => cancelMutation.mutate(id) },
      ],
    );
  };

  const cartCarpetRollCount = useMemo(
    () => cart.filter((l) => l.isCarpet).reduce((s, l) => s + l.rolls.length, 0),
    [cart],
  );

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
          <ArrowLeft size={20} color="#0891b2" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Stock Transfers
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#0891b2" />
            <Text className="text-xs text-neutral-500">Multi-shop inventory</Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCreateOpen(true);
          }}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{
            backgroundColor: '#0891b2',
            shadowColor: '#0891b2',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">New</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891b2" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{
          backgroundColor: '#0891b2',
          shadowColor: '#0891b2',
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 10,
        }}>
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
              <ArrowRightLeft size={28} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                Total Transfers
              </Text>
              <Text className="text-4xl font-extrabold text-white mt-0.5">
                {stats.total}
              </Text>
              <Text className="text-xs text-white/80 mt-0.5">
                {stats.inTransit} in transit • {stats.received} received
              </Text>
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View className="px-5 mb-3">
          <View className="flex-row flex-wrap -mx-1.5">
            {[
              { label: 'Pending', value: stats.pending, color: '#d97706', bg: '#fef3c7', icon: Clock },
              { label: 'In Transit', value: stats.inTransit, color: '#2563eb', bg: '#dbeafe', icon: Truck },
              { label: 'Received', value: stats.received, color: '#16a34a', bg: '#dcfce7', icon: CheckCircle2 },
              { label: 'Total', value: stats.total, color: '#0891b2', bg: '#cffafe', icon: ArrowRightLeft },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <View key={s.label} className="w-1/2 px-1.5 mb-3">
                  <View
                    className="rounded-2xl border-2 p-3"
                    style={{ backgroundColor: s.bg, borderColor: s.color }}
                  >
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <Icon size={12} color={s.color} />
                      <Text className="text-[10px] uppercase font-extrabold" style={{ color: s.color }}>
                        {s.label}
                      </Text>
                    </View>
                    <Text className="text-2xl font-extrabold mt-0.5" style={{ color: s.color }}>
                      {s.value}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          className="mb-3"
        >
          {[
            { key: 'all' as StatusFilter, label: 'All', count: stats.total },
            { key: 'PENDING' as StatusFilter, label: 'Pending', count: stats.pending, color: '#d97706' },
            { key: 'IN_TRANSIT' as StatusFilter, label: 'In Transit', count: stats.inTransit, color: '#2563eb' },
            { key: 'RECEIVED' as StatusFilter, label: 'Received', count: stats.received, color: '#16a34a' },
            { key: 'CANCELLED' as StatusFilter, label: 'Cancelled', count: transfers.filter((t) => t.status === 'CANCELLED').length, color: '#dc2626' },
          ].map((f) => {
            const active = statusFilter === f.key;
            const activeColor = f.color || '#0891b2';
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setStatusFilter(f.key);
                }}
                className="h-9 px-3 rounded-xl border-2 flex-row items-center gap-1.5"
                style={{
                  backgroundColor: active ? activeColor : '#ffffff',
                  borderColor: active ? activeColor : '#e5e7eb',
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: active ? '#ffffff' : '#374151' }}
                >
                  {f.label}
                </Text>
                <View
                  className="px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#f3f4f6' }}
                >
                  <Text
                    className="text-[10px] font-extrabold"
                    style={{ color: active ? '#ffffff' : '#6b7280' }}
                  >
                    {f.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Search */}
        <View className="px-5 mb-3">
          <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
            <Search size={18} color="#9ca3af" />
            <TextInput
              placeholder="Search transfer #, shop name..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
              className="flex-1 text-sm text-neutral-900"
            />
            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch('')}
                hitSlop={12}
                className="h-7 w-7 rounded-full bg-neutral-100 items-center justify-center"
              >
                <X size={14} color="#9ca3af" />
              </Pressable>
            )}
          </View>
        </View>

        {/* List */}
        <View className="px-5">
          {filtered.length === 0 ? (
            <View className="items-center py-16">
              <View className="h-20 w-20 rounded-3xl bg-cyan-100 items-center justify-center">
                <ArrowRightLeft size={36} color="#0891b2" />
              </View>
              <Text className="mt-4 text-base font-bold text-neutral-900">
                {search || statusFilter !== 'all' ? 'No transfers match' : 'No transfers yet'}
              </Text>
              <Text className="text-xs text-neutral-500 mt-1 text-center">
                {search || statusFilter !== 'all' ? 'Try different filter' : 'Multi-shop inventory manage karo'}
              </Text>
              {!search && statusFilter === 'all' && (
                <Pressable
                  onPress={() => setCreateOpen(true)}
                  className="mt-4 h-11 px-5 rounded-xl flex-row items-center gap-2"
                  style={{ backgroundColor: '#0891b2' }}
                >
                  <Plus size={16} color="#ffffff" />
                  <Text className="text-white font-bold text-sm">Create Transfer</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View className="gap-2">
              {filtered.map((t) => {
                const cfg = statusConfig[t.status];
                const Icon = cfg.icon;
                const carpetRolls = t.items.filter((i) => i.carpetRollId).length;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setViewTransfer(t);
                    }}
                    className="rounded-2xl bg-white border-2 border-neutral-200 p-3 active:opacity-70"
                  >
                    <View className="flex-row items-start gap-3">
                      <View className="h-14 w-14 rounded-2xl bg-cyan-100 items-center justify-center shrink-0">
                        <ArrowRightLeft size={22} color="#0891b2" />
                      </View>
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="font-extrabold font-mono text-sm text-neutral-900">
                            {t.transferNumber}
                          </Text>
                          <View className="px-1.5 py-0.5 rounded flex-row items-center gap-1" style={{ backgroundColor: cfg.bg }}>
                            <Icon size={9} color={cfg.color} />
                            <Text className="text-[9px] font-extrabold uppercase" style={{ color: cfg.color }}>
                              {cfg.label}
                            </Text>
                          </View>
                          {carpetRolls > 0 && (
                            <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100">
                              <Layers size={9} color="#16a34a" />
                              <Text className="text-[9px] font-extrabold text-emerald-700">
                                {carpetRolls} rolls
                              </Text>
                            </View>
                          )}
                        </View>
                        <View className="flex-row items-center gap-1.5 mt-1.5">
                          <Building2 size={11} color="#64748b" />
                          <Text className="text-xs font-bold text-neutral-700" numberOfLines={1}>
                            {t.fromShop?.name}
                          </Text>
                          <ArrowRightLeft size={10} color="#9ca3af" />
                          <Text className="text-xs font-bold text-neutral-700" numberOfLines={1}>
                            {t.toShop?.name}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                          <View className="flex-row items-center gap-1">
                            <Package size={10} color="#9ca3af" />
                            <Text className="text-[10px] text-neutral-500">
                              {t.items?.length ?? 0} items
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-1">
                            <Calendar size={10} color="#9ca3af" />
                            <Text className="text-[10px] text-neutral-500">
                              {formatDate(t.createdAt)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <ChevronRight size={18} color="#9ca3af" />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ═════ CREATE TRANSFER MODAL ═════ */}
      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreateOpen(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#0891b2' }}>
                  <ArrowRightLeft size={20} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-lg font-extrabold text-neutral-900">New Transfer</Text>
                  <Text className="text-[10px] text-neutral-500">Multi-shop stock movement</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setCreateOpen(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {/* From Shop */}
              <View className="mb-4">
                <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-2">
                  From Shop *
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {shops.filter((s) => s.isActive !== false).map((s) => {
                    const active = fromShopId === s.id;
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setFromShopId(s.id);
                        }}
                        className="h-10 px-4 rounded-xl flex-row items-center gap-1.5 border-2"
                        style={{
                          backgroundColor: active ? '#0891b2' : '#ffffff',
                          borderColor: active ? '#0891b2' : '#e5e7eb',
                        }}
                      >
                        <Building2 size={12} color={active ? '#ffffff' : '#0891b2'} />
                        <Text className="text-sm font-bold" style={{ color: active ? '#ffffff' : '#374151' }}>
                          {s.name}
                        </Text>
                        {s.isMain && (
                          <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#fef3c7' }}>
                            <Text className="text-[9px] font-extrabold" style={{ color: active ? '#ffffff' : '#b45309' }}>
                              MAIN
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* To Shop */}
              <View className="mb-4">
                <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-2">
                  To Shop *
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {shops.filter((s) => s.isActive !== false && s.id !== fromShopId).map((s) => {
                    const active = toShopId === s.id;
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setToShopId(s.id);
                        }}
                        className="h-10 px-4 rounded-xl flex-row items-center gap-1.5 border-2"
                        style={{
                          backgroundColor: active ? '#16a34a' : '#ffffff',
                          borderColor: active ? '#16a34a' : '#e5e7eb',
                        }}
                      >
                        <Building2 size={12} color={active ? '#ffffff' : '#16a34a'} />
                        <Text className="text-sm font-bold" style={{ color: active ? '#ffffff' : '#374151' }}>
                          {s.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {!fromShopId && (
                <View className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4 flex-row items-start gap-2">
                  <AlertCircle size={14} color="#b45309" />
                  <Text className="flex-1 text-xs font-bold text-amber-900">
                    Source shop pehle select karein — phir products add karna shuru karein
                  </Text>
                </View>
              )}

              {/* Add Products button */}
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider">
                    Items to Transfer ({cart.length})
                  </Text>
                  <Pressable
                    onPress={() => {
                      if (!fromShopId) {
                        Toast.show({ type: 'error', text1: 'Source shop pehle select karein' });
                        return;
                      }
                      setProductPickerOpen(true);
                    }}
                    disabled={!fromShopId}
                    className="flex-row items-center gap-1 h-8 px-3 rounded-lg"
                    style={{ backgroundColor: fromShopId ? '#0891b2' : '#d1d5db' }}
                  >
                    <Plus size={12} color="#ffffff" />
                    <Text className="text-white font-extrabold text-xs">Add Product</Text>
                  </Pressable>
                </View>

                {cart.length === 0 ? (
                  <View className="rounded-2xl border-2 border-dashed border-neutral-300 p-6 items-center">
                    <Package size={32} color="#d1d5db" />
                    <Text className="mt-2 text-sm font-bold text-neutral-500">No items yet</Text>
                    <Text className="text-[10px] text-neutral-400 mt-1">Tap "Add Product" to start</Text>
                  </View>
                ) : (
                  <View className="gap-2">
                    {cart.map((line) => (
                      <View
                        key={line.productId}
                        className="rounded-2xl border-2 p-3"
                        style={{
                          borderColor: line.isCarpet ? '#86efac' : '#e5e7eb',
                          backgroundColor: line.isCarpet ? '#f0fdf4' : '#ffffff',
                        }}
                      >
                        <View className="flex-row items-start gap-2">
                          <View
                            className="h-10 w-10 rounded-xl items-center justify-center shrink-0"
                            style={{ backgroundColor: line.isCarpet ? '#dcfce7' : '#f3f4f6' }}
                          >
                            {line.isCarpet ? (
                              <Layers size={18} color="#16a34a" />
                            ) : (
                              <Package size={18} color="#6b7280" />
                            )}
                          </View>
                          <View className="flex-1 min-w-0">
                            <Text className="font-extrabold text-sm text-neutral-900" numberOfLines={1}>
                              {line.productName}
                            </Text>
                            {line.isCarpet && (
                              <Text className="text-[10px] font-extrabold text-emerald-700 mt-0.5">
                                🧶 {line.rolls.length} roll{line.rolls.length !== 1 ? 's' : ''} • {line.quantity.toFixed(2)} sqft
                              </Text>
                            )}
                            {!line.isCarpet && (
                              <Text className="text-[10px] text-neutral-500 mt-0.5">
                                Available: {line.stock} {line.unit}
                              </Text>
                            )}
                          </View>
                          <Pressable
                            onPress={() => removeLine(line.productId)}
                            className="h-8 w-8 rounded-lg bg-rose-50 items-center justify-center"
                          >
                            <Trash2 size={14} color="#dc2626" />
                          </Pressable>
                        </View>

                        {/* Non-carpet: qty controls */}
                        {!line.isCarpet && (
                          <View className="flex-row items-center gap-1.5 bg-neutral-50 rounded-xl p-1 mt-2 self-start">
                            <Pressable
                              onPress={() => updateQty(line.productId, line.quantity - 1)}
                              className="h-8 w-8 rounded-lg bg-white border border-neutral-200 items-center justify-center"
                            >
                              <Minus size={12} color="#374151" />
                            </Pressable>
                            <TextInput
                              value={String(line.quantity)}
                              onChangeText={(t) => {
                                const v = parseFloat(t);
                                if (!isNaN(v)) updateQty(line.productId, v);
                              }}
                              keyboardType="decimal-pad"
                              className="w-14 text-center font-extrabold text-sm text-neutral-900"
                            />
                            <Text className="text-[10px] font-bold text-neutral-500 pr-1">{line.unit}</Text>
                            <Pressable
                              onPress={() => updateQty(line.productId, line.quantity + 1)}
                              disabled={line.quantity >= line.stock}
                              className="h-8 w-8 rounded-lg items-center justify-center"
                              style={{ backgroundColor: '#0891b2' }}
                            >
                              <Plus size={12} color="#ffffff" />
                            </Pressable>
                          </View>
                        )}

                        {/* Carpet: rolls list + add more */}
                        {line.isCarpet && (
                          <View className="mt-2 pt-2 border-t border-emerald-200 gap-1">
                            {line.rolls.map((roll) => (
                              <View key={roll.id} className="flex-row items-center gap-2 py-1">
                                <View
                                  className="h-6 w-6 rounded items-center justify-center"
                                  style={{ backgroundColor: roll.variant?.colorHex || '#f0fdf4' }}
                                >
                                  {!roll.variant?.colorHex && <Layers size={11} color="#16a34a" />}
                                </View>
                                <View className="flex-1 min-w-0">
                                  <Text className="text-[11px] font-extrabold text-neutral-900 font-mono">
                                    {roll.rollNumber}
                                  </Text>
                                  {roll.variant?.name && (
                                    <Text className="text-[9px] font-bold text-violet-700">
                                      {roll.variant.name}
                                    </Text>
                                  )}
                                </View>
                                <Text className="text-[11px] font-extrabold text-emerald-700">
                                  {Number(roll.remainingSqft).toFixed(0)} sqft
                                </Text>
                                <Pressable
                                  onPress={() => removeRollFromLine(line.productId, roll.id)}
                                  className="h-6 w-6 rounded bg-rose-50 items-center justify-center"
                                >
                                  <X size={10} color="#dc2626" />
                                </Pressable>
                              </View>
                            ))}
                            <Pressable
                              onPress={() => openAddMoreRolls(line.productId)}
                              className="h-8 mt-1 rounded-lg items-center justify-center flex-row gap-1 bg-emerald-100"
                            >
                              <Plus size={11} color="#15803d" />
                              <Text className="text-emerald-700 font-extrabold text-[10px]">Add More Rolls</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Notes */}
              <View className="mb-4">
                <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-2">
                  Notes (optional)
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={2}
                  placeholder="Reason, special instructions..."
                  placeholderTextColor="#9ca3af"
                  className="min-h-[70px] rounded-2xl border-2 border-neutral-200 bg-white p-3 text-sm font-bold text-neutral-900"
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            {/* Footer */}
            <View className="px-5 py-4 border-t border-neutral-200 bg-white">
              {cart.length > 0 && (
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-xs font-bold text-neutral-500">
                    {cart.length} item{cart.length !== 1 ? 's' : ''}
                    {cartCarpetRollCount > 0 && ` • ${cartCarpetRollCount} rolls`}
                  </Text>
                </View>
              )}
              <Pressable
                onPress={handleCreate}
                disabled={createMutation.isPending || cart.length === 0 || !fromShopId || !toShopId}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
                style={{
                  backgroundColor:
                    createMutation.isPending || cart.length === 0 || !fromShopId || !toShopId
                      ? '#9ca3af'
                      : '#0891b2',
                }}
              >
                <Truck size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {createMutation.isPending ? 'Creating...' : 'Create Transfer'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ═════ PRODUCT PICKER MODAL ═════ */}
      <Modal visible={productPickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setProductPickerOpen(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
            <Text className="flex-1 text-lg font-extrabold text-neutral-900">Select Product</Text>
            <Pressable
              onPress={() => setProductPickerOpen(false)}
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
                placeholder="Search product name, SKU..."
                placeholderTextColor="#9ca3af"
                autoFocus
                className="flex-1 text-base text-neutral-900"
              />
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
            {filteredProducts.length === 0 ? (
              <View className="items-center py-12">
                <Package size={40} color="#d1d5db" />
                <Text className="mt-3 text-neutral-500 font-semibold">No products found</Text>
              </View>
            ) : (
              <View className="gap-2">
                {filteredProducts.map((p) => {
                  const isCarpet = isCarpetProduct(p);
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => addProductToCart(p)}
                      className="flex-row items-center gap-3 p-3 rounded-2xl bg-white border-2 border-neutral-200 active:opacity-70"
                    >
                      <View
                        className="h-11 w-11 rounded-xl items-center justify-center overflow-hidden"
                        style={{ backgroundColor: isCarpet ? '#dcfce7' : '#cffafe' }}
                      >
                        {p.images?.[0]?.url ? (
                          <Image source={{ uri: p.images[0].url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        ) : isCarpet ? (
                          <Layers size={18} color="#16a34a" />
                        ) : (
                          <Package size={18} color="#0891b2" />
                        )}
                      </View>
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="font-bold text-neutral-900 text-sm" numberOfLines={1}>{p.name}</Text>
                          {isCarpet && (
                            <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100">
                              <Layers size={8} color="#16a34a" />
                              <Text className="text-[9px] font-extrabold text-emerald-700">CARPET</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-neutral-500 mt-0.5">
                          {p.sku ? `${p.sku} • ` : ''}Stock: {p.stock} {p.unit}
                          {isCarpet && ' • Choose specific rolls'}
                        </Text>
                      </View>
                      {isCarpet ? (
                        <Layers size={16} color="#16a34a" />
                      ) : (
                        <Plus size={16} color="#0891b2" />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ═════ VIEW TRANSFER MODAL ═════ */}
      <Modal visible={!!viewTransfer} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setViewTransfer(null)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          {viewTransfer && (
            <>
              <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
                <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#0891b2' }}>
                  <ArrowRightLeft size={20} color="#ffffff" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-lg font-extrabold text-neutral-900 font-mono" numberOfLines={1}>
                    {viewTransfer.transferNumber}
                  </Text>
                  <Text className="text-[10px] text-neutral-500" numberOfLines={1}>
                    {viewTransfer.fromShop?.name} → {viewTransfer.toShop?.name}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setViewTransfer(null)}
                  hitSlop={12}
                  className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
                >
                  <X size={20} color="#6b7280" />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Status hero */}
                <View
                  className="rounded-3xl p-5 mb-4"
                  style={{ backgroundColor: statusConfig[viewTransfer.status].color }}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                      {(() => {
                        const Icon = statusConfig[viewTransfer.status].icon;
                        return <Icon size={28} color="#ffffff" />;
                      })()}
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                        Status
                      </Text>
                      <Text className="text-2xl font-extrabold text-white mt-0.5">
                        {statusConfig[viewTransfer.status].label}
                      </Text>
                      <Text className="text-xs text-white/80 mt-0.5">
                        Created {formatDate(viewTransfer.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Meta info */}
                <View className="rounded-2xl bg-white border border-neutral-200 p-4 gap-2 mb-3">
                  <View className="flex-row items-center gap-2 py-1">
                    <Building2 size={13} color="#0891b2" />
                    <Text className="text-xs text-neutral-500 flex-1">From Shop</Text>
                    <Text className="text-sm font-extrabold text-neutral-900">{viewTransfer.fromShop?.name}</Text>
                  </View>
                  <View className="flex-row items-center gap-2 py-1">
                    <Building2 size={13} color="#16a34a" />
                    <Text className="text-xs text-neutral-500 flex-1">To Shop</Text>
                    <Text className="text-sm font-extrabold text-neutral-900">{viewTransfer.toShop?.name}</Text>
                  </View>
                  {viewTransfer.receivedAt && (
                    <View className="flex-row items-center gap-2 py-1">
                      <CheckCircle2 size={13} color="#16a34a" />
                      <Text className="text-xs text-neutral-500 flex-1">Received</Text>
                      <Text className="text-sm font-extrabold text-emerald-700">{formatDate(viewTransfer.receivedAt)}</Text>
                    </View>
                  )}
                  {viewTransfer.createdBy && (
                    <View className="flex-row items-center gap-2 py-1">
                      <User size={13} color="#64748b" />
                      <Text className="text-xs text-neutral-500 flex-1">Created By</Text>
                      <Text className="text-sm font-extrabold text-neutral-900">{viewTransfer.createdBy.fullName}</Text>
                    </View>
                  )}
                </View>

                {/* Items */}
                <View className="rounded-2xl bg-white border border-neutral-200 overflow-hidden mb-3">
                  <View className="px-4 py-3 border-b border-neutral-100 flex-row items-center gap-2">
                    <Package size={14} color="#0891b2" />
                    <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                      Items ({viewTransfer.items.length})
                    </Text>
                  </View>
                  {viewTransfer.items.map((item, idx) => {
                    const hasRoll = !!item.carpetRoll;
                    return (
                      <View
                        key={item.id}
                        className={`p-3 flex-row items-center gap-3 ${
                          idx !== viewTransfer.items.length - 1 ? 'border-b border-neutral-100' : ''
                        }`}
                        style={{ backgroundColor: hasRoll ? '#f0fdf4' : undefined }}
                      >
                        <View
                          className="h-10 w-10 rounded-xl items-center justify-center"
                          style={{ backgroundColor: hasRoll ? '#dcfce7' : '#cffafe' }}
                        >
                          {hasRoll ? <Layers size={18} color="#16a34a" /> : <Package size={18} color="#0891b2" />}
                        </View>
                        <View className="flex-1 min-w-0">
                          <Text className="font-extrabold text-sm text-neutral-900" numberOfLines={1}>
                            {item.product.name}
                          </Text>
                          {hasRoll && item.carpetRoll && (
                            <View className="flex-row items-center gap-1 mt-0.5 flex-wrap">
                              <Text className="text-[10px] font-mono font-extrabold text-emerald-700">
                                {item.carpetRoll.rollNumber}
                              </Text>
                              {item.carpetRoll.variant && (
                                <Text className="text-[10px] font-bold text-violet-700">
                                  • {item.carpetRoll.variant.name}
                                </Text>
                              )}
                            </View>
                          )}
                          {item.notes && (
                            <Text className="text-[10px] text-neutral-500 italic mt-0.5">{item.notes}</Text>
                          )}
                        </View>
                        <Text className="text-base font-extrabold text-cyan-700">
                          {item.quantity.toFixed(item.quantity % 1 === 0 ? 0 : 2)} {item.product.unit}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Notes */}
                {viewTransfer.notes && (
                  <View className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-3 mb-3">
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <FileText size={11} color="#b45309" />
                      <Text className="text-[10px] font-extrabold uppercase text-amber-800">Notes</Text>
                    </View>
                    <Text className="text-sm font-bold text-amber-900">{viewTransfer.notes}</Text>
                  </View>
                )}
              </ScrollView>

              {/* Actions */}
              {viewTransfer.status === 'IN_TRANSIT' && (
                <View className="px-5 py-4 border-t border-neutral-200 bg-white flex-row gap-2">
                  <Pressable
                    onPress={() => handleCancel(viewTransfer.id, viewTransfer.transferNumber)}
                    disabled={cancelMutation.isPending}
                    className="flex-1 h-12 rounded-xl bg-rose-50 border-2 border-rose-300 items-center justify-center flex-row gap-1.5"
                  >
                    <XCircle size={16} color="#dc2626" />
                    <Text className="text-rose-700 font-bold text-sm">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleReceive(viewTransfer.id, viewTransfer.transferNumber)}
                    disabled={receiveMutation.isPending}
                    className="flex-1 h-12 rounded-xl items-center justify-center flex-row gap-1.5"
                    style={{ backgroundColor: receiveMutation.isPending ? '#9ca3af' : '#16a34a' }}
                  >
                    <CheckCircle2 size={16} color="#ffffff" />
                    <Text className="text-white font-bold text-sm">
                      {receiveMutation.isPending ? 'Receiving...' : 'Confirm Receive'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* Roll Picker for Transfers */}
      <TransferRollPickerMobile
        visible={!!rollPickerProduct && !!fromShopId}
        productId={rollPickerProduct?.id || ''}
        productName={rollPickerProduct?.name || ''}
        fromShopId={fromShopId}
        excludeRollIds={excludedRollIds}
        onConfirm={handleRollsSelected}
        onClose={() => setRollPickerProduct(null)}
      />
    </SafeAreaView>
  );
}
