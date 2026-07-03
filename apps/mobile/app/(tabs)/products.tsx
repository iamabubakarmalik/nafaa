import { useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl, Image, Modal, ScrollView,
  TextInput, Dimensions, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Search, Package, Plus, AlertTriangle, SlidersHorizontal, Star,
  Building2, Hash, X, TrendingUp, TrendingDown, CheckCheck, Layers,
  Sparkles, Filter, ChevronRight, Upload, Grid3x3, List as ListIcon,
  ArrowUpDown, CheckCircle2, XCircle, Scissors, Eye, EyeOff, Edit3,
  Save, DollarSign, Trash2, Store,
} from 'lucide-react-native';
import { productsApi, type ProductsListParams, type Product } from '@/api/products.api';
import { brandsApi } from '@/api/brands.api';
import { categoriesApi } from '@/api/categories.api';
import { tagsApi } from '@/api/tags.api';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { useCarpetSummary } from '@/hooks/useCarpetSummary';
import { useAuthStore } from '@/store/auth.store';
import { formatPKRFull, formatPKR } from '@/lib/format';
import Toast from 'react-native-toast-message';

type ViewMode = 'grid' | 'list';
type SortBy = 'newest' | 'oldest' | 'name' | 'price-low' | 'price-high' | 'stock-low' | 'stock-high';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;
const CARD_WIDTH = (SCREEN_W - GRID_PADDING * 2 - GRID_GAP) / 2;
const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);
const EMPTY_LIST = { items: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };

const SORT_LABELS: Record<SortBy, string> = {
  newest: 'Newest First',
  oldest: 'Oldest First',
  name: 'Name A-Z',
  'price-low': 'Price: Low → High',
  'price-high': 'Price: High → Low',
  'stock-low': 'Stock: Low → High',
  'stock-high': 'Stock: High → Low',
};

