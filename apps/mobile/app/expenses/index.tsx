import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Wallet, Plus, Trash2, Sparkles, X, Check, Receipt,
  CalendarClock, Banknote, CreditCard, Smartphone, Building2, Zap,
  TrendingDown, Tag,
} from 'lucide-react-native';
import { expensesApi, expenseCategoriesApi } from '@/api/expenses.api';
import type { PaymentMethod } from '@/api/sales.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const paymentMethods: Array<{ key: PaymentMethod; label: string; icon: any; color: string }> = [
  { key: 'CASH', label: 'Cash', icon: Banknote, color: '#16a34a' },
  { key: 'CARD', label: 'Card', icon: CreditCard, color: '#2563eb' },
  { key: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, color: '#f97316' },
  { key: 'EASYPAISA', label: 'EasyPaisa', icon: Zap, color: '#22c55e' },
  { key: 'BANK_TRANSFER', label: 'Bank', icon: Building2, color: '#8b5cf6' },
];

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

export default function ExpensesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  const { data: expenses = [], refetch: refetchList } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      try {
        const r = await expensesApi.list();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['expenses-summary'],
    queryFn: async () => {
      try {
        return await expensesApi.summary();
      } catch {
        return null;
      }
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      try {
        const r = await expenseCategoriesApi.list();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchList(), refetchSummary()]);
    setRefreshing(false);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      expensesApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        amount: Number(amount),
        paymentMethod,
        categoryId,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Expense recorded!' });
      setTitle('');
      setAmount('');
      setDescription('');
      setPaymentMethod('CASH');
      setCategoryId(undefined);
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const deleteMutation = useMutation({
    mutationFn: expensesApi.remove,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Deleted' });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
    },
  });

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Expense?', `${title} ko delete karna chahte hain?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.more.expenses')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#dc2626" />
            <Text className="text-xs text-neutral-500">
              {expenses.length} expenses recorded
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
            backgroundColor: '#dc2626',
            shadowColor: '#dc2626',
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#dc2626" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#dc2626',
              shadowColor: '#dc2626',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <TrendingDown size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.total_expenses')}</Text>
                <Text className="text-3xl font-extrabold text-white">
                  {formatPKRFull(summary?.totalExpenses ?? 0)}
                </Text>
              </View>
            </View>
            <View className="pt-3 border-t border-white/20 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.today')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {formatPKRFull(summary?.todayExpenses ?? 0)}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.this_month')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {formatPKRFull(summary?.monthExpenses ?? 0)}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.today_count')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {summary?.todayCount ?? 0}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* List */}
        <View className="px-5">
          {expenses.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-rose-100 items-center justify-center">
                <Wallet size={32} color="#dc2626" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700">{t('auto.index.no_expenses_yet')}</Text>
              <Pressable
                onPress={() => setCreateOpen(true)}
                className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                style={{ backgroundColor: '#dc2626' }}
              >
                <Plus size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">{t('auto.index.record_expense')}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-2.5">
              {expenses.map((e) => {
                const pmConfig = paymentMethods.find((m) => m.key === e.paymentMethod);
                const PMIcon = pmConfig?.icon ?? Wallet;
                return (
                  <View
                    key={e.id}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5"
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="h-12 w-12 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: e.category ? `${e.category.color}20` : '#fee2e2' }}
                      >
                        <Receipt size={20} color={e.category?.color || '#dc2626'} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                          {e.title}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-0.5">
                          {e.category && (
                            <View
                              className="px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: `${e.category.color}15` }}
                            >
                              <Text className="text-[9px] font-bold" style={{ color: e.category.color }}>
                                {e.category.name}
                              </Text>
                            </View>
                          )}
                          <View className="flex-row items-center gap-1">
                            <PMIcon size={10} color={pmConfig?.color || '#737373'} />
                            <Text className="text-[10px] font-bold" style={{ color: pmConfig?.color || '#737373' }}>
                              {e.paymentMethod}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row items-center gap-1 mt-1">
                          <CalendarClock size={10} color="#9ca3af" />
                          <Text className="text-[10px] text-neutral-500">{formatDate(e.expenseDate)}</Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-lg font-extrabold text-rose-700">
                          -{formatPKRFull(e.amount)}
                        </Text>
                        <Pressable
                          onPress={() => handleDelete(e.id, e.title)}
                          className="mt-1 h-8 w-8 rounded-lg bg-rose-50 border border-rose-200 items-center justify-center"
                        >
                          <Trash2 size={12} color="#dc2626" />
                        </Pressable>
                      </View>
                    </View>
                    {e.description && (
                      <Text className="text-[11px] text-neutral-500 mt-2 pt-2 border-t border-neutral-100">
                        {e.description}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: '#dc2626' }}>
                  <Wallet size={18} color="#ffffff" />
                </View>
                <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.new_expense')}</Text>
              </View>
              <Pressable
                onPress={() => setCreateOpen(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <View className="gap-4">
                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-1.5">
                    Title <Text className="text-rose-600">*</Text>
                  </Text>
                  <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
                    <TextInput
                      value={title}
                      onChangeText={setTitle}
                      placeholder="e.g., Rent, Electricity Bill"
                      placeholderTextColor="#9ca3af"
                      className="flex-1 text-base text-neutral-900"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-1.5">
                    Amount (PKR) <Text className="text-rose-600">*</Text>
                  </Text>
                  <View className="flex-row items-center gap-2 rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 h-14">
                    <Text className="text-lg font-bold text-rose-700">{t('auto.new.rs')}</Text>
                    <TextInput
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0"
                      placeholderTextColor="#fca5a5"
                      keyboardType="numeric"
                      className="flex-1 text-2xl font-extrabold text-rose-900"
                    />
                  </View>
                </View>

                {categories.length > 0 && (
                  <View>
                    <Text className="text-sm font-bold text-neutral-700 mb-2">{t('auto.new.category')}</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingRight: 20 }}
                    >
                      <Pressable
                        onPress={() => setCategoryId(undefined)}
                        style={{
                          paddingHorizontal: 14,
                          height: 38,
                          borderRadius: 12,
                          borderWidth: 2,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: !categoryId ? '#dc2626' : '#ffffff',
                          borderColor: !categoryId ? '#dc2626' : '#e5e7eb',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: !categoryId ? '#ffffff' : '#374151' }}>{t('auto.new.none')}</Text>
                      </Pressable>
                      {categories.map((c) => {
                        const active = categoryId === c.id;
                        return (
                          <Pressable
                            key={c.id}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setCategoryId(c.id);
                            }}
                            style={{
                              paddingHorizontal: 14,
                              height: 38,
                              borderRadius: 12,
                              borderWidth: 2,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: active ? c.color : '#ffffff',
                              borderColor: active ? c.color : '#e5e7eb',
                            }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#ffffff' : '#374151' }}>
                              {c.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-2">{t('auto.new.payment_method')}</Text>
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
                            className="h-20 rounded-2xl items-center justify-center gap-1 border-2"
                            style={{
                              backgroundColor: active ? m.color : '#ffffff',
                              borderColor: active ? m.color : '#e5e7eb',
                            }}
                          >
                            <Icon size={20} color={active ? '#ffffff' : m.color} />
                            <Text className="text-xs font-bold" style={{ color: active ? '#ffffff' : '#374151' }}>
                              {m.label}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-1.5">{t('auto.edit.description')}</Text>
                  <View className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                    <TextInput
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Additional details..."
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={3}
                      className="text-base text-neutral-900 min-h-[60px]"
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Pressable
                onPress={() => {
                  if (!title.trim()) {
                    Toast.show({ type: 'error', text1: 'Title required' });
                    return;
                  }
                  if (!Number(amount) || Number(amount) <= 0) {
                    Toast.show({ type: 'error', text1: 'Valid amount' });
                    return;
                  }
                  createMutation.mutate();
                }}
                disabled={createMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                style={{
                  backgroundColor: createMutation.isPending ? '#9ca3af' : '#dc2626',
                  shadowColor: '#dc2626',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Check size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {createMutation.isPending ? 'Saving...' : 'Save Expense'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
