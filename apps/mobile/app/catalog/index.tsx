import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Image, Modal,
  RefreshControl, Dimensions, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Search, X, Package, Sparkles, Eye, EyeOff, Share2,
  ArrowLeft, Layers, Star, ShoppingBag, Copy,
} from 'lucide-react-native';
import { productsApi, type Product } from '@/api/products.api';
import { categoriesApi } from '@/api/categories.api';
import { productVariantsApi } from '@/api/product-variants.api';
import { formatPKRFull, formatQty } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 8;
const CARD_W = (SCREEN_W - 40 - CARD_GAP) / 2;

const EMPTY_LIST = {
  items: [],
  meta: { page: 1, limit: 0, total: 0, totalPages: 0 },
};

export default function CatalogScreen() {
  const router = useRouter();
  const { tenant } = useAuthStore();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customerMode, setCustomerMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: productsData = EMPTY_LIST, refetch } = useQuery({
    queryKey: ['catalog-products', search, categoryId],
    queryFn: async () => {
      try {
        return (await productsApi.list({
          search: search || undefined,
          categoryId: categoryId || undefined,
          isActive: true,
          limit: 100,
        })) ?? EMPTY_LIST;
      } catch {
        return EMPTY_LIST;
      }
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const r = await categoriesApi.list();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const products = productsData?.items ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out our catalog at ${tenant?.name || 'Nafaa Shop'}!`,
        title: tenant?.name || 'Our Catalog',
      });
    } catch {}
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ===== HEADER ===== */}
      {!customerMode && (
        <View className="px-5 pt-4 pb-3">
          <View className="flex-row items-center gap-3 mb-3">
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
            >
              <ArrowLeft size={20} color="#16a34a" />
            </Pressable>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Sparkles size={11} color="#f59e0b" />
                <Text className="text-[10px] uppercase tracking-wider text-amber-600 font-extrabold">
                  Product Catalog
                </Text>
              </View>
              <Text className="text-xl font-bold text-neutral-900 dark:text-white">
                Showcase
              </Text>
            </View>
            <Pressable
              onPress={handleShare}
              className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center justify-center"
            >
              <Share2 size={18} color="#374151" />
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setCustomerMode(true);
              }}
              className="h-10 px-3 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
              style={{
                backgroundColor: '#16a34a',
                shadowColor: '#16a34a',
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Eye size={14} color="#ffffff" />
              <Text className="text-white font-bold text-xs">Customer View</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Customer Mode Header */}
      {customerMode && (
        <View
          className="border-b border-neutral-200 dark:border-neutral-800"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View className="px-5 py-4 flex-row items-center justify-between">
            <View>
              <Text className="text-xs uppercase tracking-wider text-emerald-700 font-extrabold">
                Welcome
              </Text>
              <Text className="text-lg font-extrabold text-neutral-900 dark:text-white">
                {tenant?.name || 'Our Products'}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCustomerMode(false);
              }}
              className="h-10 px-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex-row items-center gap-1.5"
            >
              <EyeOff size={14} color="#374151" />
              <Text className="text-neutral-700 dark:text-neutral-200 font-bold text-xs">Exit</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ===== SEARCH & FILTERS ===== */}
      <View className="px-5 py-3">
        <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
          <Search size={18} color="#9ca3af" />
          <TextInput
            placeholder="Search products..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-base text-neutral-900 dark:text-white"
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={12}
              className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            >
              <X size={14} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Categories scroll */}
      {categories.length > 0 && (
        <View className="pb-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          >
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setCategoryId('');
              }}
              className="px-3 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: !categoryId ? '#16a34a' : '#f3f4f6' }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: !categoryId ? '#ffffff' : '#374151' }}
              >
                All
              </Text>
            </Pressable>
            {categories.map((c: any) => {
              const active = categoryId === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCategoryId(c.id);
                  }}
                  className="px-3 h-9 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: active ? c.color || '#16a34a' : '#f3f4f6',
                  }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{ color: active ? '#ffffff' : '#374151' }}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Stats */}
      {!customerMode && (
        <View className="px-5 pb-2">
          <Text className="text-xs text-neutral-500">
            Showing <Text className="font-bold text-neutral-900 dark:text-white">{products.length}</Text> products
          </Text>
        </View>
      )}

      {/* ===== PRODUCTS GRID ===== */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
      >
        {products.length === 0 ? (
          <View className="items-center py-16">
            <View className="h-20 w-20 rounded-3xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
              <Package size={40} color="#9ca3af" />
            </View>
            <Text className="mt-4 text-base font-bold text-neutral-900 dark:text-white">
              No products
            </Text>
            <Text className="mt-1 text-xs text-neutral-500">
              {search ? `"${search}" se match nahi` : 'Add products from Products tab'}
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap" style={{ gap: CARD_GAP }}>
            {products.map((p) => {
              const primaryImage = p.images?.[0]?.url;
              const variantCount = p._count?.variants ?? 0;

              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedProduct(p);
                  }}
                  style={{ width: CARD_W }}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 overflow-hidden active:opacity-80"
                >
                  {/* Image */}
                  <View
                    style={{ width: CARD_W, height: CARD_W }}
                    className="bg-neutral-100 dark:bg-neutral-800 relative"
                  >
                    {primaryImage ? (
                      <Image
                        source={{ uri: primaryImage }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="items-center justify-center h-full">
                        <Package size={32} color="#9ca3af" />
                      </View>
                    )}

                    {p.isFeatured && (
                      <View
                        className="absolute top-2 right-2 px-2 py-0.5 rounded-full flex-row items-center gap-0.5"
                        style={{
                          backgroundColor: '#f59e0b',
                          shadowColor: '#f59e0b',
                          shadowOpacity: 0.4,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <Star size={9} color="#ffffff" fill="#ffffff" />
                        <Text className="text-[9px] font-extrabold text-white">FEATURED</Text>
                      </View>
                    )}

                    {variantCount > 0 && (
                      <View
                        className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full flex-row items-center gap-0.5"
                        style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)' }}
                      >
                        <Layers size={9} color="#ffffff" />
                        <Text className="text-[9px] font-extrabold text-white">
                          {variantCount} variants
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Body */}
                  <View className="p-2.5">
                    {p.brand && (
                      <Text
                        className="text-[9px] uppercase tracking-wider text-violet-700 font-extrabold mb-0.5"
                        numberOfLines={1}
                      >
                        {p.brand.name}
                      </Text>
                    )}
                    <Text
                      className="font-bold text-neutral-900 dark:text-white text-sm leading-snug"
                      numberOfLines={2}
                    >
                      {p.name}
                    </Text>
                    <View className="flex-row items-baseline justify-between mt-1.5">
                      <Text className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                        {formatPKRFull(p.price)}
                      </Text>
                      <Text className="text-[10px] text-neutral-500 font-medium">/ {p.unit}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ===== PRODUCT DETAIL MODAL ===== */}
      <Modal
        visible={!!selectedProduct}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedProduct(null)}
      >
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

// ─── PRODUCT DETAIL MODAL ────────────────────────────────────────
function ProductDetailModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const { data: variants = [] } = useQuery({
    queryKey: ['catalog-variants', product.id],
    queryFn: async () => {
      try {
        return await productVariantsApi.list(product.id);
      } catch {
        return [];
      }
    },
    enabled: product.hasVariants,
  });

  const activeVariants = useMemo(
    () => variants.filter((v) => v.isActive !== false),
    [variants],
  );

  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId);

  const displayImage =
    selectedVariant?.imageUrl ||
    product.images?.find((i) => i.isPrimary)?.url ||
    product.images?.[0]?.url;

  const displayPrice = selectedVariant?.price ?? product.price;

  const handleCopy = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = `${product.name}${selectedVariant ? ` (${selectedVariant.name})` : ''}\nPrice: ${formatPKRFull(displayPrice)} / ${product.unit}`;
    await Clipboard.setStringAsync(text);
    Toast.show({ type: 'success', text1: 'Copied to clipboard' });
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex-row items-center gap-3">
        <Pressable
          onPress={onClose}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center justify-center"
        >
          <X size={18} color="#374151" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500">Product</Text>
          <Text
            className="text-base font-bold text-neutral-900 dark:text-white"
            numberOfLines={1}
          >
            {product.name}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Image */}
        <View
          style={{ width: SCREEN_W, height: SCREEN_W }}
          className="bg-neutral-100 dark:bg-neutral-800"
        >
          {displayImage ? (
            <Image
              source={{ uri: displayImage }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View className="items-center justify-center h-full">
              <Package size={48} color="#9ca3af" />
            </View>
          )}
        </View>

        {/* Body */}
        <View className="px-5 pt-5 gap-3">
          {product.brand && (
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[10px] uppercase tracking-wider text-violet-700 font-extrabold">
                {product.brand.name}
              </Text>
            </View>
          )}

          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            {product.name}
          </Text>

          {product.shortDescription && (
            <Text className="text-sm text-neutral-600 dark:text-neutral-400 leading-5">
              {product.shortDescription}
            </Text>
          )}

          {/* Price card */}
          <View className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-4">
            <Text className="text-xs text-emerald-700 font-bold uppercase tracking-wider">
              {selectedVariant ? 'Variant Price' : 'Price'}
            </Text>
            <View className="flex-row items-baseline gap-2 mt-1">
              <Text className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
                {formatPKRFull(displayPrice)}
              </Text>
              <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-500">
                / {product.unit}
              </Text>
            </View>
          </View>

          {/* Tags */}
          <View className="flex-row flex-wrap gap-1.5">
            {product.category && (
              <View
                className="px-2.5 py-1 rounded-full"
                style={{ backgroundColor: `${product.category.color}20` }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: product.category.color }}
                >
                  {product.category.name}
                </Text>
              </View>
            )}
            {product.unit && (
              <View className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  Unit: {product.unit}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {product.description && (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 mt-1">
              <Text className="text-xs uppercase tracking-wider text-neutral-500 font-bold mb-2">
                Description
              </Text>
              <Text className="text-sm text-neutral-700 dark:text-neutral-300 leading-5">
                {product.description}
              </Text>
            </View>
          )}

          {/* Variants */}
          {activeVariants.length > 0 && (
            <View>
              <Text className="text-xs uppercase tracking-wider text-neutral-500 font-bold mb-2">
                Available Variants ({activeVariants.length})
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {activeVariants.map((v) => {
                  const isSelected = selectedVariantId === v.id;
                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedVariantId(isSelected ? null : v.id);
                      }}
                      className="rounded-xl bg-white dark:bg-neutral-900 overflow-hidden border-2"
                      style={{
                        width: (SCREEN_W - 40 - 24) / 3,
                        borderColor: isSelected ? '#16a34a' : '#e5e7eb',
                      }}
                    >
                      <View
                        style={{ aspectRatio: 1 }}
                        className="bg-neutral-100 dark:bg-neutral-800 relative"
                      >
                        {v.imageUrl ? (
                          <Image
                            source={{ uri: v.imageUrl }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : v.colorHex ? (
                          <View
                            style={{ width: '100%', height: '100%', backgroundColor: v.colorHex }}
                          />
                        ) : (
                          <View className="items-center justify-center h-full">
                            <Text className="text-[10px] font-bold text-neutral-500">
                              {v.size || v.name.slice(0, 3).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        {isSelected && (
                          <View
                            className="absolute top-1 right-1 h-5 w-5 rounded-full items-center justify-center"
                            style={{ backgroundColor: '#16a34a' }}
                          >
                            <Text className="text-white text-[10px] font-extrabold">✓</Text>
                          </View>
                        )}
                      </View>
                      <View className="px-2 py-1.5">
                        <Text
                          className="text-[10px] font-bold text-neutral-900 dark:text-white"
                          numberOfLines={1}
                        >
                          {v.size || v.color || v.name}
                        </Text>
                        <Text className="text-[10px] font-extrabold text-emerald-700">
                          {formatPKRFull(v.price)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {selectedVariant && (
                <View className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                  <Text className="font-bold text-emerald-900">{selectedVariant.name}</Text>
                  <View className="flex-row items-center gap-3 mt-1">
                    {selectedVariant.sku && (
                      <Text className="text-xs text-emerald-800">
                        SKU: <Text className="font-bold">{selectedVariant.sku}</Text>
                      </Text>
                    )}
                    {selectedVariant.size && (
                      <Text className="text-xs text-emerald-800">
                        Code: <Text className="font-bold">{selectedVariant.size}</Text>
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Copy details button */}
          <Pressable
            onPress={handleCopy}
            className="h-12 rounded-2xl bg-neutral-900 dark:bg-neutral-100 items-center justify-center flex-row gap-2 mt-2 active:opacity-80"
          >
            <Copy size={16} color="#ffffff" className="dark:hidden" />
            <Text className="text-white dark:text-neutral-900 font-bold text-sm">
              Copy product details
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