export default function ProductsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { businessType, features } = useBusinessFeatures();
  const tenant = useAuthStore((s) => s.tenant);

  const isCarpetBusiness = useMemo(() => {
    const type = (businessType ?? '').toUpperCase();
    return type === 'CARPET' || type === 'FLOORING' || features?.lengthWidthCalc === true;
  }, [businessType, features]);

  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null);
  const [params, setParams] = useState<ProductsListParams>({
    search: '', page: 1, limit: 30, stockStatus: 'all',
  });

  const { data = EMPTY_LIST, refetch, isLoading } = useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      try { return (await productsApi.list(params)) ?? EMPTY_LIST; }
      catch { return EMPTY_LIST; }
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => { try { const r = await brandsApi.list(); return Array.isArray(r) ? r : []; } catch { return []; } },
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { try { const r = await categoriesApi.list(); return Array.isArray(r) ? r : []; } catch { return []; } },
  });
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => { try { const r = await tagsApi.list(); return Array.isArray(r) ? r : []; } catch { return []; } },
  });

  const items = data?.items ?? [];
  const total = data?.meta?.total ?? items.length;
  const productIds = useMemo(() => items.map((p) => p.id), [items]);

  const { data: carpetSummary = [] } = useCarpetSummary(
    productIds,
    isCarpetBusiness && productIds.length > 0,
  );
  const carpetSummaryMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of carpetSummary) map.set(s.productId, s);
    return map;
  }, [carpetSummary]);

  const isCarpetProduct = (p: Product) => isCarpetBusiness && CARPET_UNITS.has(p.unit);

  const sortedItems = useMemo(() => {
    const list = [...items];
    return list.sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name': return a.name.localeCompare(b.name);
        case 'price-low': return Number(a.price) - Number(b.price);
        case 'price-high': return Number(b.price) - Number(a.price);
        case 'stock-low': return (a.stock ?? 0) - (b.stock ?? 0);
        case 'stock-high': return (b.stock ?? 0) - (a.stock ?? 0);
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [items, sortBy]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const activeFilterCount =
    (params.brandId ? 1 : 0) + (params.categoryId ? 1 : 0) + (params.tagId ? 1 : 0) +
    (params.stockStatus && params.stockStatus !== 'all' ? 1 : 0);

  const stats = useMemo(() => {
    const active = items.filter((p) => p.isActive).length;
    const featured = items.filter((p) => p.isFeatured).length;
    const lowStock = items.filter((p) => !isCarpetProduct(p) && p.stock > 0 && p.stock <= p.lowStockAlert).length;
    const outOfStock = items.filter((p) => !isCarpetProduct(p) && p.stock === 0).length;
    const totalValue = items.reduce((s, p) => s + Number(p.price) * (p.stock ?? 0), 0);
    return { active, featured, lowStock, outOfStock, totalValue };
  }, [items]);

  const carpetStats = useMemo(() => {
    if (!isCarpetBusiness) return null;
    const totalSqft = carpetSummary.reduce((acc, s) => acc + s.totalSqft, 0);
    const totalRolls = carpetSummary.reduce((acc, s) => acc + s.rollCount, 0);
    return { totalSqft, totalRolls };
  }, [carpetSummary, isCarpetBusiness]);

  const bulkMutation = useMutation({
    mutationFn: (action: 'activate' | 'deactivate' | 'delete' | 'feature' | 'unfeature') =>
      productsApi.bulkAction(Array.from(selected), action),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: `Action applied to ${selected.size} products` });
      setSelected(new Set());
      setSelectionMode(false);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const toggleSelect = (id: string) => {
    Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const enterSelectionMode = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectionMode(true);
    setSelected(new Set([id]));
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelected(new Set());
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      {selectionMode ? (
        <View className="px-5 pt-4 pb-3 flex-row items-center gap-3" style={{ backgroundColor: '#f59e0b' }}>
          <Pressable onPress={exitSelectionMode} className="h-11 w-11 rounded-2xl bg-white/20 items-center justify-center">
            <X size={20} color="#ffffff" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-white font-extrabold text-lg">{selected.size} selected</Text>
            <Pressable onPress={() => {
              if (selected.size === sortedItems.length) setSelected(new Set());
              else setSelected(new Set(sortedItems.map((p) => p.id)));
            }}>
              <Text className="text-white/80 text-xs font-bold underline">
                {selected.size === sortedItems.length ? 'Deselect all' : `Select all ${sortedItems.length}`}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {/* ═════ HERO HEADER (POS style — aligned & premium) ═════ */}
          <View className="mx-4 mt-3 rounded-3xl overflow-hidden" style={{
            backgroundColor: '#065f46',
            shadowColor: '#16a34a',
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}>
            <View className="p-4">
              <View className="flex-row items-center gap-3 mb-3">
                <View
                  className="h-11 w-11 rounded-2xl bg-white/15 items-center justify-center"
                  style={{ borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }}
                >
                  <Package size={20} color="#ffffff" />
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-2 flex-wrap">
                    <Text className="text-lg font-extrabold text-white">Products</Text>
                    {isCarpetBusiness && (
                      <View className="px-1.5 py-0.5 rounded" style={{
                        backgroundColor: 'rgba(16,185,129,0.3)',
                        borderWidth: 1,
                        borderColor: 'rgba(110,231,183,0.4)',
                      }}>
                        <Text className="text-[9px] font-extrabold text-white uppercase">🧶 Carpet</Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row items-center gap-1 mt-1">
                    <Sparkles size={9} color="#fde68a" />
                    <Text className="text-[11px] text-white/80 font-semibold" numberOfLines={1}>
                      {tenant?.name || 'My Shop'} • {total} items • {formatPKR(stats.totalValue)}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-1.5">
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push('/products/bulk-import' as any);
                    }}
                    className="h-10 w-10 rounded-xl bg-white/15 items-center justify-center"
                    style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <Upload size={16} color="#ffffff" />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push('/products/new');
                    }}
                    className="h-10 px-3 rounded-xl bg-white flex-row items-center gap-1"
                  >
                    <Plus size={14} color="#065f46" />
                    <Text className="font-extrabold text-emerald-900 text-xs">New</Text>
                  </Pressable>
                </View>
              </View>

              {/* Quick stats strip */}
              <View className="flex-row items-center gap-1.5 flex-wrap">
                <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <CheckCheck size={10} color="#6ee7b7" />
                  <Text className="text-[9px] font-extrabold text-white uppercase tracking-wider">{stats.active} Active</Text>
                </View>
                {stats.featured > 0 && (
                  <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(245,158,11,0.3)', borderWidth: 1, borderColor: 'rgba(252,211,77,0.4)' }}>
                    <Star size={10} color="#fde68a" fill="#fde68a" />
                    <Text className="text-[9px] font-extrabold text-white">{stats.featured} Featured</Text>
                  </View>
                )}
                {stats.lowStock > 0 && (
                  <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(251,146,60,0.3)', borderWidth: 1, borderColor: 'rgba(253,186,116,0.4)' }}>
                    <AlertTriangle size={10} color="#fed7aa" />
                    <Text className="text-[9px] font-extrabold text-white">{stats.lowStock} Low</Text>
                  </View>
                )}
                {stats.outOfStock > 0 && (
                  <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(244,63,94,0.3)', borderWidth: 1, borderColor: 'rgba(252,165,165,0.4)' }}>
                    <XCircle size={10} color="#fecaca" />
                    <Text className="text-[9px] font-extrabold text-white">{stats.outOfStock} Out</Text>
                  </View>
                )}
                {carpetStats && carpetStats.totalRolls > 0 && (
                  <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(20,184,166,0.3)', borderWidth: 1, borderColor: 'rgba(94,234,212,0.4)' }}>
                    <Layers size={10} color="#5eead4" />
                    <Text className="text-[9px] font-extrabold text-white">{carpetStats.totalSqft.toFixed(0)} sqft</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Search bar */}
          <View className="px-4 pt-3 pb-2 flex-row gap-2">
            <View className="flex-1 flex-row items-center gap-2 rounded-2xl border-2 border-neutral-200 bg-white px-3 h-11">
              <Search size={16} color="#9ca3af" />
              <TextInput
                placeholder="Search name, SKU, barcode..."
                placeholderTextColor="#9ca3af"
                value={params.search ?? ''}
                onChangeText={(s) => setParams({ ...params, search: s, page: 1 })}
                className="flex-1 text-sm font-semibold text-neutral-900"
              />
              {(params.search ?? '').length > 0 && (
                <Pressable onPress={() => setParams({ ...params, search: '' })} hitSlop={8}>
                  <X size={14} color="#9ca3af" />
                </Pressable>
              )}
            </View>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFilters(true); }}
              className="h-11 w-11 rounded-2xl items-center justify-center"
              style={{
                backgroundColor: activeFilterCount > 0 ? '#16a34a' : '#ffffff',
                borderWidth: 2,
                borderColor: activeFilterCount > 0 ? '#16a34a' : '#e5e7eb',
              }}
            >
              <SlidersHorizontal size={18} color={activeFilterCount > 0 ? '#ffffff' : '#6b7280'} />
              {activeFilterCount > 0 && (
                <View className="absolute -top-1 -right-1 h-4 w-4 rounded-full items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
                  <Text className="text-[9px] font-extrabold text-amber-950">{activeFilterCount}</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* View toggle + sort + quick filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingBottom: 10 }}>
            <View className="flex-row rounded-xl bg-white border-2 border-neutral-200 overflow-hidden">
              <Pressable
                onPress={() => setViewMode('grid')}
                className="h-8 px-2.5 items-center justify-center flex-row gap-1"
                style={{ backgroundColor: viewMode === 'grid' ? '#065f46' : 'transparent' }}
              >
                <Grid3x3 size={12} color={viewMode === 'grid' ? '#ffffff' : '#64748b'} />
                <Text className="text-[11px] font-extrabold" style={{ color: viewMode === 'grid' ? '#ffffff' : '#64748b' }}>Grid</Text>
              </Pressable>
              <Pressable
                onPress={() => setViewMode('list')}
                className="h-8 px-2.5 items-center justify-center flex-row gap-1"
                style={{ backgroundColor: viewMode === 'list' ? '#065f46' : 'transparent' }}
              >
                <ListIcon size={12} color={viewMode === 'list' ? '#ffffff' : '#64748b'} />
                <Text className="text-[11px] font-extrabold" style={{ color: viewMode === 'list' ? '#ffffff' : '#64748b' }}>List</Text>
              </Pressable>
            </View>

            <Pressable onPress={() => setShowSort(true)} className="flex-row items-center gap-1 h-8 px-2.5 rounded-xl bg-white border-2 border-neutral-200">
              <ArrowUpDown size={12} color="#64748b" />
              <Text className="text-[11px] font-extrabold text-neutral-700">{SORT_LABELS[sortBy]}</Text>
            </Pressable>

            {(['all', 'in', 'low', 'out'] as const).map((s) => {
              const active = params.stockStatus === s;
              const config = {
                all: { label: 'All', color: '#0f172a' },
                in: { label: 'In Stock', color: '#16a34a' },
                low: { label: 'Low', color: '#f59e0b' },
                out: { label: 'Out', color: '#dc2626' },
              }[s];
              return (
                <Pressable
                  key={s}
                  onPress={() => { Haptics.selectionAsync(); setParams({ ...params, stockStatus: s, page: 1 }); }}
                  className="h-8 px-2.5 rounded-xl border-2 items-center justify-center"
                  style={{
                    backgroundColor: active ? config.color : '#ffffff',
                    borderColor: active ? config.color : '#e5e7eb',
                  }}
                >
                  <Text className="text-[11px] font-extrabold" style={{ color: active ? '#ffffff' : '#374151' }}>{config.label}</Text>
                </Pressable>
              );
            })}

            {isCarpetBusiness && (
              <Pressable
                onPress={() => router.push('/industries/carpet/rolls' as any)}
                className="h-8 px-2.5 rounded-xl border-2 border-emerald-300 bg-emerald-50 flex-row items-center gap-1"
              >
                <Layers size={12} color="#16a34a" />
                <Text className="text-[11px] font-extrabold text-emerald-700">Rolls</Text>
                <ChevronRight size={10} color="#16a34a" />
              </Pressable>
            )}
          </ScrollView>
        </>
      )}

      {/* PRODUCTS LIST */}
      <FlatList
        data={sortedItems}
        keyExtractor={(p) => p.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        contentContainerStyle={{
          paddingHorizontal: viewMode === 'grid' ? GRID_PADDING : 16,
          paddingBottom: selectionMode ? 100 : 40,
          paddingTop: 4,
        }}
        columnWrapperStyle={viewMode === 'grid' ? { gap: GRID_GAP, marginBottom: GRID_GAP } : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        ItemSeparatorComponent={viewMode === 'list' ? () => <View className="h-2" /> : undefined}
        ListEmptyComponent={!isLoading ? (
          <View className="items-center py-20 px-10">
            <View className="h-24 w-24 rounded-3xl bg-emerald-100 items-center justify-center">
              <Package size={42} color="#16a34a" />
            </View>
            <Text className="mt-5 text-xl font-bold text-neutral-900">
              {params.search ? 'No results' : 'No products yet'}
            </Text>
            <Text className="mt-1 text-sm text-neutral-500 text-center">
              {params.search ? 'Try different search' : 'Add your first product'}
            </Text>
            {!params.search && (
              <Pressable onPress={() => router.push('/products/new')} className="mt-6 h-12 px-5 rounded-2xl flex-row items-center gap-2" style={{ backgroundColor: '#16a34a' }}>
                <Plus size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">Add Product</Text>
              </Pressable>
            )}
          </View>
        ) : null}
        renderItem={({ item }) => {
          const isCarpet = isCarpetProduct(item);
          const carpetData = isCarpet ? carpetSummaryMap.get(item.id) : undefined;
          const isSelected = selected.has(item.id);

          if (viewMode === 'list') {
            return (
              <ProductListItem
                product={item}
                isCarpet={isCarpet}
                carpetData={carpetData}
                isSelected={isSelected}
                selectionMode={selectionMode}
                onPress={() => {
                  if (selectionMode) toggleSelect(item.id);
                  else { Haptics.selectionAsync(); router.push(`/products/${item.id}`); }
                }}
                onLongPress={() => enterSelectionMode(item.id)}
                onQuickEdit={() => setQuickEditProduct(item)}
                router={router}
              />
            );
          }

          return (
            <ProductGridCard
              product={item}
              isCarpet={isCarpet}
              carpetData={carpetData}
              isSelected={isSelected}
              selectionMode={selectionMode}
              onPress={() => {
                if (selectionMode) toggleSelect(item.id);
                else { Haptics.selectionAsync(); router.push(`/products/${item.id}`); }
              }}
              onLongPress={() => enterSelectionMode(item.id)}
              onQuickEdit={() => setQuickEditProduct(item)}
              router={router}
            />
          );
        }}
      />

      {selectionMode && selected.size > 0 && (
        <View className="absolute left-0 right-0 bottom-0 border-t border-neutral-200 bg-white p-3" style={{ shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 12 }}>
          <View className="flex-row gap-2">
            <Pressable onPress={() => bulkMutation.mutate('activate')} className="flex-1 h-11 rounded-xl bg-emerald-600 items-center justify-center flex-row gap-1">
              <CheckCircle2 size={14} color="#ffffff" />
              <Text className="text-white font-extrabold text-xs">Activate</Text>
            </Pressable>
            <Pressable onPress={() => bulkMutation.mutate('feature')} className="flex-1 h-11 rounded-xl bg-amber-600 items-center justify-center flex-row gap-1">
              <Star size={14} color="#ffffff" />
              <Text className="text-white font-extrabold text-xs">Feature</Text>
            </Pressable>
            <Pressable onPress={() => bulkMutation.mutate('deactivate')} className="flex-1 h-11 rounded-xl bg-slate-600 items-center justify-center flex-row gap-1">
              <EyeOff size={14} color="#ffffff" />
              <Text className="text-white font-extrabold text-xs">Deactivate</Text>
            </Pressable>
            <Pressable onPress={() => Alert.alert('Delete Products?', `Delete ${selected.size} products?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => bulkMutation.mutate('delete') },
            ])} className="h-11 px-3 rounded-xl bg-rose-600 items-center justify-center">
              <Trash2 size={14} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Filters Modal */}
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[85%]">
            <View className="items-center pt-3 pb-1">
              <View className="h-1 w-10 rounded-full bg-neutral-300" />
            </View>
            <View className="flex-row items-center justify-between px-5 py-3 border-b border-neutral-200">
              <View className="flex-row items-center gap-2">
                <Filter size={20} color="#16a34a" />
                <Text className="text-lg font-bold text-neutral-900">Filters</Text>
              </View>
              <Pressable onPress={() => setShowFilters(false)} className="h-9 w-9 rounded-2xl bg-neutral-100 items-center justify-center">
                <X size={18} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {brands.length > 0 && (
                <View className="mb-5">
                  <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Brand</Text>
                  <View className="flex-row flex-wrap gap-2">
                    <Pressable onPress={() => setParams({ ...params, brandId: undefined })} className="px-4 py-2.5 rounded-xl border-2" style={{ backgroundColor: !params.brandId ? '#7c3aed' : '#ffffff', borderColor: !params.brandId ? '#7c3aed' : '#e5e7eb' }}>
                      <Text className="text-sm font-bold" style={{ color: !params.brandId ? '#ffffff' : '#374151' }}>All</Text>
                    </Pressable>
                    {brands.map((b: any) => {
                      const active = params.brandId === b.id;
                      return (
                        <Pressable key={b.id} onPress={() => setParams({ ...params, brandId: active ? undefined : b.id })} className="px-4 py-2.5 rounded-xl border-2" style={{ backgroundColor: active ? '#7c3aed' : '#ffffff', borderColor: active ? '#7c3aed' : '#e5e7eb' }}>
                          <Text className="text-sm font-bold" style={{ color: active ? '#ffffff' : '#374151' }}>{b.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {categories.length > 0 && (
                <View className="mb-5">
                  <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Category</Text>
                  <View className="flex-row flex-wrap gap-2">
                    <Pressable onPress={() => setParams({ ...params, categoryId: undefined })} className="px-4 py-2.5 rounded-xl border-2" style={{ backgroundColor: !params.categoryId ? '#16a34a' : '#ffffff', borderColor: !params.categoryId ? '#16a34a' : '#e5e7eb' }}>
                      <Text className="text-sm font-bold" style={{ color: !params.categoryId ? '#ffffff' : '#374151' }}>All</Text>
                    </Pressable>
                    {categories.map((c: any) => {
                      const active = params.categoryId === c.id;
                      return (
                        <Pressable key={c.id} onPress={() => setParams({ ...params, categoryId: active ? undefined : c.id })} className="px-4 py-2.5 rounded-xl border-2" style={{ backgroundColor: active ? c.color || '#16a34a' : '#ffffff', borderColor: active ? c.color || '#16a34a' : '#e5e7eb' }}>
                          <Text className="text-sm font-bold" style={{ color: active ? '#ffffff' : '#374151' }}>{c.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {tags.length > 0 && (
                <View>
                  <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Tags</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {tags.map((tg: any) => {
                      const active = params.tagId === tg.id;
                      return (
                        <Pressable key={tg.id} onPress={() => setParams({ ...params, tagId: active ? undefined : tg.id })} className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl border-2" style={{ borderColor: active ? tg.color : '#e5e7eb', backgroundColor: active ? `${tg.color}20` : '#ffffff' }}>
                          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: tg.color }} />
                          <Text className="text-sm font-bold" style={{ color: active ? tg.color : '#374151' }}>{tg.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 flex-row gap-2">
              <Pressable onPress={() => setParams({ search: params.search, page: 1, limit: 30, stockStatus: 'all' })} className="flex-1 h-12 rounded-2xl bg-neutral-100 items-center justify-center">
                <Text className="font-bold text-neutral-700">Clear All</Text>
              </Pressable>
              <Pressable onPress={() => setShowFilters(false)} className="flex-1 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: '#16a34a' }}>
                <Text className="text-white font-bold">Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal visible={showSort} animationType="fade" transparent onRequestClose={() => setShowSort(false)}>
        <Pressable onPress={() => setShowSort(false)} className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl">
            <View className="items-center pt-3 pb-1">
              <View className="h-1 w-10 rounded-full bg-neutral-300" />
            </View>
            <View className="px-5 py-3 border-b border-neutral-200 flex-row items-center gap-2">
              <ArrowUpDown size={18} color="#16a34a" />
              <Text className="text-lg font-bold text-neutral-900">Sort By</Text>
            </View>
            <View className="py-2">
              {(Object.keys(SORT_LABELS) as SortBy[]).map((s) => {
                const active = sortBy === s;
                return (
                  <Pressable key={s} onPress={() => { Haptics.selectionAsync(); setSortBy(s); setShowSort(false); }} className="px-5 py-3 flex-row items-center justify-between">
                    <Text className="text-sm font-bold" style={{ color: active ? '#16a34a' : '#374151' }}>{SORT_LABELS[s]}</Text>
                    {active && <CheckCircle2 size={18} color="#16a34a" />}
                  </Pressable>
                );
              })}
            </View>
            <View className="h-4" />
          </Pressable>
        </Pressable>
      </Modal>

      {quickEditProduct && (
        <QuickEditModal
          product={quickEditProduct}
          onClose={() => setQuickEditProduct(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setQuickEditProduct(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function ProductGridCard({ product: p, isCarpet, carpetData, isSelected, selectionMode, onPress, onLongPress, onQuickEdit, router }: any) {
  const primaryImage = p.images?.[0]?.url;
  const isLow = !isCarpet && p.stock > 0 && p.stock <= p.lowStockAlert;
  const isOut = !isCarpet && p.stock === 0;
  const carpetSqft = carpetData?.totalSqft ?? 0;
  const rollCount = carpetData?.rollCount ?? 0;

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={400} className="active:opacity-80" style={{ width: CARD_WIDTH }}>
      <View className="rounded-2xl bg-white overflow-hidden" style={{
        borderWidth: 2,
        borderColor: isSelected ? '#f59e0b' : '#e5e7eb',
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
      }}>
        <View className="bg-neutral-100 relative" style={{ width: CARD_WIDTH - 4, height: CARD_WIDTH - 4 }}>
          {primaryImage ? (
            <Image source={{ uri: primaryImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Package size={42} color="#9ca3af" />
            </View>
          )}

          {isCarpet && (
            <View className="absolute top-0 left-0 px-2 py-0.5 rounded-br-lg" style={{ backgroundColor: '#16a34a' }}>
              <Text className="text-white text-[9px] font-extrabold uppercase">Carpet</Text>
            </View>
          )}

          {(selectionMode || isSelected) && (
            <View className="absolute top-2 right-2 h-7 w-7 rounded-lg items-center justify-center" style={{
              backgroundColor: isSelected ? '#f59e0b' : 'rgba(255,255,255,0.9)',
              borderWidth: 2,
              borderColor: isSelected ? '#f59e0b' : '#ffffff',
            }}>
              {isSelected && <CheckCircle2 size={14} color="#ffffff" />}
            </View>
          )}

          {p.isFeatured && !selectionMode && (
            <View className="absolute top-2 right-2 h-7 w-7 rounded-full items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
              <Star size={13} color="#ffffff" fill="#ffffff" />
            </View>
          )}

          <View className="absolute bottom-2 left-2 flex-row gap-1">
            {isOut ? (
              <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: '#dc2626' }}>
                <Text className="text-white text-[10px] font-extrabold">OUT</Text>
              </View>
            ) : isLow ? (
              <View className="flex-row items-center gap-0.5 px-2 py-0.5 rounded-md" style={{ backgroundColor: '#f59e0b' }}>
                <AlertTriangle size={9} color="#ffffff" />
                <Text className="text-white text-[10px] font-extrabold">LOW</Text>
              </View>
            ) : null}
            {!p.isActive && (
              <View className="px-2 py-0.5 rounded-md bg-neutral-900/80">
                <Text className="text-white text-[9px] font-extrabold">OFF</Text>
              </View>
            )}
          </View>
        </View>

        <View className="p-3">
          {p.brand && (
            <Text className="text-[9px] uppercase tracking-wider text-violet-700 font-extrabold mb-0.5" numberOfLines={1}>{p.brand.name}</Text>
          )}
          <Text className="font-bold text-neutral-900 text-sm leading-tight" numberOfLines={2} style={{ minHeight: 36 }}>{p.name}</Text>

          <View className="flex-row items-end justify-between mt-2">
            <Text className="font-extrabold text-emerald-700 text-base">{formatPKRFull(p.price)}</Text>
            {isCarpet ? (
              rollCount > 0 ? (
                <Text className="text-[10px] font-extrabold text-emerald-700">{carpetSqft.toFixed(0)} sqft</Text>
              ) : (
                <Text className="text-[10px] font-extrabold text-amber-600">No rolls</Text>
              )
            ) : (
              <Text className={`text-[10px] font-extrabold ${isOut ? 'text-rose-600' : isLow ? 'text-amber-700' : 'text-neutral-500'}`}>{p.stock} {p.unit}</Text>
            )}
          </View>

          {isCarpet && rollCount > 0 && (
            <View className="flex-row gap-1 mt-1.5">
              <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                <Layers size={8} color="#16a34a" />
                <Text className="text-[9px] font-bold text-emerald-700">{rollCount} rolls</Text>
              </View>
            </View>
          )}

          {!selectionMode && (
            <View className="flex-row gap-1 mt-2 pt-2 border-t border-neutral-100">
              <Pressable onPress={onQuickEdit} className="flex-1 h-7 rounded-lg bg-blue-50 items-center justify-center flex-row gap-0.5">
                <Edit3 size={10} color="#2563eb" />
                <Text className="text-[10px] font-extrabold text-blue-700">Edit</Text>
              </Pressable>
              {isCarpet && (
                <Pressable onPress={() => router.push(`/industries/carpet/rolls?productId=${p.id}` as any)} className="h-7 w-7 rounded-lg bg-emerald-50 items-center justify-center">
                  <Layers size={11} color="#16a34a" />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function ProductListItem({ product: p, isCarpet, carpetData, isSelected, selectionMode, onPress, onLongPress, onQuickEdit, router }: any) {
  const primaryImage = p.images?.[0]?.url;
  const isLow = !isCarpet && p.stock > 0 && p.stock <= p.lowStockAlert;
  const isOut = !isCarpet && p.stock === 0;

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={400} className="rounded-2xl bg-white p-3 flex-row items-center gap-3 active:opacity-70" style={{ borderWidth: 2, borderColor: isSelected ? '#f59e0b' : '#e5e7eb' }}>
      {selectionMode && (
        <View className="h-6 w-6 rounded-lg items-center justify-center" style={{
          backgroundColor: isSelected ? '#f59e0b' : '#ffffff',
          borderWidth: 2,
          borderColor: isSelected ? '#f59e0b' : '#cbd5e1',
        }}>
          {isSelected && <CheckCircle2 size={12} color="#ffffff" />}
        </View>
      )}

      <View className="h-14 w-14 rounded-xl bg-neutral-100 overflow-hidden relative">
        {primaryImage ? (
          <Image source={{ uri: primaryImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Package size={22} color="#9ca3af" />
          </View>
        )}
        {p.isFeatured && (
          <View className="absolute -top-1 -right-1 h-5 w-5 rounded-full items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
            <Star size={9} color="#ffffff" fill="#ffffff" />
          </View>
        )}
      </View>

      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-1.5 flex-wrap">
          {p.brand && <Text className="text-[9px] uppercase font-extrabold text-violet-700">{p.brand.name}</Text>}
          {isCarpet && (
            <View className="px-1.5 py-0.5 rounded bg-emerald-100">
              <Text className="text-[9px] font-extrabold text-emerald-700">CARPET</Text>
            </View>
          )}
        </View>
        <Text className="text-sm font-extrabold text-neutral-900 mt-0.5" numberOfLines={1}>{p.name}</Text>
        <View className="flex-row items-center gap-2 mt-1">
          <Text className="text-sm font-extrabold text-emerald-700">{formatPKRFull(p.price)}</Text>
          <Text className="text-neutral-400 text-xs">•</Text>
          {isCarpet ? (
            <Text className="text-xs font-extrabold text-emerald-700">{(carpetData?.totalSqft ?? 0).toFixed(0)} sqft ({carpetData?.rollCount ?? 0})</Text>
          ) : (
            <Text className={`text-xs font-extrabold ${isOut ? 'text-rose-600' : isLow ? 'text-amber-700' : 'text-neutral-600'}`}>{p.stock} {p.unit}</Text>
          )}
        </View>
      </View>

      {!selectionMode && (
        <View className="gap-1">
          <Pressable onPress={(e) => { e.stopPropagation(); onQuickEdit(); }} className="h-8 w-8 rounded-lg bg-blue-100 items-center justify-center">
            <Edit3 size={12} color="#2563eb" />
          </Pressable>
          {isCarpet && (
            <Pressable onPress={(e) => { e.stopPropagation(); router.push(`/industries/carpet/rolls?productId=${p.id}` as any); }} className="h-8 w-8 rounded-lg bg-emerald-100 items-center justify-center">
              <Layers size={12} color="#16a34a" />
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

function QuickEditModal({ product, onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    price: String(Number(product.price) || 0),
    costPrice: String(Number(product.costPrice) || 0),
    wholesalePrice: String(Number(product.wholesalePrice) || 0),
    stock: String(Number(product.stock) || 0),
    lowStockAlert: String(Number(product.lowStockAlert) || 5),
    isActive: product.isActive,
    isFeatured: product.isFeatured,
  });

  const updateMutation = useMutation({
    mutationFn: () => productsApi.update(product.id, {
      price: Number(form.price),
      costPrice: Number(form.costPrice),
      wholesalePrice: Number(form.wholesalePrice) || undefined,
      stock: Number(form.stock),
      lowStockAlert: Number(form.lowStockAlert),
      isActive: form.isActive,
      isFeatured: form.isFeatured,
    }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: `${product.name} updated` });
      onSuccess();
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const price = Number(form.price) || 0;
  const cost = Number(form.costPrice) || 0;
  const margin = price > 0 && cost > 0 ? ((price - cost) / price) * 100 : 0;

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-neutral-50">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3" style={{ backgroundColor: '#2563eb' }}>
            <View className="h-11 w-11 rounded-2xl bg-white/20 items-center justify-center">
              <Edit3 size={20} color="#ffffff" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-white/80 text-[10px] font-extrabold uppercase">Quick Edit</Text>
              <Text className="text-white text-lg font-extrabold" numberOfLines={1}>{product.name}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} className="h-10 w-10 rounded-2xl bg-white/20 items-center justify-center">
              <X size={20} color="#ffffff" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View className="rounded-2xl bg-white border-2 border-blue-200 p-4 mb-3">
              <Text className="text-xs font-extrabold uppercase tracking-wider text-blue-700 mb-3">Pricing</Text>
              <Text className="text-[10px] uppercase font-extrabold text-neutral-500 mb-1">Sell Price *</Text>
              <TextInput value={form.price} onChangeText={(t) => setForm({ ...form, price: t })} keyboardType="decimal-pad" className="h-12 rounded-xl border-2 border-emerald-200 bg-emerald-50/40 px-3 text-lg font-extrabold text-emerald-900 mb-3" />

              <Text className="text-[10px] uppercase font-extrabold text-neutral-500 mb-1">Cost Price</Text>
              <TextInput value={form.costPrice} onChangeText={(t) => setForm({ ...form, costPrice: t })} keyboardType="decimal-pad" className="h-12 rounded-xl border-2 border-blue-200 bg-blue-50/40 px-3 text-lg font-extrabold text-blue-900 mb-3" />

              <Text className="text-[10px] uppercase font-extrabold text-neutral-500 mb-1">Wholesale Price</Text>
              <TextInput value={form.wholesalePrice} onChangeText={(t) => setForm({ ...form, wholesalePrice: t })} keyboardType="decimal-pad" className="h-12 rounded-xl border-2 border-amber-200 bg-amber-50/40 px-3 text-lg font-extrabold text-amber-900" />

              {margin > 0 && (
                <View className="rounded-xl bg-emerald-100 p-3 mt-3">
                  <Text className="text-[10px] uppercase font-extrabold text-emerald-700">Profit Margin</Text>
                  <Text className="text-lg font-extrabold text-emerald-900">{margin.toFixed(1)}%</Text>
                </View>
              )}
            </View>

            <View className="rounded-2xl bg-white border-2 border-emerald-200 p-4 mb-3">
              <Text className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 mb-3">Stock</Text>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Text className="text-[10px] uppercase font-extrabold text-neutral-500 mb-1">Current ({product.unit})</Text>
                  <TextInput value={form.stock} onChangeText={(t) => setForm({ ...form, stock: t })} keyboardType="decimal-pad" className="h-12 rounded-xl border-2 border-emerald-200 bg-white px-3 text-lg font-extrabold text-slate-900" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] uppercase font-extrabold text-neutral-500 mb-1">Low Alert</Text>
                  <TextInput value={form.lowStockAlert} onChangeText={(t) => setForm({ ...form, lowStockAlert: t })} keyboardType="decimal-pad" className="h-12 rounded-xl border-2 border-amber-200 bg-white px-3 text-lg font-extrabold text-slate-900" />
                </View>
              </View>
            </View>

            <View className="rounded-2xl bg-white border-2 border-slate-200 p-4 mb-3 gap-2">
              <Pressable onPress={() => setForm({ ...form, isActive: !form.isActive })} className="flex-row items-center gap-3 p-3 rounded-xl border-2" style={{ backgroundColor: form.isActive ? '#dcfce7' : '#ffffff', borderColor: form.isActive ? '#16a34a' : '#e5e7eb' }}>
                <View className="h-6 w-6 rounded-lg items-center justify-center" style={{ backgroundColor: form.isActive ? '#16a34a' : '#ffffff', borderWidth: 2, borderColor: form.isActive ? '#16a34a' : '#cbd5e1' }}>
                  {form.isActive && <CheckCircle2 size={14} color="#ffffff" />}
                </View>
                <Eye size={16} color="#64748b" />
                <Text className="flex-1 text-sm font-extrabold text-slate-800">Active</Text>
              </Pressable>
              <Pressable onPress={() => setForm({ ...form, isFeatured: !form.isFeatured })} className="flex-row items-center gap-3 p-3 rounded-xl border-2" style={{ backgroundColor: form.isFeatured ? '#fef3c7' : '#ffffff', borderColor: form.isFeatured ? '#f59e0b' : '#e5e7eb' }}>
                <View className="h-6 w-6 rounded-lg items-center justify-center" style={{ backgroundColor: form.isFeatured ? '#f59e0b' : '#ffffff', borderWidth: 2, borderColor: form.isFeatured ? '#f59e0b' : '#cbd5e1' }}>
                  {form.isFeatured && <Star size={14} color="#ffffff" fill="#ffffff" />}
                </View>
                <Star size={16} color="#f59e0b" />
                <Text className="flex-1 text-sm font-extrabold text-slate-800">Featured</Text>
              </Pressable>
            </View>
          </ScrollView>

          <View className="px-5 py-4 border-t border-neutral-200 bg-white">
            <Pressable onPress={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="h-14 rounded-2xl items-center justify-center flex-row gap-2" style={{ backgroundColor: updateMutation.isPending ? '#94a3b8' : '#2563eb', shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 }}>
              <Save size={20} color="#ffffff" />
              <Text className="text-white font-extrabold text-base">{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
