import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, Dimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Edit3, Star, Package, Building2, Layers, AlertTriangle,
  Calendar, BarChart3, TrendingUp, Tag as TagIcon, Hash, DollarSign,
  Boxes, Sparkles, ShoppingCart, Scissors, ArrowRight, Store,
} from 'lucide-react-native';
import { productsApi } from '@/api/products.api';
import { productBatchesApi } from '@/api/product-batches.api';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { useCarpetSummary } from '@/hooks/useCarpetSummary';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';

const { width: SCREEN_W } = Dimensions.get('window');
const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);

const formatDate = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v)) : '—';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useSmartBack();
  const { businessType, features } = useBusinessFeatures();
  const [imgIndex, setImgIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { data: product, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => { try { return await productsApi.getOne(id); } catch { return null; } },
    enabled: !!id,
  });

  const isCarpetBusiness = useMemo(() => {
    const type = (businessType ?? '').toUpperCase();
    return type === 'CARPET' || type === 'FLOORING' || features?.lengthWidthCalc === true;
  }, [businessType, features]);

  const isCarpetProduct = product && isCarpetBusiness && CARPET_UNITS.has(product.unit);

  const { data: carpetSummary = [] } = useCarpetSummary(
    id ? [id] : [],
    !!isCarpetProduct && !!id,
  );
  const carpetData = carpetSummary[0];

  const { data: batches = [] } = useQuery({
    queryKey: ['product-batches', id],
    queryFn: async () => { try { const r = await productBatchesApi.list(id); return Array.isArray(r) ? r : []; } catch { return []; } },
    enabled: !!product?.expiryTracked,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!product) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
        <View className="h-20 w-20 rounded-3xl bg-neutral-100 items-center justify-center">
          <Package size={36} color="#9ca3af" />
        </View>
        <Text className="mt-3 text-base text-neutral-500 font-semibold">Loading product...</Text>
      </SafeAreaView>
    );
  }

  const images = product.images ?? [];
  const isLow = !isCarpetProduct && product.stock > 0 && product.stock <= product.lowStockAlert;
  const isOut = !isCarpetProduct && product.stock === 0;
  const profit = product.price - product.costPrice;
  const margin = product.price > 0 ? (profit / product.price) * 100 : 0;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable onPress={goBack} hitSlop={12} className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800">
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs text-neutral-500">Product Detail</Text>
            {isCarpetProduct && (
              <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: '#dcfce7' }}>
                <Text className="text-[9px] font-extrabold uppercase text-emerald-700">🧶 Carpet</Text>
              </View>
            )}
          </View>
          <Text className="text-lg font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
            {product.name}
          </Text>
        </View>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/products/${id}/edit`); }}
          className="h-11 px-3.5 rounded-2xl flex-row items-center gap-1.5"
          style={{ backgroundColor: '#16a34a', shadowColor: '#16a34a', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        >
          <Edit3 size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">Edit</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Images Carousel */}
        <View className="bg-white dark:bg-neutral-900">
          {images.length > 0 ? (
            <View>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => setImgIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
              >
                {images.map((img: any) => (
                  <Image key={img.id} source={{ uri: img.url }} style={{ width: SCREEN_W, aspectRatio: 1 }} resizeMode="cover" />
                ))}
              </ScrollView>

              {images.length > 1 && (
                <>
                  <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5">
                    {images.map((_, i) => (
                      <View
                        key={i}
                        className="h-1.5 rounded-full"
                        style={{
                          width: i === imgIndex ? 28 : 6,
                          backgroundColor: i === imgIndex ? '#ffffff' : 'rgba(255,255,255,0.5)',
                        }}
                      />
                    ))}
                  </View>
                  <View className="absolute top-4 right-4 px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <Text className="text-white text-xs font-bold">{imgIndex + 1} / {images.length}</Text>
                  </View>
                </>
              )}

              {product.isFeatured && (
                <View className="absolute top-4 left-4 px-3 py-1.5 rounded-full flex-row items-center gap-1" style={{ backgroundColor: '#f59e0b' }}>
                  <Star size={12} color="#ffffff" fill="#ffffff" />
                  <Text className="text-white text-xs font-extrabold">FEATURED</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={{ width: SCREEN_W, aspectRatio: 1 }} className="bg-neutral-100 items-center justify-center">
              <View className="h-24 w-24 rounded-3xl bg-neutral-200 items-center justify-center">
                <Package size={48} color="#9ca3af" />
              </View>
              <Text className="mt-3 text-neutral-500 font-semibold">No images</Text>
            </View>
          )}
        </View>

        <View className="px-5 pt-5 gap-4">
          {/* Title & Tags */}
          <View>
            {product.brand && (
              <View className="flex-row items-center gap-1.5 mb-1.5">
                <Building2 size={12} color="#8b5cf6" />
                <Text className="text-xs uppercase tracking-wider text-violet-700 font-extrabold">
                  {product.brand.name}
                </Text>
              </View>
            )}
            <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white leading-tight">
              {product.name}
            </Text>
            {product.shortDescription && (
              <Text className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {product.shortDescription}
              </Text>
            )}

            <View className="flex-row flex-wrap gap-1.5 mt-3">
              {product.category && (
                <View className="px-2.5 py-1 rounded-full flex-row items-center gap-1" style={{ backgroundColor: `${product.category.color}20` }}>
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: product.category.color }} />
                  <Text className="text-xs font-bold" style={{ color: product.category.color }}>{product.category.name}</Text>
                </View>
              )}
              {product.tags?.map((t: any) => (
                <View key={t.tag.id} className="px-2.5 py-1 rounded-full flex-row items-center gap-1" style={{ backgroundColor: `${t.tag.color}20` }}>
                  <Hash size={9} color={t.tag.color} />
                  <Text className="text-xs font-bold" style={{ color: t.tag.color }}>{t.tag.name}</Text>
                </View>
              ))}
              {!product.isActive && (
                <View className="px-2.5 py-1 rounded-full bg-neutral-200">
                  <Text className="text-xs font-bold text-neutral-700">INACTIVE</Text>
                </View>
              )}
            </View>
          </View>

          {/* Price Card */}
          <View className="rounded-3xl p-5" style={{ backgroundColor: '#16a34a' }}>
            <View className="flex-row items-center gap-2 mb-1">
              <DollarSign size={14} color="rgba(255,255,255,0.8)" />
              <Text className="text-xs font-bold uppercase tracking-wider text-white/80">Sell Price</Text>
            </View>
            <View className="flex-row items-baseline gap-2">
              <Text className="text-4xl font-extrabold text-white">{formatPKRFull(product.price)}</Text>
              <Text className="text-sm text-white/80">/ {product.unit}</Text>
            </View>
            {product.wholesalePrice && (
              <View className="mt-2 flex-row items-center gap-1.5">
                <Text className="text-xs text-white/70">Wholesale:</Text>
                <Text className="text-sm font-bold text-white">{formatPKRFull(product.wholesalePrice)}</Text>
              </View>
            )}

            <View className="mt-4 pt-4 border-t border-white/20 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">Cost</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">{formatPKRFull(product.costPrice)}</Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">Profit</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">{formatPKRFull(profit)}</Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">Margin</Text>
                <View className="flex-row items-center gap-1 mt-0.5">
                  <TrendingUp size={14} color="#ffffff" />
                  <Text className="text-base font-extrabold text-white">{margin.toFixed(1)}%</Text>
                </View>
              </View>
              {product.taxRate > 0 && (
                <View>
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">Tax</Text>
                  <Text className="text-base font-extrabold text-white mt-0.5">{product.taxRate}%</Text>
                </View>
              )}
            </View>
          </View>

          {/* Stock / Rolls Card */}
          {isCarpetProduct ? (
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: '#065f46' }}>
              <View className="p-5">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-3">
                    <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center">
                      <Layers size={24} color="#ffffff" />
                    </View>
                    <View>
                      <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">Carpet Stock</Text>
                      <Text className="text-lg font-extrabold text-white">Rolls Inventory</Text>
                    </View>
                  </View>
                </View>

                {carpetData && carpetData.rollCount > 0 ? (
                  <View className="flex-row gap-2 mb-3">
                    <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                      <View className="flex-row items-center gap-1 mb-1">
                        <Layers size={10} color="#fde68a" />
                        <Text className="text-[9px] uppercase font-extrabold text-white/80">Rolls</Text>
                      </View>
                      <Text className="text-2xl font-extrabold text-white">{carpetData.rollCount}</Text>
                    </View>
                    <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                      <View className="flex-row items-center gap-1 mb-1">
                        <Boxes size={10} color="#fde68a" />
                        <Text className="text-[9px] uppercase font-extrabold text-white/80">Total Sqft</Text>
                      </View>
                      <Text className="text-2xl font-extrabold text-white">{carpetData.totalSqft.toFixed(0)}</Text>
                    </View>
                    {(carpetData.cutPiecesCount ?? 0) > 0 && (
                      <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                        <View className="flex-row items-center gap-1 mb-1">
                          <Scissors size={10} color="#fde68a" />
                          <Text className="text-[9px] uppercase font-extrabold text-white/80">Cuts</Text>
                        </View>
                        <Text className="text-2xl font-extrabold text-white">{carpetData.cutPiecesCount}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View className="rounded-xl bg-amber-500/20 p-3 flex-row items-center gap-2 mb-3" style={{ borderWidth: 1, borderColor: 'rgba(252,211,77,0.4)' }}>
                    <AlertTriangle size={14} color="#fde68a" />
                    <Text className="text-amber-200 text-xs font-semibold flex-1">Koi roll add nahi hua abhi tak</Text>
                  </View>
                )}

                <Pressable
                  onPress={() => router.push(`/industries/carpet/rolls?productId=${id}` as any)}
                  className="h-12 rounded-2xl bg-white flex-row items-center justify-center gap-2"
                >
                  <Layers size={16} color="#065f46" />
                  <Text className="text-emerald-900 font-extrabold text-sm">
                    {carpetData && carpetData.rollCount > 0 ? 'View & Manage Rolls' : 'Add First Roll'}
                  </Text>
                  <ArrowRight size={14} color="#065f46" />
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="rounded-3xl p-5" style={{ backgroundColor: isOut ? '#fee2e2' : isLow ? '#fef3c7' : '#dcfce7' }}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Boxes size={14} color={isOut ? '#dc2626' : isLow ? '#d97706' : '#16a34a'} />
                    <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: isOut ? '#dc2626' : isLow ? '#d97706' : '#15803d' }}>
                      Current Stock
                    </Text>
                  </View>
                  <Text className="text-4xl font-extrabold" style={{ color: isOut ? '#dc2626' : isLow ? '#d97706' : '#15803d' }}>
                    {product.stock}
                  </Text>
                  <Text className="text-xs mt-0.5 font-semibold" style={{ color: isOut ? '#991b1b' : isLow ? '#92400e' : '#166534' }}>
                    {product.unit} • Alert at {product.lowStockAlert} {product.unit}
                  </Text>
                </View>
                <View className="h-16 w-16 rounded-3xl items-center justify-center" style={{ backgroundColor: isOut ? '#dc2626' : isLow ? '#d97706' : '#16a34a' }}>
                  {isOut || isLow ? <AlertTriangle size={28} color="#ffffff" /> : <Package size={28} color="#ffffff" />}
                </View>
              </View>

              {(product.weight || product.dimensions) && (
                <View className="mt-4 pt-4 flex-row gap-6" style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' }}>
                  {product.weight && (
                    <View>
                      <Text className="text-[10px] text-neutral-700 font-bold uppercase tracking-wider">Weight</Text>
                      <Text className="text-sm font-bold text-neutral-900 mt-0.5">{product.weight} {product.weightUnit}</Text>
                    </View>
                  )}
                  {product.dimensions && (
                    <View>
                      <Text className="text-[10px] text-neutral-700 font-bold uppercase tracking-wider">Dimensions</Text>
                      <Text className="text-sm font-bold text-neutral-900 mt-0.5">{product.dimensions}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* SKU / Barcode */}
          {(product.sku || product.barcode) && (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 gap-3">
              {product.sku && (
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Hash size={14} color="#737373" />
                    <Text className="text-xs text-neutral-500 font-bold uppercase tracking-wider">SKU</Text>
                  </View>
                  <View className="px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <Text className="font-mono font-extrabold text-neutral-900 dark:text-white text-sm">{product.sku}</Text>
                  </View>
                </View>
              )}
              {product.barcode && (
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Hash size={14} color="#737373" />
                    <Text className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Barcode</Text>
                  </View>
                  <View className="px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <Text className="font-mono font-extrabold text-neutral-900 dark:text-white text-sm">{product.barcode}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <View>
              <View className="flex-row items-center gap-2 mb-3">
                <Layers size={18} color="#8b5cf6" />
                <Text className="text-base font-extrabold text-neutral-900 dark:text-white">Variants</Text>
                <View className="px-2 py-0.5 rounded-full bg-violet-100">
                  <Text className="text-[10px] font-bold text-violet-700">{product.variants.length}</Text>
                </View>
              </View>
              <View className="gap-2">
                {product.variants.map((v: any) => (
                  <View key={v.id} className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3 flex-row items-center gap-3">
                    {v.imageUrl ? (
                      <Image source={{ uri: v.imageUrl }} style={{ width: 48, height: 48, borderRadius: 12 }} resizeMode="cover" />
                    ) : v.colorHex ? (
                      <View className="h-12 w-12 rounded-xl border-2 border-neutral-200" style={{ backgroundColor: v.colorHex }} />
                    ) : (
                      <View className="h-12 w-12 rounded-xl bg-violet-100 items-center justify-center">
                        <Layers size={18} color="#8b5cf6" />
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="font-bold text-neutral-900 dark:text-white">{v.name}</Text>
                      <View className="flex-row items-center gap-3 mt-0.5">
                        <Text className="text-xs text-emerald-700 font-bold">{formatPKRFull(v.price)}</Text>
                        <Text className="text-xs font-bold" style={{ color: v.stock === 0 ? '#dc2626' : v.stock <= v.lowStockAlert ? '#d97706' : '#737373' }}>
                          {v.stock} {v.unit || product.unit}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Batches */}
          {product.expiryTracked && batches.length > 0 && (
            <View>
              <View className="flex-row items-center gap-2 mb-3">
                <Calendar size={18} color="#f59e0b" />
                <Text className="text-base font-extrabold text-neutral-900 dark:text-white">Batches</Text>
                <View className="px-2 py-0.5 rounded-full bg-amber-100">
                  <Text className="text-[10px] font-bold text-amber-700">{batches.length}</Text>
                </View>
              </View>
              <View className="gap-2">
                {batches.map((b: any) => {
                  const isExpired = b.expiryDate && new Date(b.expiryDate) < new Date();
                  const daysLeft = b.expiryDate ? Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                  return (
                    <View key={b.id} className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                          <View className="px-2 py-0.5 rounded-md bg-neutral-100 self-start">
                            <Text className="font-mono font-extrabold text-neutral-900 text-xs">{b.batchNumber}</Text>
                          </View>
                          <Text className="text-xs text-neutral-500 mt-2">
                            Qty: <Text className="font-bold">{b.quantity}</Text> • Cost: <Text className="font-bold">{formatPKRFull(b.costPrice)}</Text>
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-[10px] text-neutral-500 font-bold uppercase">Expires</Text>
                          <Text className="text-sm font-bold" style={{ color: isExpired ? '#dc2626' : daysLeft && daysLeft < 30 ? '#d97706' : '#374151' }}>
                            {formatDate(b.expiryDate)}
                          </Text>
                          {daysLeft !== null && daysLeft >= 0 && !isExpired && (
                            <Text className="text-[10px] text-neutral-500 font-semibold">{daysLeft} days left</Text>
                          )}
                          {isExpired && (
                            <View className="mt-1 px-2 py-0.5 rounded-md bg-rose-100">
                              <Text className="text-[10px] font-extrabold text-rose-700">EXPIRED</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Description */}
          {product.description && (
            <View>
              <View className="flex-row items-center gap-2 mb-2">
                <Sparkles size={16} color="#16a34a" />
                <Text className="text-base font-extrabold text-neutral-900 dark:text-white">Description</Text>
              </View>
              <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                <Text className="text-sm text-neutral-700 dark:text-neutral-300 leading-6">
                  {product.description}
                </Text>
              </View>
            </View>
          )}

          {/* Sales Stats */}
          {product._count && (product._count.saleItems ?? 0) > 0 && (
            <View className="rounded-2xl p-4 flex-row items-center gap-3" style={{ backgroundColor: '#dbeafe' }}>
              <View className="h-14 w-14 rounded-2xl items-center justify-center" style={{ backgroundColor: '#2563eb' }}>
                <BarChart3 size={24} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-blue-700 font-bold uppercase tracking-wider">Sales History</Text>
                <Text className="text-2xl font-extrabold text-blue-900 mt-0.5">{product._count.saleItems}</Text>
                <Text className="text-xs text-blue-700 font-semibold">total sales</Text>
              </View>
              <ShoppingCart size={28} color="#2563eb" />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
