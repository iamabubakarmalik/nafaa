import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Tag, Plus, Trash2, Sparkles, X, Check, Package,
} from 'lucide-react-native';
import { categoriesApi } from '@/api/categories.api';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const colorPresets = [
  '#16a34a', '#2563eb', '#7c3aed', '#ec4899', '#f59e0b',
  '#dc2626', '#0891b2', '#ea580c', '#65a30d', '#737373',
];

export default function CategoriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#16a34a');

  const { data: categories = [], refetch } = useQuery({
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

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const createMutation = useMutation({
    mutationFn: () => categoriesApi.create({ name: name.trim(), color }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Category created!' });
      setName('');
      setColor('#16a34a');
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.remove,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Deleted' });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Category?', `${name} ko delete karna chahte hain?`, [
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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.categories')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#2563eb" />
            <Text className="text-xs text-neutral-500">
              {categories.length} categories
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
            backgroundColor: '#2563eb',
            shadowColor: '#2563eb',
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#2563eb',
              shadowColor: '#2563eb',
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
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.product_categories')}</Text>
                <Text className="text-3xl font-extrabold text-white">
                  {categories.length}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">{t('auto.index.group_your_products')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* List */}
        <View className="px-5">
          {categories.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-blue-100 items-center justify-center">
                <Tag size={32} color="#2563eb" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700">{t('auto.index.no_categories_yet')}</Text>
              <Pressable
                onPress={() => setCreateOpen(true)}
                className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                style={{ backgroundColor: '#2563eb' }}
              >
                <Plus size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">{t('auto.index.create_category')}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-2.5">
              {categories.map((c) => (
                <View
                  key={c.id}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5 flex-row items-center gap-3"
                >
                  <View
                    className="h-12 w-12 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: `${c.color}20` }}
                  >
                    <Tag size={20} color={c.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-neutral-900 dark:text-white text-base">
                      {c.name}
                    </Text>
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <Package size={11} color="#737373" />
                      <Text className="text-xs text-neutral-500">
                        {c._count?.products ?? 0} products
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleDelete(c.id, c.name)}
                    className="h-9 w-9 rounded-lg bg-rose-50 border border-rose-200 items-center justify-center"
                  >
                    <Trash2 size={14} color="#dc2626" />
                  </Pressable>
                </View>
              ))}
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
                <View
                  className="h-10 w-10 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: color }}
                >
                  <Tag size={18} color="#ffffff" />
                </View>
                <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.new_category')}</Text>
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
                  <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
                    Name <Text className="text-rose-600">*</Text>
                  </Text>
                  <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g., Bakery Items"
                      placeholderTextColor="#9ca3af"
                      autoFocus
                      className="flex-1 text-base text-neutral-900 dark:text-white"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">{t('auto.index.color')}</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {colorPresets.map((c) => {
                      const active = color === c;
                      return (
                        <Pressable
                          key={c}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setColor(c);
                          }}
                          className="h-12 w-12 rounded-2xl items-center justify-center border-2"
                          style={{
                            backgroundColor: c,
                            borderColor: active ? '#ffffff' : 'transparent',
                            shadowColor: c,
                            shadowOpacity: active ? 0.5 : 0,
                            shadowRadius: 8,
                            elevation: active ? 4 : 0,
                          }}
                        >
                          {active && <Check size={18} color="#ffffff" />}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Preview */}
                <View>
                  <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.index.preview')}</Text>
                  <View
                    className="rounded-2xl border-2 p-3.5 flex-row items-center gap-3"
                    style={{ borderColor: color, backgroundColor: `${color}10` }}
                  >
                    <View
                      className="h-12 w-12 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Tag size={20} color={color} />
                    </View>
                    <Text className="font-bold text-neutral-900 text-base">
                      {name || 'Category Name'}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Pressable
                onPress={() => {
                  if (!name.trim()) {
                    Toast.show({ type: 'error', text1: 'Name required' });
                    return;
                  }
                  createMutation.mutate();
                }}
                disabled={createMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                style={{
                  backgroundColor: createMutation.isPending ? '#9ca3af' : color,
                  shadowColor: color,
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Check size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {createMutation.isPending ? 'Creating...' : 'Create Category'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
