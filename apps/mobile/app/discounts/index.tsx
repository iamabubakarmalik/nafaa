import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Tag, Plus, Trash2, Percent, DollarSign, Sparkles,
  X, Check, ToggleLeft, ToggleRight, Calendar,
} from 'lucide-react-native';
import { discountsApi, type DiscountType } from '@/api/discounts.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
function ThemedInput({ label, required, hint, ...props }: any) {
  return (
    <View>
      <View className="flex-row items-center gap-1 mb-1.5">
        <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">
          {label}
        </Text>
        {required && <Text className="text-rose-600 font-bold">*</Text>}
      </View>
      <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
        <TextInput
          placeholderTextColor="#9ca3af"
          className="flex-1 text-base text-neutral-900 dark:text-white"
          {...props}
        />
      </View>
      {hint && <Text className="mt-1 text-xs text-neutral-500">{hint}</Text>}
    </View>
  );
}

export default function DiscountsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    code: '',
    description: '',
    type: 'PERCENTAGE' as DiscountType,
    value: '',
    minPurchase: '',
    maxDiscount: '',
    usageLimit: '',
  });

  const { data: codes = [], refetch } = useQuery({
    queryKey: ['discounts'],
    queryFn: async () => {
      try {
        const r = await discountsApi.list();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      discountsApi.create({
        code: form.code.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        value: Number(form.value),
        minPurchase: Number(form.minPurchase || 0),
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Code created!' });
      setForm({ code: '', description: '', type: 'PERCENTAGE', value: '', minPurchase: '', maxDiscount: '', usageLimit: '' });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const toggleMutation = useMutation({
    mutationFn: discountsApi.toggle,
    onSuccess: () => {
      Haptics.selectionAsync();
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: discountsApi.remove,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Deleted' });
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = (id: string, code: string) => {
    Alert.alert('Delete Code?', `${code} delete karna chahte hain?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const stats = {
    total: codes.length,
    active: codes.filter((c) => c.isActive).length,
    used: codes.reduce((s, c) => s + c.usageCount, 0),
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.discount_codes')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#ec4899" />
            <Text className="text-xs text-neutral-500">
              {stats.active} active • {stats.used} times used
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCreateOpen(true);
          }}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{
            backgroundColor: '#ec4899',
            shadowColor: '#ec4899',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">{t('auto.index.new')}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ec4899" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#ec4899',
              shadowColor: '#ec4899',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <Tag size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.promo_codes')}</Text>
                <Text className="text-3xl font-extrabold text-white">
                  {stats.total}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">{t('auto.index.eid_sales_special_offers')}</Text>
              </View>
            </View>
            <View className="pt-4 mt-4 border-t border-white/20 flex-row items-center justify-around">
              <View className="items-center">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.active')}</Text>
                <Text className="text-xl font-extrabold text-white mt-0.5">{stats.active}</Text>
              </View>
              <View className="h-8 w-px bg-white/20" />
              <View className="items-center">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.inactive')}</Text>
                <Text className="text-xl font-extrabold text-white mt-0.5">{stats.total - stats.active}</Text>
              </View>
              <View className="h-8 w-px bg-white/20" />
              <View className="items-center">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.used')}</Text>
                <Text className="text-xl font-extrabold text-white mt-0.5">{stats.used}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Codes List */}
        <View className="px-5">
          {codes.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-pink-100 dark:bg-pink-950/40 items-center justify-center">
                <Tag size={32} color="#ec4899" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700 dark:text-neutral-300">{t('auto.index.no_discount_codes_yet')}</Text>
              <Text className="mt-1 text-xs text-neutral-500 text-center px-8">{t('auto.index.pehla_promo_code_create_karein')}</Text>
              <Pressable
                onPress={() => setCreateOpen(true)}
                className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                style={{ backgroundColor: '#ec4899' }}
              >
                <Plus size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">{t('auto.index.create_code')}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-2.5">
              {codes.map((c) => (
                <View
                  key={c.id}
                  className="rounded-2xl border-2 p-4"
                  style={{
                    borderColor: c.isActive ? '#fbcfe8' : '#e5e7eb',
                    backgroundColor: c.isActive ? '#fdf2f8' : '#ffffff',
                    opacity: c.isActive ? 1 : 0.6,
                  }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="font-mono text-xl font-extrabold text-neutral-900">
                          {c.code}
                        </Text>
                        <View
                          className="px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor: c.type === 'PERCENTAGE' ? '#dbeafe' : '#dcfce7',
                          }}
                        >
                          <Text
                            className="text-[10px] font-extrabold"
                            style={{
                              color: c.type === 'PERCENTAGE' ? '#1d4ed8' : '#15803d',
                            }}
                          >
                            {c.type === 'PERCENTAGE' ? `${c.value}%` : formatPKRFull(c.value)}
                          </Text>
                        </View>
                      </View>
                      {c.description && (
                        <Text className="text-xs text-neutral-600 mt-1" numberOfLines={2}>
                          {c.description}
                        </Text>
                      )}
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Pressable
                        onPress={() => toggleMutation.mutate(c.id)}
                        className="h-9 w-9 rounded-lg bg-white border border-neutral-200 items-center justify-center"
                      >
                        {c.isActive ? (
                          <ToggleRight size={18} color="#16a34a" />
                        ) : (
                          <ToggleLeft size={18} color="#9ca3af" />
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => handleDelete(c.id, c.code)}
                        className="h-9 w-9 rounded-lg bg-rose-50 border border-rose-200 items-center justify-center"
                      >
                        <Trash2 size={14} color="#dc2626" />
                      </Pressable>
                    </View>
                  </View>

                  <View className="mt-3 pt-3 border-t border-pink-200/60 flex-row items-center justify-between">
                    <View>
                      <Text className="text-[9px] text-neutral-500 font-bold uppercase">{t('auto.index.min_purchase')}</Text>
                      <Text className="text-xs font-bold text-neutral-700 mt-0.5">
                        {formatPKRFull(c.minPurchase)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-[9px] text-neutral-500 font-bold uppercase">{t('auto.index.used')}</Text>
                      <Text className="text-xs font-bold text-neutral-700 mt-0.5">
                        {c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}
                      </Text>
                    </View>
                    {c.validUntil && (
                      <View>
                        <Text className="text-[9px] text-neutral-500 font-bold uppercase">{t('auto.index.expires')}</Text>
                        <Text className="text-xs font-bold text-neutral-700 mt-0.5">
                          {new Date(c.validUntil).toLocaleDateString('en-PK')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={createOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <View className="flex-row items-center gap-3">
                <View
                  className="h-10 w-10 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: '#ec4899' }}
                >
                  <Tag size={18} color="#ffffff" />
                </View>
                <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.new_discount_code')}</Text>
              </View>
              <Pressable
                onPress={() => setCreateOpen(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              <View className="gap-4">
                <ThemedInput
                  label="Code"
                  required
                  value={form.code}
                  onChangeText={(t: string) => setForm({ ...form, code: t.toUpperCase() })}
                  placeholder="EID2026"
                  autoCapitalize="characters"
                />
                <ThemedInput
                  label="Description"
                  value={form.description}
                  onChangeText={(t: string) => setForm({ ...form, description: t })}
                  placeholder="Eid special discount"
                />

                <View>
                  <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">{t('auto.index.type')}</Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => setForm({ ...form, type: 'PERCENTAGE' })}
                      className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl border-2"
                      style={{
                        borderColor: form.type === 'PERCENTAGE' ? '#2563eb' : '#e5e7eb',
                        backgroundColor: form.type === 'PERCENTAGE' ? '#dbeafe' : '#ffffff',
                      }}
                    >
                      <Percent size={18} color={form.type === 'PERCENTAGE' ? '#1d4ed8' : '#9ca3af'} />
                      <Text
                        className="text-sm font-bold"
                        style={{ color: form.type === 'PERCENTAGE' ? '#1d4ed8' : '#6b7280' }}
                      >{t('auto.index.percentage')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setForm({ ...form, type: 'FIXED_AMOUNT' })}
                      className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl border-2"
                      style={{
                        borderColor: form.type === 'FIXED_AMOUNT' ? '#16a34a' : '#e5e7eb',
                        backgroundColor: form.type === 'FIXED_AMOUNT' ? '#dcfce7' : '#ffffff',
                      }}
                    >
                      <DollarSign size={18} color={form.type === 'FIXED_AMOUNT' ? '#15803d' : '#9ca3af'} />
                      <Text
                        className="text-sm font-bold"
                        style={{ color: form.type === 'FIXED_AMOUNT' ? '#15803d' : '#6b7280' }}
                      >{t('auto.index.fixed_amount')}</Text>
                    </Pressable>
                  </View>
                </View>

                <ThemedInput
                  label={form.type === 'PERCENTAGE' ? 'Percentage (0-100)' : 'Amount (PKR)'}
                  required
                  value={form.value}
                  onChangeText={(t: string) => setForm({ ...form, value: t })}
                  keyboardType="numeric"
                  placeholder={form.type === 'PERCENTAGE' ? '20' : '500'}
                />

                <ThemedInput
                  label="Min Purchase (PKR)"
                  value={form.minPurchase}
                  onChangeText={(t: string) => setForm({ ...form, minPurchase: t })}
                  keyboardType="numeric"
                  placeholder="0"
                  hint="Minimum cart amount required"
                />

                {form.type === 'PERCENTAGE' && (
                  <ThemedInput
                    label="Max Discount Cap"
                    value={form.maxDiscount}
                    onChangeText={(t: string) => setForm({ ...form, maxDiscount: t })}
                    keyboardType="numeric"
                    placeholder="Optional"
                    hint="Maximum discount limit"
                  />
                )}

                <ThemedInput
                  label="Usage Limit"
                  value={form.usageLimit}
                  onChangeText={(t: string) => setForm({ ...form, usageLimit: t })}
                  keyboardType="numeric"
                  placeholder="Optional"
                  hint="Total number of times this code can be used"
                />
              </View>
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Pressable
                onPress={() => {
                  if (!form.code.trim()) {
                    Toast.show({ type: 'error', text1: 'Code required' });
                    return;
                  }
                  if (!Number(form.value)) {
                    Toast.show({ type: 'error', text1: 'Value required' });
                    return;
                  }
                  createMutation.mutate();
                }}
                disabled={createMutation.isPending}
                className="h-14 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-80"
                style={{
                  backgroundColor: createMutation.isPending ? '#9ca3af' : '#ec4899',
                  shadowColor: '#ec4899',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                {createMutation.isPending ? (
                  <Text className="text-white font-extrabold text-base">{t('auto.new.creating')}</Text>
                ) : (
                  <>
                    <Check size={20} color="#ffffff" />
                    <Text className="text-white font-extrabold text-base">{t('auto.index.create_discount_code')}</Text>
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
