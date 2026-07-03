import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, PackagePlus, Sparkles, Truck, Package, CalendarClock,
  Banknote, CreditCard, Smartphone, Building2, Zap, Wallet, Receipt,
  User, Phone, Mail, MapPin, Layers, ExternalLink, Award, Star,
  FileText, CheckCircle2, AlertTriangle, Hash, ChevronRight,
} from 'lucide-react-native';
import { purchasesApi } from '@/api/purchases.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { useTranslation } from '@/i18n/useTranslation';
import { useSmartBack } from '@/hooks/useSmartBack';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const formatQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

const pmIcons: Record<string, any> = {
  CASH: Banknote, CARD: CreditCard, JAZZCASH: Smartphone,
  EASYPAISA: Zap, BANK_TRANSFER: Building2,
};

const pmColors: Record<string, string> = {
  CASH: '#16a34a', CARD: '#2563eb', JAZZCASH: '#f97316',
  EASYPAISA: '#22c55e', BANK_TRANSFER: '#7c3aed',
};

const statusColors: Record<string, { bg: string; text: string }> = {
  RECEIVED: { bg: '#dcfce7', text: '#15803d' },
  PENDING: { bg: '#fef3c7', text: '#b45309' },
  CANCELLED: { bg: '#fee2e2', text: '#b91c1c' },
};

