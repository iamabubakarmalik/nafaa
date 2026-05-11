import { useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl, Image, Modal, ScrollView,
  TextInput, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Search, Package, Plus, AlertTriangle, SlidersHorizontal, Star,
  Building2, Hash, X, TrendingUp, TrendingDown, CheckCheck, Layers,
  Sparkles, Filter, ChevronRight,
} from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { productsApi, type ProductsListParams } from '@/api/products.api';
import { brandsApi } from '@/api/brands.api';
import { categoriesApi } from '@/api/categories.api';
import { tagsApi } from '@/api/tags.api';
import { formatPKRFull } from '@/lib/format';

import { useTranslation } from '@/i18n/useTranslation';
const { width: SCREEN_W } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;
const CARD_WIDTH = (SCREEN_W - GRID_PADDING * 2 - GRID_GAP) / 2;

const EMPTY_LIST = {
  items: [],
  meta: { page: 1, limit: 0, total: 0, totalPages: 0 },
};

export default function ProductsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [params, setParams] = useState<ProductsListParams>({
    search: '',
    page: 1,
    limit: 30,
    stockStatus: 'all',
  });

  const { data = EMPTY_LIST, refetch, isLoading } = useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      try {
        const res = await productsApi.list(params);
        return res ?? EMPTY_LIST;
      } catch {
        return EMPTY_LIST;
      }
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      try {
        const res = await brandsApi.list();
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const res = await categoriesApi.list();
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      try {
        const res = await tagsApi.list();
        return Array.isArray(res) ? res : [];
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

  const items = data?.items ?? [];
  const total = data?.meta?.total ?? items.length;

  const activeFilterCount =
    (params.brandId ? 1 : 0) +
    (params.categoryId ? 1 : 0) +
    (params.tagId ? 1 : 0) +
    (params.stockStatus && params.stockStatus !== 'all' ? 1 : 0);

  const stats = useMemo(() => {
    const inStock = items.filter((p) => p.stock > p.lowStockAlert).length;
    const lowStock = items.filter(
      (p) => p.stock > 0 && p.stock <= p.lowStockAlert,
    ).length;
    const outOfStock = items.filter((p) => p.stock === 0).length;
    return { inStock, lowStock, outOfStock };
  }, [items]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      {/* ===== Premium Header ===== */}
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-3 flex-1">
            <View
              className="h-12 w-12 rounded-2xl items-center justify-center"
              style={{ backgroundColor: '#16a34a' }}
            >
              <Package size={22} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('auto.products.products')}</Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Sparkles size={11} color="#f59e0b" />
                <Text className="text-xs text-neutral-500">
                  {total} total inventory
                </Text>
              </View>
            </View>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/products/new');
            }}
            className="h-12 px-4 rounded-2xl flex-row items-center gap-2 active:opacity-80"
            style={{
              backgroundColor: '#16a34a',
              shadowColor: '#16a34a',
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Plus size={18} color="#ffffff" />
            <Text className="text-white font-bold text-sm">{t('auto.index.new')}</Text>
          </Pressable>
        </View>

        {/* ===== Stats Pills ===== */}
        {total > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 20 }}
          >
            <View className="flex-row items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-100 dark:bg-emerald-950/40">
              <CheckCheck size={13} color="#16a34a" />
              <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {stats.inStock} in stock
              </Text>
            </View>
            {stats.lowStock > 0 && (
              <View className="flex-row items-center gap-1.5 px-3 py-2 rounded-full bg-amber-100 dark:bg-amber-950/40">
                <AlertTriangle size={13} color="#b45309" />
                <Text className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  {stats.lowStock} low stock
                </Text>
              </View>
            )}
            {stats.outOfStock > 0 && (
              <View className="flex-row items-center gap-1.5 px-3 py-2 rounded-full bg-rose-100 dark:bg-rose-950/40">
                <TrendingDown size={13} color="#dc2626" />
                <Text className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  {stats.outOfStock} out
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* ===== Search + Filter ===== */}
      <View className="px-5 pb-3 flex-row gap-2">
        <View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
          <Search size={20} color="#9ca3af" />
          <TextInput
            placeholder="Search by name, SKU, barcode..."
            placeholderTextColor="#9ca3af"
            value={params.search ?? ''}
            onChangeText={(s) => setParams({ ...params, search: s, page: 1 })}
            className="flex-1 text-base text-neutral-900 dark:text-white"
          />
          {(params.search ?? '').length > 0 && (
            <Pressable
              onPress={() => setParams({ ...params, search: '' })}
              hitSlop={12}
              className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            >
              <X size={14} color="#9ca3af" />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilters(true);
          }}
          className="h-12 w-12 rounded-2xl items-center justify-center"
          style={{
            backgroundColor: activeFilterCount > 0 ? '#16a34a' : '#ffffff',
            borderWidth: 1,
            borderColor: activeFilterCount > 0 ? '#16a34a' : '#e5e7eb',
          }}
        >
          <SlidersHorizontal
            size={20}
            color={activeFilterCount > 0 ? '#ffffff' : '#6b7280'}
          />
          {activeFilterCount > 0 && (
            <View
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full items-center justify-center"
              style={{ backgroundColor: '#f59e0b' }}
            >
              <Text className="text-[10px] font-extrabold text-amber-950">
                {activeFilterCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* ===== Quick Action Chips ===== */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 10 }}
      >
        <Pressable
          onPress={() => router.push('/brands')}
          className="flex-row items-center gap-1.5 h-9 px-3 rounded-full bg-violet-100 dark:bg-violet-950/40 active:opacity-70"
        >
          <Building2 size={13} color="#8b5cf6" />
          <Text className="text-xs font-bold text-violet-700 dark:text-violet-300">{t('auto.index.brands')}</Text>
          <ChevronRight size={11} color="#8b5cf6" />
        </Pressable>
        <Pressable
          onPress={() => router.push('/tags')}
          className="flex-row items-center gap-1.5 h-9 px-3 rounded-full bg-pink-100 dark:bg-pink-950/40 active:opacity-70"
        >
          <Hash size={13} color="#ec4899" />
          <Text className="text-xs font-bold text-pink-700 dark:text-pink-300">{t('auto.index.tags')}</Text>
          <ChevronRight size={11} color="#ec4899" />
        </Pressable>
      </ScrollView>

      {/* ===== Products Grid ===== */}
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        numColumns={2}
        contentContainerStyle={{
          paddingHorizontal: GRID_PADDING,
          paddingBottom: 100,
          paddingTop: 4,
        }}
        columnWrapperStyle={{ gap: GRID_GAP, marginBottom: GRID_GAP }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#16a34a"
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center py-20 px-10">
              <View className="h-24 w-24 rounded-3xl bg-brand-100 dark:bg-brand-950/40 items-center justify-center">
                <Package size={42} color="#16a34a" />
              </View>
              <Text className="mt-5 text-xl font-bold text-neutral-900 dark:text-white">
                {params.search ? 'No results' : 'No products yet'}
              </Text>
              <Text className="mt-1 text-sm text-neutral-500 text-center">
                {params.search
                  ? 'Try a different search term'
                  : 'Add your first product to start selling'}
              </Text>
              {!params.search && (
                <Pressable
                  onPress={() => router.push('/products/new')}
                  className="mt-6 h-12 px-6 rounded-2xl flex-row items-center gap-2"
                  style={{ backgroundColor: '#16a34a' }}
                >
                  <Plus size={18} color="#ffffff" />
                  <Text className="text-white font-bold">{t('auto.new.add_product')}</Text>
                </Pressable>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const primaryImage = item.images?.[0]?.url;
          const isLow = item.stock > 0 && item.stock <= item.lowStockAlert;
          const isOut = item.stock === 0;
          const profit = item.price - item.costPrice;
          const margin = item.price > 0 ? (profit / item.price) * 100 : 0;

          return (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/products/${item.id}`);
              }}
              className="active:opacity-80"
              style={{ width: CARD_WIDTH }}
            >
              <View
                className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                style={{
                  shadowColor: '#000',
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }}
              >
                {/* Image area */}
                <View
                  className="bg-neutral-100 dark:bg-neutral-800 relative"
                  style={{ width: CARD_WIDTH, height: CARD_WIDTH }}
                >
                  {primaryImage ? (
                    <Image
                      source={{ uri: primaryImage }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Package size={42} color="#9ca3af" />
                    </View>
                  )}

                  {/* Top-right badges */}
                  <View className="absolute top-2 right-2 gap-1">
                    {item.isFeatured && (
                      <View
                        className="h-7 w-7 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: '#f59e0b',
                          shadowColor: '#f59e0b',
                          shadowOpacity: 0.4,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <Star size={13} color="#ffffff" fill="#ffffff" />
                      </View>
                    )}
                    {!item.isActive && (
                      <View className="px-2 py-0.5 rounded-md bg-neutral-900/80">
                        <Text className="text-white text-[9px] font-extrabold">
                          OFF
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Bottom-left status */}
                  <View className="absolute bottom-2 left-2">
                    {isOut ? (
                      <View
                        className="px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: '#dc2626' }}
                      >
                        <Text className="text-white text-[10px] font-extrabold">
                          OUT
                        </Text>
                      </View>
                    ) : isLow ? (
                      <View
                        className="flex-row items-center gap-1 px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: '#f59e0b' }}
                      >
                        <AlertTriangle size={9} color="#ffffff" />
                        <Text className="text-white text-[10px] font-extrabold">
                          LOW
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Bottom-right variants */}
                  {item._count && (item._count.variants ?? 0) > 0 && (
                    <View
                      className="absolute bottom-2 right-2 flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-md"
                      style={{ backgroundColor: '#7c3aed' }}
                    >
                      <Layers size={9} color="#ffffff" />
                      <Text className="text-white text-[10px] font-extrabold">
                        {item._count.variants}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Info area */}
                <View className="p-3">
                  {item.brand && (
                    <Text
                      className="text-[9px] uppercase tracking-wider text-violet-700 dark:text-violet-400 font-extrabold mb-0.5"
                      numberOfLines={1}
                    >
                      {item.brand.name}
                    </Text>
                  )}
                  <Text
                    className="font-bold text-neutral-900 dark:text-white text-sm leading-tight"
                    numberOfLines={2}
                    style={{ minHeight: 36 }}
                  >
                    {item.name}
                  </Text>

                  <View className="flex-row items-end justify-between mt-2">
                    <Text className="font-extrabold text-emerald-700 dark:text-emerald-400 text-base">
                      {formatPKRFull(item.price)}
                    </Text>
                    <Text
                      className={`text-[10px] font-extrabold ${
                        isOut
                          ? 'text-rose-600'
                          : isLow
                          ? 'text-amber-700'
                          : 'text-neutral-500'
                      }`}
                    >
                      {item.stock} {item.unit}
                    </Text>
                  </View>

                  {margin > 0 && (
                    <View className="flex-row items-center gap-0.5 mt-1.5 pt-1.5 border-t border-neutral-100 dark:border-neutral-800">
                      <TrendingUp size={9} color="#16a34a" />
                      <Text className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                        {margin.toFixed(0)}% margin
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {/* ===== Filters Modal ===== */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilters(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-neutral-900 rounded-t-3xl max-h-[85%]">
            {/* Drag handle */}
            <View className="items-center pt-3 pb-1">
              <View className="h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </View>

            <View className="flex-row items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <View className="flex-row items-center gap-2">
                <Filter size={20} color="#16a34a" />
                <Text className="text-lg font-bold text-neutral-900 dark:text-white">{t('auto.products.filters')}</Text>
                {activeFilterCount > 0 && (
                  <View className="h-5 px-1.5 rounded-full bg-brand-600 items-center justify-center">
                    <Text className="text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </Text>
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => setShowFilters(false)}
                className="h-9 w-9 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={18} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <View className="gap-5">
                {/* Stock Status */}
                <View>
                  <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">{t('auto.products.stock_status')}</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {(['all', 'in', 'low', 'out'] as const).map((s) => {
                      const active = params.stockStatus === s;
                      const colors = {
                        all: '#16a34a',
                        in: '#16a34a',
                        low: '#f59e0b',
                        out: '#dc2626',
                      };
                      return (
                        <Pressable
                          key={s}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setParams({ ...params, stockStatus: s, page: 1 });
                          }}
                          className="px-4 py-2.5 rounded-xl border-2"
                          style={{
                            backgroundColor: active ? colors[s] : '#ffffff',
                            borderColor: active ? colors[s] : '#e5e7eb',
                          }}
                        >
                          <Text
                            className="text-sm font-bold capitalize"
                            style={{ color: active ? '#ffffff' : '#374151' }}
                          >
                            {s === 'all'
                              ? 'All'
                              : s === 'in'
                              ? 'In Stock'
                              : s === 'low'
                              ? 'Low Stock'
                              : 'Out of Stock'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Brands */}
                {brands.length > 0 && (
                  <View>
                    <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">{t('auto.new.brand')}</Text>
                    <View className="flex-row flex-wrap gap-2">
                      <Pressable
                        onPress={() =>
                          setParams({ ...params, brandId: undefined })
                        }
                        className="px-4 py-2.5 rounded-xl border-2"
                        style={{
                          backgroundColor: !params.brandId ? '#7c3aed' : '#ffffff',
                          borderColor: !params.brandId ? '#7c3aed' : '#e5e7eb',
                        }}
                      >
                        <Text
                          className="text-sm font-bold"
                          style={{ color: !params.brandId ? '#ffffff' : '#374151' }}
                        >{t('auto.products.all_brands')}</Text>
                      </Pressable>
                      {brands.map((b) => {
                        const active = params.brandId === b.id;
                        return (
                          <Pressable
                            key={b.id}
                            onPress={() =>
                              setParams({
                                ...params,
                                brandId: active ? undefined : b.id,
                              })
                            }
                            className="px-4 py-2.5 rounded-xl border-2"
                            style={{
                              backgroundColor: active ? '#7c3aed' : '#ffffff',
                              borderColor: active ? '#7c3aed' : '#e5e7eb',
                            }}
                          >
                            <Text
                              className="text-sm font-bold"
                              style={{ color: active ? '#ffffff' : '#374151' }}
                            >
                              {b.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Categories */}
                {categories.length > 0 && (
                  <View>
                    <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">{t('auto.new.category')}</Text>
                    <View className="flex-row flex-wrap gap-2">
                      <Pressable
                        onPress={() =>
                          setParams({ ...params, categoryId: undefined })
                        }
                        className="px-4 py-2.5 rounded-xl border-2"
                        style={{
                          backgroundColor: !params.categoryId
                            ? '#16a34a'
                            : '#ffffff',
                          borderColor: !params.categoryId ? '#16a34a' : '#e5e7eb',
                        }}
                      >
                        <Text
                          className="text-sm font-bold"
                          style={{
                            color: !params.categoryId ? '#ffffff' : '#374151',
                          }}
                        >{t('auto.products.all')}</Text>
                      </Pressable>
                      {categories.map((c) => {
                        const active = params.categoryId === c.id;
                        return (
                          <Pressable
                            key={c.id}
                            onPress={() =>
                              setParams({
                                ...params,
                                categoryId: active ? undefined : c.id,
                              })
                            }
                            className="px-4 py-2.5 rounded-xl border-2"
                            style={{
                              backgroundColor: active
                                ? c.color || '#16a34a'
                                : '#ffffff',
                              borderColor: active
                                ? c.color || '#16a34a'
                                : '#e5e7eb',
                            }}
                          >
                            <Text
                              className="text-sm font-bold"
                              style={{
                                color: active ? '#ffffff' : '#374151',
                              }}
                            >
                              {c.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <View>
                    <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">{t('auto.products.tag')}</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {tags.map((t) => {
                        const active = params.tagId === t.id;
                        return (
                          <Pressable
                            key={t.id}
                            onPress={() =>
                              setParams({
                                ...params,
                                tagId: active ? undefined : t.id,
                              })
                            }
                            className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl border-2"
                            style={{
                              borderColor: active ? t.color : '#e5e7eb',
                              backgroundColor: active ? `${t.color}20` : '#ffffff',
                            }}
                          >
                            <View
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: t.color }}
                            />
                            <Text
                              className="text-sm font-bold"
                              style={{ color: active ? t.color : '#374151' }}
                            >
                              {t.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 flex-row gap-2">
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setParams({
                    search: params.search,
                    page: 1,
                    limit: 30,
                    stockStatus: 'all',
                  });
                }}
                className="flex-1 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <Text className="font-bold text-neutral-700 dark:text-neutral-300">{t('auto.products.clear_all')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowFilters(false);
                }}
                className="flex-1 h-12 rounded-2xl items-center justify-center"
                style={{
                  backgroundColor: '#16a34a',
                  shadowColor: '#16a34a',
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text className="text-white font-bold">{t('auto.products.apply_filters')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