export default function PurchaseDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useSmartBack();
  const [refreshing, setRefreshing] = useState(false);

  const { data: purchase, refetch } = useQuery({
    queryKey: ['purchase', id],
    queryFn: async () => {
      try {
        return await purchasesApi.getOne(id!);
      } catch {
        // fallback: fetch list & find
        try {
          const all = await purchasesApi.list();
          return all.find((p) => p.id === id) ?? null;
        } catch {
          return null;
        }
      }
    },
    enabled: !!id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!purchase) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <PackagePlus size={36} color="#9ca3af" />
        <Text className="mt-3 text-neutral-500">Loading purchase...</Text>
      </SafeAreaView>
    );
  }

  const PMIcon = pmIcons[purchase.paymentMethod] || Banknote;
  const pmColor = pmColors[purchase.paymentMethod] || '#16a34a';
  const credit = Math.max(0, purchase.total - purchase.paidAmount);
  const carpetRolls = purchase.carpetRolls ?? [];
  const hasCarpetRolls = carpetRolls.length > 0;
  const totalSqftCreated = carpetRolls.reduce(
    (s: number, r: any) => s + Number(r.originalSqft),
    0,
  );
  const statusCfg = statusColors[purchase.status] || statusColors.PENDING;

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
          <ArrowLeft size={20} color="#7c3aed" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500">Purchase Order</Text>
          <Text className="text-lg font-extrabold text-neutral-900 dark:text-white font-mono">
            {purchase.purchaseNumber}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#7c3aed',
              shadowColor: '#7c3aed',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-2 mb-2">
              <Truck size={12} color="rgba(255,255,255,0.9)" />
              <Text className="text-[10px] uppercase tracking-wider text-white/90 font-extrabold">
                Purchase Total
              </Text>
              <View
                className="ml-auto px-2 py-0.5 rounded-full"
                style={{ backgroundColor: statusCfg.bg }}
              >
                <Text
                  className="text-[9px] font-extrabold"
                  style={{ color: statusCfg.text }}
                >
                  {purchase.status}
                </Text>
              </View>
            </View>
            <Text className="text-white text-4xl font-extrabold mt-1">
              {formatPKRFull(purchase.total)}
            </Text>
            <View className="mt-3 pt-3 border-t border-white/20 flex-row items-center gap-2 flex-wrap">
              <View className="flex-row items-center gap-1">
                <CalendarClock size={11} color="rgba(255,255,255,0.8)" />
                <Text className="text-xs text-white/80">
                  {formatDate(purchase.purchasedAt)}
                </Text>
              </View>
              {purchase.createdBy && (
                <>
                  <Text className="text-white/50">•</Text>
                  <View className="flex-row items-center gap-1">
                    <User size={11} color="rgba(255,255,255,0.8)" />
                    <Text className="text-xs text-white/80">
                      {purchase.createdBy.fullName}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Financial cards */}
        <View className="px-5 mb-4">
          <View className="flex-row flex-wrap -mx-1">
            <FinCard label="Subtotal" value={formatPKR(purchase.subtotal)} color="#64748b" />
            {purchase.discount > 0 && (
              <FinCard label="Discount" value={`-${formatPKR(purchase.discount)}`} color="#f59e0b" />
            )}
            <FinCard label="Paid" value={formatPKR(purchase.paidAmount)} color="#16a34a" icon={PMIcon} />
            {credit > 0 && (
              <FinCard
                label="Balance Due"
                value={formatPKR(credit)}
                color="#dc2626"
                icon={AlertTriangle}
              />
            )}
          </View>
        </View>

        {/* Supplier */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center gap-2 mb-2">
            <Building2 size={14} color="#7c3aed" />
            <Text className="text-xs font-bold uppercase text-neutral-500 tracking-wider">
              Supplier
            </Text>
          </View>
          <Pressable
            onPress={() => router.push(`/suppliers/${purchase.supplier.id}`)}
            className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-violet-200 p-4 flex-row items-center gap-3 active:opacity-70"
          >
            <View className="h-12 w-12 rounded-2xl bg-violet-100 items-center justify-center">
              <Building2 size={20} color="#7c3aed" />
            </View>
            <View className="flex-1">
              <Text className="font-extrabold text-neutral-900 dark:text-white">
                {purchase.supplier?.name}
              </Text>
              <View className="flex-row items-center gap-3 mt-0.5 flex-wrap">
                {purchase.supplier?.phone && (
                  <View className="flex-row items-center gap-1">
                    <Phone size={10} color="#737373" />
                    <Text className="text-[11px] text-neutral-600 font-semibold">
                      {purchase.supplier.phone}
                    </Text>
                  </View>
                )}
                {purchase.supplier?.contactPerson && (
                  <View className="flex-row items-center gap-1">
                    <User size={10} color="#737373" />
                    <Text className="text-[11px] text-neutral-600">
                      {purchase.supplier.contactPerson}
                    </Text>
                  </View>
                )}
              </View>
              {purchase.supplier?.address && (
                <View className="flex-row items-center gap-1 mt-0.5">
                  <MapPin size={10} color="#9ca3af" />
                  <Text className="text-[10px] text-neutral-500" numberOfLines={1}>
                    {purchase.supplier.address}
                  </Text>
                </View>
              )}
            </View>
            <ChevronRight size={16} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Payment info */}
        <View className="px-5 mb-4">
          <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4 flex-row items-center gap-3">
            <View
              className="h-11 w-11 rounded-2xl items-center justify-center"
              style={{ backgroundColor: `${pmColor}20` }}
            >
              <PMIcon size={20} color={pmColor} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase font-extrabold text-neutral-500">
                Payment Method
              </Text>
              <Text className="font-extrabold text-neutral-900 dark:text-white mt-0.5">
                {purchase.paymentMethod}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] uppercase font-extrabold text-emerald-700">
                Paid
              </Text>
              <Text className="text-lg font-extrabold text-emerald-700">
                {formatPKRFull(purchase.paidAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Items */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center gap-2 mb-2">
            <Package size={14} color="#7c3aed" />
            <Text className="text-xs font-bold uppercase text-neutral-500 tracking-wider">
              Items ({purchase.items.length})
            </Text>
          </View>
          <View className="gap-2">
            {purchase.items.map((item: any, idx: number) => {
              const itemRolls = carpetRolls.filter((r: any) => r.product.id === item.product.id);
              return (
                <View
                  key={item.id}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-11 w-11 rounded-2xl bg-slate-100 overflow-hidden items-center justify-center">
                      {item.product.images?.[0]?.url ? (
                        <Image
                          source={{ uri: item.product.images[0].url }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Package size={18} color="#9ca3af" />
                      )}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text
                          className="font-extrabold text-neutral-900 dark:text-white flex-1"
                          numberOfLines={1}
                        >
                          {item.product.name}
                        </Text>
                        {itemRolls.length > 0 && (
                          <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100">
                            <Layers size={9} color="#15803d" />
                            <Text className="text-[9px] font-extrabold text-emerald-700">
                              {itemRolls.length}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[11px] text-neutral-500 mt-0.5">
                        {formatQty(item.quantity)} {item.product.unit} × {formatPKR(item.costPrice)}
                      </Text>
                    </View>
                    <Text className="text-base font-extrabold text-violet-700">
                      {formatPKRFull(item.total)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Totals row */}
          <View className="mt-3 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-violet-200 p-4">
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-sm text-neutral-600">Subtotal</Text>
              <Text className="text-sm font-bold text-neutral-900">
                {formatPKRFull(purchase.subtotal)}
              </Text>
            </View>
            {purchase.discount > 0 && (
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-sm text-amber-700">Discount</Text>
                <Text className="text-sm font-bold text-amber-700">
                  -{formatPKRFull(purchase.discount)}
                </Text>
              </View>
            )}
            <View className="flex-row justify-between pt-2 border-t-2 border-violet-200">
              <Text className="text-base font-extrabold text-neutral-900">TOTAL</Text>
              <Text className="text-xl font-extrabold text-violet-700">
                {formatPKRFull(purchase.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* CARPET ROLLS CREATED */}
        {hasCarpetRolls && (
          <View className="px-5 mb-4">
            <View
              className="rounded-3xl overflow-hidden"
              style={{ backgroundColor: '#dcfce7', borderWidth: 2, borderColor: '#86efac' }}
            >
              <View className="px-4 py-3 bg-emerald-100 border-b-2 border-emerald-200 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="h-9 w-9 rounded-xl bg-emerald-600 items-center justify-center">
                    <Layers size={16} color="#ffffff" />
                  </View>
                  <View>
                    <Text className="font-extrabold text-emerald-900">
                      Carpet Rolls Created
                    </Text>
                    <Text className="text-[11px] text-emerald-700 font-bold">
                      {carpetRolls.length} rolls • {totalSqftCreated.toFixed(2)} sqft
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => router.push('/industries/carpet/rolls' as any)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 flex-row items-center gap-1"
                >
                  <Text className="text-white font-extrabold text-[10px]">All</Text>
                  <ExternalLink size={10} color="#ffffff" />
                </Pressable>
              </View>
              <View className="p-3 gap-2">
                {carpetRolls.map((roll: any) => {
                  const fullWidth = Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;
                  return (
                    <Pressable
                      key={roll.id}
                      onPress={() =>
                        router.push(`/industries/carpet/rolls/${roll.id}` as any)
                      }
                      className="rounded-xl bg-white border border-emerald-200 p-3 active:opacity-70"
                    >
                      <View className="flex-row items-start gap-2 mb-2">
                        <View className="h-9 w-9 rounded-lg bg-emerald-100 items-center justify-center">
                          <Layers size={16} color="#15803d" />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center gap-1.5 flex-wrap">
                            <Text className="font-mono font-extrabold text-emerald-700 text-sm">
                              {roll.rollNumber}
                            </Text>
                            {roll.designCode && (
                              <View className="px-1 py-0.5 rounded bg-slate-100">
                                <Text className="text-[9px] font-extrabold text-slate-600 font-mono">
                                  {roll.designCode}
                                </Text>
                              </View>
                            )}
                            <View
                              className="px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor:
                                  roll.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                              }}
                            >
                              <Text
                                className="text-[9px] font-extrabold"
                                style={{
                                  color: roll.status === 'ACTIVE' ? '#15803d' : '#64748b',
                                }}
                              >
                                {roll.status}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-xs font-bold text-slate-900 mt-0.5">
                            {roll.product.name}
                            {roll.variant?.name && (
                              <Text className="text-violet-700"> • {roll.variant.name}</Text>
                            )}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <View className="px-2 py-0.5 rounded bg-emerald-100">
                          <Text className="text-[10px] font-extrabold text-emerald-700">
                            {fullWidth.toFixed(2)}ft × {Number(roll.originalLengthFt).toFixed(1)}ft
                          </Text>
                        </View>
                        <Text className="text-[10px] font-extrabold text-emerald-800">
                          = {Number(roll.originalSqft).toFixed(2)} sqft
                        </Text>
                        <View className="ml-auto flex-row items-center gap-2">
                          <Text className="text-[10px] text-slate-500">
                            Cost: <Text className="font-bold">{formatPKR(roll.costPerSqft)}</Text>
                          </Text>
                          {roll.salePricePerSqft > 0 && (
                            <Text className="text-[10px] text-blue-700">
                              Sale: <Text className="font-bold">{formatPKR(roll.salePricePerSqft)}</Text>
                            </Text>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Notes */}
        {purchase.notes && (
          <View className="px-5 mb-4">
            <View className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 flex-row items-start gap-3">
              <View className="h-10 w-10 rounded-xl bg-amber-100 items-center justify-center">
                <FileText size={18} color="#b45309" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] uppercase font-extrabold text-amber-900">
                  Notes
                </Text>
                <Text className="text-sm text-amber-900 font-semibold mt-0.5 leading-relaxed">
                  {purchase.notes}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View className="px-5">
          <View className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 p-4 items-center">
            <View className="flex-row items-center gap-2">
              <Award size={16} color="#f59e0b" />
              <Text className="text-sm font-extrabold text-slate-900">
                Stock Received & Updated
              </Text>
              <Award size={16} color="#f59e0b" />
            </View>
            <View className="flex-row items-center gap-1 mt-2">
              <Sparkles size={9} color="#9ca3af" />
              <Text className="text-[10px] text-slate-500">
                Powered by Nafaa POS
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FinCard({ label, value, color, icon: Icon }: any) {
  return (
    <View className="w-1/2 p-1">
      <View
        className="rounded-2xl border-2 p-3"
        style={{
          backgroundColor: `${color}15`,
          borderColor: `${color}40`,
        }}
      >
        <View className="flex-row items-center gap-1.5">
          {Icon && <Icon size={12} color={color} />}
          <Text
            className="text-[10px] uppercase font-extrabold tracking-wider"
            style={{ color }}
          >
            {label}
          </Text>
        </View>
        <Text
          className="text-lg font-extrabold mt-1"
          style={{ color }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
